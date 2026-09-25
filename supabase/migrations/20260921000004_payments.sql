-- 0004_payments.sql
--
-- IDEMPOTENCY IS ENFORCED ON THE BUSINESS EFFECT, NOT ON THE EVENT.
--
-- webhook_events.provider_event_id de-dupes retries of the SAME event. It does
-- not de-dupe two different events describing the same money (an approval and
-- a capture), nor does it handle out-of-order arrival -- a refund event can
-- land before the capture event is processed. The real guards are the unique
-- constraints on payments.provider_capture_id and refunds.provider_refund_id.
-- webhook_events is a receipt log.

CREATE TYPE payment_provider AS ENUM ('paypal', 'stripe', 'cash', 'mock');

CREATE TYPE payment_record_status AS ENUM (
  'INITIATED', 'PENDING', 'CAPTURED', 'FAILED', 'CANCELLED', 'ABANDONED'
);

CREATE TYPE refund_status AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

CREATE TABLE payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider    payment_provider NOT NULL,

  -- Written at CREATION, before the customer leaves for the provider. The
  -- return route looks the payment up by this, so no query parameter from the
  -- browser is ever trusted to identify a payment.
  provider_ref text,

  -- The capture identifier. UNIQUE is what makes a replayed or duplicated
  -- capture a no-op rather than a double credit.
  provider_capture_id text UNIQUE,

  status       payment_record_status NOT NULL DEFAULT 'INITIATED',
  amount_cents integer NOT NULL,
  currency     char(3) NOT NULL DEFAULT 'USD',

  -- sandbox | live. Wrong value here fails SILENTLY in production, so it is
  -- recorded per payment rather than inferred from config at read time.
  environment text NOT NULL,

  raw        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,

  CONSTRAINT payment_amount_positive CHECK (amount_cents >= 0),
  CONSTRAINT payment_captured_has_ref CHECK (
    status <> 'CAPTURED' OR provider_capture_id IS NOT NULL
  )
);

CREATE INDEX payments_order_idx        ON payments (order_id, created_at DESC);
CREATE INDEX payments_provider_ref_idx ON payments (provider, provider_ref)
  WHERE provider_ref IS NOT NULL;
CREATE INDEX payments_sweep_idx        ON payments (status, created_at)
  WHERE status = 'INITIATED';

CREATE TABLE refunds (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id         uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  provider_refund_id text UNIQUE,
  amount_cents       integer NOT NULL,
  reason             text,
  -- Every refund has a named human.
  actor_user_id      uuid,
  status             refund_status NOT NULL DEFAULT 'PENDING',
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT refund_amount_positive CHECK (amount_cents > 0)
);

CREATE INDEX refunds_payment_idx ON refunds (payment_id);

CREATE TABLE webhook_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          payment_provider NOT NULL,
  provider_event_id text NOT NULL,
  type              text NOT NULL,
  payload           jsonb NOT NULL,
  received_at       timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  error             text,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX webhook_events_unprocessed_idx ON webhook_events (received_at)
  WHERE processed_at IS NULL;

-- Keeps orders.amount_refunded_cents in step with the refunds ledger, so
-- "partially refunded" is arithmetic rather than a state somebody must
-- remember to set. Paired with the order_refund_within_capture CHECK, an
-- over-refund is rejected by the database rather than by a code path.
CREATE OR REPLACE FUNCTION sync_order_refund_total() RETURNS trigger AS $fn$
DECLARE
  v_payment_id uuid;
  v_order_id   uuid;
BEGIN
  v_payment_id := COALESCE(NEW.payment_id, OLD.payment_id);
  SELECT order_id INTO v_order_id FROM payments WHERE id = v_payment_id;

  UPDATE orders o
  SET amount_refunded_cents = COALESCE((
        SELECT sum(r.amount_cents)
        FROM refunds r
        JOIN payments p ON p.id = r.payment_id
        WHERE p.order_id = v_order_id AND r.status = 'SUCCEEDED'
      ), 0)
  WHERE o.id = v_order_id;

  RETURN NULL;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER refunds_sync_order
  AFTER INSERT OR UPDATE OR DELETE ON refunds
  FOR EACH ROW EXECUTE FUNCTION sync_order_refund_total();
