-- 0003_orders.sql
-- THE SPINE.
--
-- Three ORTHOGONAL tracks, not one status enum. A single enum conflated money
-- with fulfilment: delivered-then-refunded erased the delivery, partial refunds
-- were unrepresentable, and cash-on-delivery had no valid entry state at all
-- (it never passes through PAID, but PENDING_PAYMENT is wrong because the order
-- is confirmed and dispatchable).

SET search_path TO public, extensions;

CREATE TYPE fulfillment_status AS ENUM (
  'PLACED', 'AWAITING_RUNNER', 'ASSIGNED', 'OUT_FOR_DELIVERY',
  'DELIVERED', 'UNDELIVERABLE', 'CANCELLED', 'EXPIRED'
);

CREATE TYPE payment_status AS ENUM (
  'UNPAID', 'AUTHORIZED', 'CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED',
  'FAILED', 'VOIDED', 'CASH_DUE', 'CASH_COLLECTED'
);

CREATE TYPE prep_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'READY', 'FAILED');

CREATE TYPE actor_type AS ENUM ('CUSTOMER', 'OPS', 'RUNNER', 'SYSTEM');

CREATE TYPE undeliverable_resolution AS ENUM ('RETRIED', 'REFUNDED', 'FORFEITED', 'DISPOSED');

CREATE TYPE location_source AS ENUM ('CHECKOUT', 'CUSTOMER_MOVED', 'OPS_CORRECTED');

CREATE TABLE customers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email            text,
  phone            text,
  name             text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customers_email_idx ON customers (lower(email)) WHERE email IS NOT NULL;

CREATE SEQUENCE order_number_seq START 1000;

CREATE TABLE orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number integer NOT NULL UNIQUE DEFAULT nextval('order_number_seq'),
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,

  beach_id      uuid NOT NULL REFERENCES beaches(id) ON DELETE RESTRICT,
  zone_id       uuid NOT NULL REFERENCES delivery_zones(id) ON DELETE RESTRICT,
  prep_point_id uuid REFERENCES prep_points(id) ON DELETE SET NULL,
  quote_id      uuid REFERENCES quotes(id) ON DELETE SET NULL,

  -- A double-tapped Pay button on a laggy connection is the EXPECTED case.
  client_idempotency_key uuid NOT NULL UNIQUE,

  fulfillment_status fulfillment_status NOT NULL DEFAULT 'PLACED',
  payment_status     payment_status     NOT NULL DEFAULT 'UNPAID',
  prep_status        prep_status        NOT NULL DEFAULT 'NOT_STARTED',

  subtotal_cents        integer NOT NULL DEFAULT 0,
  customization_cents   integer NOT NULL DEFAULT 0,
  delivery_fee_cents    integer NOT NULL DEFAULT 0,
  tax_cents             integer NOT NULL DEFAULT 0,
  tip_cents             integer NOT NULL DEFAULT 0,
  total_cents           integer NOT NULL DEFAULT 0,
  currency              char(3) NOT NULL DEFAULT 'USD',
  amount_captured_cents integer NOT NULL DEFAULT 0,
  amount_refunded_cents integer NOT NULL DEFAULT 0,

  contact_name  text,
  contact_phone text,
  contact_email text,

  -- In practice these find a person on a crowded beach; coordinates do not.
  delivery_note        text,
  landmark_text        text,
  customer_description text,
  delivery_photo_url   text,
  delivery_code        char(4) NOT NULL DEFAULT lpad((floor(random() * 10000))::int::text, 4, '0'),

  -- sha256 of the token, never the token itself: a leaked log or read replica
  -- would otherwise hand out live tracking links.
  track_token_hash text NOT NULL UNIQUE,
  track_expires_at timestamptz,

  promised_eta_min_at timestamptz,
  promised_eta_max_at timestamptz,
  accept_deadline_at  timestamptz,

  arriving_announced_at timestamptz,
  prep_started_at       timestamptz,
  prep_ready_at         timestamptz,
  delivered_at          timestamptz,

  cancelled_at        timestamptz,
  cancelled_by        actor_type,
  cancellation_reason text,

  undeliverable_resolution undeliverable_resolution,
  contact_attempts         smallint NOT NULL DEFAULT 0,

  cash_collected_cents   integer NOT NULL DEFAULT 0,
  collected_by_runner_id uuid,

  partner_id  uuid,
  qr_code_id  uuid,
  campaign_id uuid,

  scheduled_for timestamptz,
  placed_at     timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_amounts_non_negative CHECK (
    subtotal_cents >= 0 AND customization_cents >= 0 AND delivery_fee_cents >= 0
    AND tax_cents >= 0 AND tip_cents >= 0 AND total_cents >= 0
    AND amount_captured_cents >= 0 AND amount_refunded_cents >= 0
    AND cash_collected_cents >= 0
  ),

  -- You cannot refund more than you took.
  CONSTRAINT order_refund_within_capture CHECK (amount_refunded_cents <= amount_captured_cents),

  CONSTRAINT order_eta_ordered CHECK (
    promised_eta_min_at IS NULL OR promised_eta_max_at IS NULL
    OR promised_eta_max_at >= promised_eta_min_at
  ),

  CONSTRAINT order_delivery_code_numeric CHECK (delivery_code SIMILAR TO '[0-9][0-9][0-9][0-9]'),

  -- A cancelled order must say who cancelled it: six causes with six different
  -- money outcomes are not interchangeable.
  CONSTRAINT order_cancel_attributed CHECK (
    fulfillment_status <> 'CANCELLED'
    OR (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
  ),

  CONSTRAINT order_delivered_has_time CHECK (
    fulfillment_status <> 'DELIVERED' OR delivered_at IS NOT NULL
  )
);

