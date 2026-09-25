-- 0006_growth_ops.sql
-- Partners, QR attribution, demand capture, and operational config.
--
-- Partners and campaigns are Phase 9, but the attribution COLUMNS on orders
-- ship now: backfilling attribution is impossible, so an order placed in the
-- pilot that came from a hotel QR code has to be able to say so from day one.

SET search_path TO public, extensions;

CREATE TYPE partner_type AS ENUM (
  'HOTEL', 'RESORT', 'TOUR_OPERATOR', 'RESTAURANT', 'EVENT_PLANNER', 'OTHER'
);

CREATE TYPE partner_status AS ENUM ('PROSPECT', 'ACTIVE', 'PAUSED', 'ENDED');

CREATE TYPE notification_channel AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH');

CREATE TABLE partners (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  type                partner_type NOT NULL,
  contact_email       text,
  contact_phone       text,
  beach_id            uuid REFERENCES beaches(id) ON DELETE SET NULL,
  commission_rate_bps smallint NOT NULL DEFAULT 0,
  status              partner_status NOT NULL DEFAULT 'PROSPECT',
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- Basis points, so a 7.5% commission is 750 and never a rounding argument.
  CONSTRAINT partner_commission_range CHECK (commission_rate_bps BETWEEN 0 AND 10000)
);

CREATE TABLE partner_users (
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'MEMBER',
  PRIMARY KEY (partner_id, user_id)
);

CREATE TABLE campaigns (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  partner_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_dates_ordered CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE qr_codes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,
  partner_id      uuid REFERENCES partners(id) ON DELETE CASCADE,
  campaign_id     uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  beach_id        uuid REFERENCES beaches(id) ON DELETE SET NULL,
  placement_label text,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX qr_codes_partner_idx ON qr_codes (partner_id) WHERE active;

-- The out-of-zone "notify me" capture. It earns nothing on day one and is the
-- ONLY evidence for where to expand next, so it ships in the MVP.
CREATE TABLE zone_demand_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  point                 geography(Point, 4326),
  accuracy_m            numeric(7,1),
  email                 text,
  guessed_location_label text,
  user_agent            text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX zone_demand_point_gix ON zone_demand_requests USING GIST (point);
CREATE INDEX zone_demand_created_idx ON zone_demand_requests (created_at DESC);

CREATE TABLE reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  rating     smallint NOT NULL,
  comment    text,
  photo_url  text,
  published  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_rating_range CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid REFERENCES orders(id) ON DELETE CASCADE,
  channel      notification_channel NOT NULL,
  template     text NOT NULL,
  recipient    text NOT NULL,
  status       text NOT NULL DEFAULT 'PENDING',
  provider_ref text,
  sent_at      timestamptz,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_order_idx ON notifications (order_id);

CREATE TABLE audit_log (
  id            bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  entity        text NOT NULL,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  occurred_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_entity_idx ON audit_log (entity, entity_id, occurred_at DESC);

-- Every number that would otherwise become a literal scattered through code.
CREATE TABLE settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Attribution foreign keys deferred from 0003 until their tables existed.
ALTER TABLE orders
  ADD CONSTRAINT orders_partner_fk  FOREIGN KEY (partner_id)  REFERENCES partners(id)  ON DELETE SET NULL,
  ADD CONSTRAINT orders_qr_code_fk  FOREIGN KEY (qr_code_id)  REFERENCES qr_codes(id)  ON DELETE SET NULL,
  ADD CONSTRAINT orders_campaign_fk FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;

CREATE INDEX orders_partner_idx ON orders (partner_id, placed_at DESC) WHERE partner_id IS NOT NULL;
