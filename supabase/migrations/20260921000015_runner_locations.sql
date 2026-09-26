-- 0015_runner_locations.sql
-- Phase 7: runner GPS, deferred from the MVP by design (§1.1) and scoped
-- exactly as §17 requires when it does land: "collected only during an
-- active delivery, with its own short retention" — NOT a persistent column
-- on `runners` (that would imply always-on tracking, which the MVP
-- deliberately never did). Tied to an `order_assignments` row so it only
-- exists for the lifetime of one delivery; application code deletes a
-- delivery's rows the moment that assignment is released (DELIVERED or
-- UNDELIVERABLE), so "short retention" is enforced where the row's owner
-- is the one who can enforce it, not left to a cron job that might not
-- exist yet.

SET search_path TO public, extensions;

CREATE TABLE runner_locations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id     uuid NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES order_assignments(id) ON DELETE CASCADE,
  point         geography(Point, 4326) NOT NULL,
  accuracy_m    numeric(7,1),
  captured_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX runner_locations_assignment_idx ON runner_locations (assignment_id, captured_at DESC);
CREATE INDEX runner_locations_runner_idx ON runner_locations (runner_id, captured_at DESC);

ALTER TABLE runner_locations ENABLE ROW LEVEL SECURITY;

-- A runner writes only their own pings, and only for an assignment that is
-- actually theirs and still active — the same "active assignment" check
-- lib/orders/runner-transition.ts already applies at the app layer, held
-- here too so RLS is the real guard, not just app code (§16).
CREATE POLICY runner_own_location_insert ON runner_locations FOR INSERT TO authenticated
  WITH CHECK (
    runner_id = public.current_runner_id()
    AND EXISTS (
      SELECT 1 FROM order_assignments a
      WHERE a.id = assignment_id AND a.runner_id = public.current_runner_id() AND a.released_at IS NULL
    )
  );

-- Staff read everything (the live map); a runner never needs to read their
-- own historical pings back.
CREATE POLICY staff_read_runner_locations ON runner_locations FOR SELECT TO authenticated
  USING (public.is_staff());

-- Distance in metres from a runner's most recent ping (within `p_max_age_s`)
-- to a point — used to show "how far" on an order/offer without exposing
-- raw coordinates to anyone who doesn't already have staff/runner access
-- via the RLS above (this function runs as the caller, not SECURITY
-- DEFINER, so RLS still applies to the underlying read).
CREATE FUNCTION public.runner_distance_to_point(p_runner_id uuid, p_lng double precision, p_lat double precision, p_max_age_s integer DEFAULT 120)
RETURNS double precision
LANGUAGE sql
STABLE
AS $fn$
  SELECT ST_Distance(rl.point, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  FROM runner_locations rl
  WHERE rl.runner_id = p_runner_id
    AND rl.captured_at > now() - make_interval(secs => p_max_age_s)
  ORDER BY rl.captured_at DESC
  LIMIT 1;
$fn$;

GRANT EXECUTE ON FUNCTION public.runner_distance_to_point(uuid, double precision, double precision, integer) TO authenticated, service_role;
