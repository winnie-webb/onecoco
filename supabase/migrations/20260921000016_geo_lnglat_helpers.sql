-- 0016_geo_lnglat_helpers.sql
-- Phase 7 bugfix, found by actually running the admin live map: PostgREST
-- does NOT serialize a `geography` column as GeoJSON on a plain SELECT —
-- it comes back as an EWKB hex string (confirmed: this is exactly what
-- 0002/0006's `zone_demand_requests.point` looked like over REST in
-- earlier phases' testing too, it just never mattered until code tried to
-- read coordinates back out in JS). `lib/db/queries/admin-map.ts` assumed
-- `{ coordinates: [lng, lat] }` and crashed with a 500 the first time the
-- map page was actually opened.
--
-- Fix: extract lng/lat in SQL (ST_X/ST_Y on the geometry cast) rather than
-- trying to parse EWKB in JS.

SET search_path TO public, extensions;

CREATE FUNCTION public.beach_lnglat(p_beach_id uuid)
RETURNS TABLE (lng double precision, lat double precision)
LANGUAGE sql
STABLE
AS $fn$
  SELECT ST_X(center::geometry), ST_Y(center::geometry) FROM beaches WHERE id = p_beach_id;
$fn$;

GRANT EXECUTE ON FUNCTION public.beach_lnglat(uuid) TO authenticated, service_role;

-- security_invoker (PG15+ default) — RLS on the base tables still applies
-- to whoever queries this view, same as orders_at_risk (0010).
CREATE VIEW public.runner_locations_geo AS
SELECT
  rl.id, rl.runner_id, rl.assignment_id,
  ST_X(rl.point::geometry) AS lng, ST_Y(rl.point::geometry) AS lat,
  rl.accuracy_m, rl.captured_at
FROM runner_locations rl;

GRANT SELECT ON public.runner_locations_geo TO authenticated, service_role;
