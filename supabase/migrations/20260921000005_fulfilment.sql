-- 0005_fulfilment.sql
-- Staff, shifts, offers and assignment.
--
-- ASSIGNMENT IS A RELATION, NOT A STATUS, and not a nullable runner_id either.
-- One column cannot express reassignment, handoff, or "was assigned then
-- dropped" -- and nulling it out to reassign both destroys the record of who
-- abandoned the order and lets a stale client re-grab it.

CREATE TYPE app_role AS ENUM ('ADMIN', 'OPS', 'RUNNER', 'PARTNER');

CREATE TYPE runner_shift_status AS ENUM ('OFF_SHIFT', 'AVAILABLE', 'BUSY', 'ON_BREAK');

CREATE TYPE offer_response AS ENUM ('ACCEPTED', 'DECLINED', 'EXPIRED');

CREATE TYPE assignment_release_reason AS ENUM (
  'COMPLETED', 'RUNNER_DROPPED', 'OPS_REASSIGNED', 'ORDER_CANCELLED', 'STALE'
);

-- Mirrors auth.users. Kept as a separate table so roles, deactivation and
-- display names are ours to manage and query without touching the auth schema.
CREATE TABLE app_users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  display_name  text,
  role          app_role NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX app_users_role_idx ON app_users (role) WHERE active;

CREATE TABLE runners (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid UNIQUE REFERENCES app_users(id) ON DELETE SET NULL,
  name                  text NOT NULL,
  phone                 text,
  shift_status          runner_shift_status NOT NULL DEFAULT 'OFF_SHIFT',
  max_concurrent_orders smallint NOT NULL DEFAULT 1,

  -- Status is a claim made at a past instant; liveness is a separate signal.
  -- Without this, an order sitting in OUT_FOR_DELIVERY with a runner whose
  -- phone died 20 minutes ago looks identical to a healthy one.
  device_last_seen_at   timestamptz,

  home_beach_id uuid REFERENCES beaches(id) ON DELETE SET NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT runner_concurrency_positive CHECK (max_concurrent_orders >= 1)
);

CREATE INDEX runners_available_idx ON runners (home_beach_id, shift_status)
  WHERE active AND shift_status = 'AVAILABLE';

CREATE TABLE shifts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id        uuid NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  beach_id         uuid NOT NULL REFERENCES beaches(id) ON DELETE RESTRICT,
  zone_id          uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  end_requested_at timestamptz,
  CONSTRAINT shift_ordered CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- One open shift per runner.
CREATE UNIQUE INDEX shifts_one_open_per_runner ON shifts (runner_id)
  WHERE ended_at IS NULL;

CREATE INDEX shifts_open_by_beach_idx ON shifts (beach_id) WHERE ended_at IS NULL;

-- Cash on delivery plus staff handling tourist money means shrinkage has to be
-- detectable and "I never got my coconut" has to be answerable.
CREATE TABLE shift_cash (
  shift_id          uuid PRIMARY KEY REFERENCES shifts(id) ON DELETE CASCADE,
  float_start_cents integer NOT NULL DEFAULT 0,
  collected_cents   integer NOT NULL DEFAULT 0,
  dropped_cents     integer NOT NULL DEFAULT 0,
  currency          char(3) NOT NULL DEFAULT 'USD',
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shift_cash_non_negative CHECK (
    float_start_cents >= 0 AND collected_cents >= 0 AND dropped_cents >= 0
  )
);

CREATE TABLE order_offers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  runner_id    uuid NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  offered_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  responded_at timestamptz,
  response     offer_response,
  UNIQUE (order_id, runner_id),
  CONSTRAINT offer_expiry_future CHECK (expires_at > offered_at)
);

CREATE INDEX order_offers_open_idx ON order_offers (runner_id, expires_at)
  WHERE response IS NULL;

CREATE TABLE order_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  runner_id      uuid NOT NULL REFERENCES runners(id) ON DELETE RESTRICT,
  assigned_at    timestamptz NOT NULL DEFAULT now(),
  picked_up_at   timestamptz,
  released_at    timestamptz,
  release_reason assignment_release_reason,

  -- The runner app WILL be used with no signal. Offline actions carry a device
  -- clock so delivery-time metrics measure delivery, not cell coverage.
  delivered_occurred_at timestamptz,
  delivered_recorded_at timestamptz,

  CONSTRAINT assignment_release_attributed CHECK (
    released_at IS NULL OR release_reason IS NOT NULL
  )
);

-- THE DISPATCH RACE, settled by the database. Two runners tapping ACCEPT at the
-- same instant: the loser's INSERT violates this index and gets zero rows back.
-- No lock, no queue.
CREATE UNIQUE INDEX order_assignments_one_active
  ON order_assignments (order_id) WHERE released_at IS NULL;

CREATE INDEX order_assignments_runner_active_idx
  ON order_assignments (runner_id) WHERE released_at IS NULL;

-- collected_by_runner_id could not be a foreign key in 0003 because runners
-- did not exist yet.
ALTER TABLE orders
  ADD CONSTRAINT orders_collected_by_runner_fk
  FOREIGN KEY (collected_by_runner_id) REFERENCES runners(id) ON DELETE SET NULL;
