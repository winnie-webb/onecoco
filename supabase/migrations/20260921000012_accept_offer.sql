-- 0012_accept_offer.sql
-- Phase 6: the dispatch race, settled by the database (§6).
--
-- Two runners tapping ACCEPT at the same instant must produce exactly one
-- assignment. That needs the concurrency-cap check (which requires
-- SELECT ... FOR UPDATE on the runner row, per §6 point 5) and the
-- race-safe INSERT ... ON CONFLICT DO NOTHING (§6 point 3) to happen in
-- ONE transaction — not achievable as separate REST calls from
-- supabase-js, hence a function.
--
-- Called with the service-role client, from a Route Handler that has
-- already authenticated the caller as the runner named in p_runner_id
-- (§16) — this function does not re-check auth.uid() itself.

SET search_path TO public, extensions;

CREATE TYPE accept_offer_result AS ENUM (
  'ACCEPTED', 'OFFER_NOT_FOUND', 'OFFER_ALREADY_RESOLVED', 'OFFER_EXPIRED',
  'ORDER_NOT_AWAITING_RUNNER', 'RUNNER_AT_CAPACITY', 'LOST_RACE'
);

CREATE FUNCTION public.accept_order_offer(p_offer_id uuid, p_runner_id uuid)
RETURNS accept_offer_result
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_order_id uuid;
  v_max_concurrent smallint;
  v_active_count integer;
  v_fulfillment fulfillment_status;
  v_cancelled_at timestamptz;
  v_assignment_id uuid;
BEGIN
  -- Lock the runner row first — this is what makes the concurrency-cap
  -- check below race-safe against a SECOND offer being accepted by the
  -- same runner in a concurrent request, not just races between runners.
  SELECT max_concurrent_orders INTO v_max_concurrent
  FROM runners WHERE id = p_runner_id FOR UPDATE;

  SELECT o.order_id INTO v_order_id
  FROM order_offers o
  WHERE o.id = p_offer_id AND o.runner_id = p_runner_id;

  IF v_order_id IS NULL THEN
    RETURN 'OFFER_NOT_FOUND';
  END IF;

  PERFORM 1 FROM order_offers WHERE id = p_offer_id AND response IS NOT NULL;
  IF FOUND THEN
    RETURN 'OFFER_ALREADY_RESOLVED';
  END IF;

  PERFORM 1 FROM order_offers WHERE id = p_offer_id AND expires_at < now();
  IF FOUND THEN
    UPDATE order_offers SET response = 'EXPIRED', responded_at = now() WHERE id = p_offer_id;
    RETURN 'OFFER_EXPIRED';
  END IF;

  SELECT fulfillment_status, cancelled_at INTO v_fulfillment, v_cancelled_at
  FROM orders WHERE id = v_order_id;

  IF v_fulfillment <> 'AWAITING_RUNNER' OR v_cancelled_at IS NOT NULL THEN
    RETURN 'ORDER_NOT_AWAITING_RUNNER';
  END IF;

  SELECT count(*) INTO v_active_count
  FROM order_assignments WHERE runner_id = p_runner_id AND released_at IS NULL;

  IF v_active_count >= v_max_concurrent THEN
    RETURN 'RUNNER_AT_CAPACITY';
  END IF;

  -- THE RACE. A concurrent acceptance of the SAME order by another runner
  -- violates order_assignments_one_active and returns zero rows.
  INSERT INTO order_assignments (order_id, runner_id, assigned_at)
  VALUES (v_order_id, p_runner_id, now())
  ON CONFLICT (order_id) WHERE released_at IS NULL DO NOTHING
  RETURNING id INTO v_assignment_id;

  IF v_assignment_id IS NULL THEN
    RETURN 'LOST_RACE';
  END IF;

  UPDATE order_offers SET response = 'ACCEPTED', responded_at = now() WHERE id = p_offer_id;
  UPDATE order_offers SET response = 'EXPIRED', responded_at = now()
    WHERE order_id = v_order_id AND id <> p_offer_id AND response IS NULL;

  UPDATE orders SET fulfillment_status = 'ASSIGNED'
    WHERE id = v_order_id AND fulfillment_status = 'AWAITING_RUNNER';

  RETURN 'ACCEPTED';
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.accept_order_offer(uuid, uuid) TO service_role;
