-- 0001_geography.sql
-- Country → Region → City → Beach → Delivery Zone.
-- Nothing here names Montego Bay: the hierarchy is data, so a new beach or a
-- new country is an INSERT, never a migration.

-- Supabase keeps extensions out of `public` by convention. Installing PostGIS
-- anywhere else would still work, but then the `geography` type is not on the
-- default search_path and every table below fails to resolve it.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

SET search_path TO public, extensions;

CREATE TYPE zone_service_status AS ENUM ('OPEN', 'PAUSED', 'CLOSED');

CREATE TABLE countries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2          char(2) NOT NULL UNIQUE,
  name          text    NOT NULL,
  currency      char(3) NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE regions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id  uuid NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  slug        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_id, slug)
);

CREATE TABLE cities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id   uuid NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  slug        text NOT NULL,
  timezone    text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  seo_title       text,
  seo_description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_id, slug)
);

CREATE TABLE beaches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id     uuid NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  slug        text NOT NULL,
  blurb       text,
  hero_image  text,
  center      geography(Point, 4326) NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  seo_title       text,
  seo_description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (city_id, slug)
);

-- Where the coconuts actually get cut. ETA is measured from here, not from
-- the beach centroid.
CREATE TABLE prep_points (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beach_id    uuid NOT NULL REFERENCES beaches(id) ON DELETE RESTRICT,
  name        text NOT NULL,
  location    geography(Point, 4326) NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_zones (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beach_id           uuid NOT NULL REFERENCES beaches(id) ON DELETE RESTRICT,
  name               text NOT NULL,
  polygon            geography(Polygon, 4326) NOT NULL,

  delivery_fee_cents integer NOT NULL DEFAULT 0,
  eta_min_minutes    integer NOT NULL,
  eta_max_minutes    integer NOT NULL,

  -- Calibrated detour multiplier. Straight-line distance is structurally wrong
  -- on a coast of gated resort property: two points 200m apart can be a
  -- 90-second walk or an 800m walk around a property line.
  route_factor       numeric(4,2) NOT NULL DEFAULT 1.35,

  -- Opening hours are a schedule; service_status is the live override that
  -- ops actually reaches for (rain, rough sea, a runner walking off).
  operating_hours    jsonb NOT NULL DEFAULT '{}'::jsonb,
  service_status     zone_service_status NOT NULL DEFAULT 'CLOSED',
  pause_reason       text,
  pause_until        timestamptz,

  access_notes                 text,
  requires_property_permission boolean NOT NULL DEFAULT false,

  -- Overlap is legitimate (a small zone inside a large one). Priority is the
  -- resolution rule, not a constraint violation.
  priority           smallint NOT NULL DEFAULT 0,
  active             boolean  NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT zone_eta_ordered   CHECK (eta_min_minutes > 0 AND eta_max_minutes >= eta_min_minutes),
  CONSTRAINT zone_fee_positive  CHECK (delivery_fee_cents >= 0),
  CONSTRAINT zone_route_factor  CHECK (route_factor >= 1.0 AND route_factor <= 5.0)
);

-- The index that makes ST_Covers a lookup rather than a scan.
CREATE INDEX delivery_zones_polygon_gix ON delivery_zones USING GIST (polygon);
CREATE INDEX beaches_center_gix         ON beaches        USING GIST (center);
CREATE INDEX delivery_zones_beach_idx   ON delivery_zones (beach_id) WHERE active;
