-- 0002_catalogue.sql
-- Products, customization, and the two tables that keep money honest:
-- `quotes` (what the customer was actually shown) and `inventory`.

CREATE TYPE customization_input_type AS ENUM ('TEXT', 'SELECT', 'MULTISELECT', 'BOOLEAN');

CREATE TABLE products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               text NOT NULL UNIQUE,
  name              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  description       text,
  image             text,
  base_price_cents  integer NOT NULL,
  currency          char(3) NOT NULL DEFAULT 'USD',
  active            boolean NOT NULL DEFAULT true,
  sort_order        smallint NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_price_positive CHECK (base_price_cents >= 0)
);

-- Lets one beach carry a different lineup or a different price without a
-- code change. NULL beach/zone means "everywhere".
CREATE TABLE product_availability (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  beach_id            uuid REFERENCES beaches(id) ON DELETE CASCADE,
  zone_id             uuid REFERENCES delivery_zones(id) ON DELETE CASCADE,
  active              boolean NOT NULL DEFAULT true,
  price_override_cents integer,
  CONSTRAINT availability_price_positive CHECK (price_override_cents IS NULL OR price_override_cents >= 0)
);
CREATE INDEX product_availability_product_idx ON product_availability (product_id) WHERE active;

CREATE TABLE customization_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text NOT NULL UNIQUE,
  label       text NOT NULL,
  input_type  customization_input_type NOT NULL,
  required    boolean NOT NULL DEFAULT false,
  max_length  smallint,
  min_select  smallint NOT NULL DEFAULT 0,
  max_select  smallint NOT NULL DEFAULT 1,

  -- Price carried by the GROUP, charged when a TEXT value is supplied or a
  -- BOOLEAN is true. SELECT/MULTISELECT groups price on their options instead.
  -- Without this a free-text field such as "put a name on it" could not be
  -- charged for at all, because it has no options to hang a price on.
  price_delta_cents integer NOT NULL DEFAULT 0,

  sort_order  smallint NOT NULL DEFAULT 0,
  CONSTRAINT group_select_range   CHECK (max_select >= min_select),
  CONSTRAINT group_price_positive CHECK (price_delta_cents >= 0)
);

CREATE TABLE customization_options (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          uuid NOT NULL REFERENCES customization_groups(id) ON DELETE CASCADE,
  value             text NOT NULL,
  label             text NOT NULL,
  price_delta_cents integer NOT NULL DEFAULT 0,
  active            boolean NOT NULL DEFAULT true,
  sort_order        smallint NOT NULL DEFAULT 0,
  UNIQUE (group_id, value)
);

CREATE TABLE product_customization_groups (
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES customization_groups(id) ON DELETE CASCADE,
  required    boolean NOT NULL DEFAULT false,
  sort_order  smallint NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, group_id)
);

-- Persisted so checkout can COMPARE its re-quote against what was displayed
-- and say "the price changed", rather than silently charging a new number.
CREATE TABLE quotes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id      uuid REFERENCES delivery_zones(id) ON DELETE SET NULL,
  payload      jsonb   NOT NULL,
  total_cents  integer NOT NULL,
  currency     char(3) NOT NULL DEFAULT 'USD',
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  CONSTRAINT quote_total_positive CHECK (total_cents >= 0),
  CONSTRAINT quote_expiry_future  CHECK (expires_at > created_at)
);

CREATE TABLE inventory (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prep_point_id  uuid NOT NULL REFERENCES prep_points(id) ON DELETE CASCADE,
  sku            text NOT NULL REFERENCES products(sku) ON DELETE CASCADE,
  qty_available  integer NOT NULL DEFAULT 0,
  qty_reserved   integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prep_point_id, sku),
  CONSTRAINT inventory_non_negative CHECK (qty_available >= 0 AND qty_reserved >= 0)
);
