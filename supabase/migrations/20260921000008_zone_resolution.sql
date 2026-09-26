-- 0008_zone_resolution.sql
-- Phase 2: the point-in-polygon half of the serviceability gate (§9, §13).
--
-- ST_Covers, not ST_Contains — ST_Contains has no geography signature, so it
-- forces a cast to geometry where every distance is in degrees, and a later
-- ST_DWithin(..., 75) would silently mean 75 degrees. ST_Covers has a
-- geography signature and returns true on the boundary.
--
-- The rest of the serviceability gate (operating_hours, service_status,
-- runner-on-shift, inventory) is application logic in lib/pricing — this
-- migration only answers "which zone(s) cover or border this point", which
-- is the part that has to run inside Postgres to use the GiST index.

SET search_path TO public, extensions;

CREATE FUNCTION public.zones_covering_point(p_lng double precision, p_lat double precision)
RETURNS SETOF delivery_zones
LANGUAGE sql
STABLE
AS $fn$
  SELECT z.*
  FROM delivery_zones z
  WHERE z.active
    AND ST_Covers(z.polygon, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  ORDER BY z.priority DESC, ST_Area(z.polygon) ASC;
$fn$;

-- The borderline band (§9): a point just outside every polygon but within
-- `meters` of one is "you look close, confirm?" rather than a flat rejection
-- — a 20m GPS error should not lose a sale.
CREATE FUNCTION public.zones_near_point(p_lng double precision, p_lat double precision, p_meters numeric)
RETURNS SETOF delivery_zones
LANGUAGE sql
STABLE
AS $fn$
  SELECT z.*
  FROM delivery_zones z
  WHERE z.active
    AND ST_DWithin(z.polygon, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_meters)
  ORDER BY z.priority DESC, ST_Area(z.polygon) ASC;
$fn$;

-- Both functions only return columns already exposed by public_read_zones
-- (0007_rls.sql), so granting them to anon/authenticated leaks nothing new.
-- The Route Handler still calls through the service-role client, same as
-- every other stateful path, because the surrounding serviceability check
-- also reads prep_points/inventory/runners, which are NOT public.
GRANT EXECUTE ON FUNCTION public.zones_covering_point(double precision, double precision)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.zones_near_point(double precision, double precision, numeric)
  TO anon, authenticated, service_role;