CREATE INDEX orders_fulfillment_idx ON orders (fulfillment_status, placed_at DESC);

CREATE INDEX orders_beach_open_idx ON orders (beach_id, fulfillment_status)
  WHERE fulfillment_status IN ('PLACED', 'AWAITING_RUNNER', 'ASSIGNED', 'OUT_FOR_DELIVERY');

CREATE INDEX orders_zone_idx ON orders (zone_id, placed_at DESC);

CREATE TABLE order_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES products(id) ON DELETE SET NULL,
  qty              smallint NOT NULL,
  unit_price_cents integer NOT NULL,
  line_total_cents integer NOT NULL,
  -- Snapshots keep a six-month-old order rendering correctly after a rename.
  name_snapshot    text NOT NULL,
  CONSTRAINT item_qty_positive   CHECK (qty > 0),
  CONSTRAINT item_price_positive CHECK (unit_price_cents >= 0 AND line_total_cents >= 0)
);

CREATE INDEX order_items_order_idx ON order_items (order_id);

CREATE TABLE order_item_customizations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id     uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  group_id          uuid REFERENCES customization_groups(id) ON DELETE SET NULL,
  option_id         uuid REFERENCES customization_options(id) ON DELETE SET NULL,
  text_value        text,
  price_delta_cents integer NOT NULL DEFAULT 0,
  label_snapshot    text NOT NULL
);

CREATE INDEX order_item_customizations_item_idx ON order_item_customizations (order_item_id);

-- Append-only. People swim, move to the bar, change chairs.
CREATE TABLE order_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  point       geography(Point, 4326) NOT NULL,
  accuracy_m  numeric(7,1),
  source      location_source NOT NULL DEFAULT 'CHECKOUT',
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_locations_order_idx ON order_locations (order_id, captured_at DESC);

CREATE TABLE order_events (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  track       text NOT NULL,
  from_value  text,
  to_value    text NOT NULL,
  actor_type  actor_type,
  actor_id    uuid,
  reason      text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX order_events_order_idx ON order_events (order_id, occurred_at);

-- Written by TRIGGER, not by application code. An admin doing a manual SQL fix
-- would otherwise bypass the audit spine entirely.
--
-- Actor attribution rides on session GUCs so callers do not have to thread an
-- actor through every UPDATE: set app.actor_type / app.actor_id / app.reason.
CREATE OR REPLACE FUNCTION log_order_transition() RETURNS trigger AS $fn$
DECLARE
  v_actor_type actor_type;
  v_actor_id   uuid;
  v_reason     text;
BEGIN
  BEGIN
    v_actor_type := nullif(current_setting('app.actor_type', true), '')::actor_type;
    v_actor_id   := nullif(current_setting('app.actor_id', true), '')::uuid;
    v_reason     := nullif(current_setting('app.reason', true), '');
  EXCEPTION WHEN others THEN
    v_actor_type := NULL;
    v_actor_id   := NULL;
    v_reason     := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO order_events (order_id, track, from_value, to_value, actor_type, actor_id, reason)
    VALUES (NEW.id, 'created', NULL, NEW.fulfillment_status::text, v_actor_type, v_actor_id, v_reason);
    RETURN NEW;
  END IF;

  IF NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status THEN
    INSERT INTO order_events (order_id, track, from_value, to_value, actor_type, actor_id, reason)
    VALUES (NEW.id, 'fulfillment', OLD.fulfillment_status::text, NEW.fulfillment_status::text,
            v_actor_type, v_actor_id, v_reason);
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO order_events (order_id, track, from_value, to_value, actor_type, actor_id, reason)
    VALUES (NEW.id, 'payment', OLD.payment_status::text, NEW.payment_status::text,
            v_actor_type, v_actor_id, v_reason);
  END IF;

  IF NEW.prep_status IS DISTINCT FROM OLD.prep_status THEN
    INSERT INTO order_events (order_id, track, from_value, to_value, actor_type, actor_id, reason)
    VALUES (NEW.id, 'prep', OLD.prep_status::text, NEW.prep_status::text,
            v_actor_type, v_actor_id, v_reason);
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

CREATE TRIGGER orders_log_insert AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_transition();

CREATE TRIGGER orders_log_update BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_transition();
