-- 0009_eta_distance.sql
-- Phase 2: nearest-prep-point distance for the ETA formula (§9's route_factor
-- note, §7's ETA formula). Kept as its own migration rather than folded into
-- 0008 because it's a genuinely separate concern (distance, not containment).

SET search_path TO public, extensions;

-- Metres from the nearest active prep point on `p_beach_id` to the given
-- point. NULL if the beach has no active prep point (should not happen once
-- seeded, but a prep point can be deactivated).
CREATE FUNCTION public.nearest_prep_point_distance_m(p_beach_id uuid, p_lng double precision, p_lat double precision)
RETURNS double precision
LANGUAGE sql
STABLE
AS $fn$
  SELECT ST_Distance(pp.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  FROM prep_points pp
  WHERE pp.beach_id = p_beach_id AND pp.active
  ORDER BY pp.location <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  LIMIT 1;
$fn$;

-- Distance only, no prep_point identity — prep_points is deliberately not
-- public catalogue (0007_rls.sql), but a scalar metre count leaks nothing.
GRANT EXECUTE ON FUNCTION public.nearest_prep_point_distance_m(uuid, double precision, double precision)
  TO anon, authenticated, service_role;
