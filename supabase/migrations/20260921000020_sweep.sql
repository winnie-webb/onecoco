-- Phase 10 pilot hardening: two real gaps flagged as "Phase 10 additions"
-- in earlier phase notes, both now closed by a single scheduled sweep
-- (see app/api/v1/system/sweep/route.ts, run by vercel.json's cron entry).
--
-- Both functions are service-role only — there is no client session
-- calling either of these, so no RLS policy is needed on top.

-- §9's group/scheduled orders (Phase 9 gap): a cash order placed with a
-- future `scheduled_for` deliberately stays at PLACED (not AWAITING_RUNNER)
-- so it never falsely trips orders_at_risk's accept-window check. Nothing
-- promoted it once that time arrived — this does, mirroring exactly the
-- transition lib/orders/create.ts already performs for a dispatchable-now
-- cash order.
CREATE FUNCTION public.promote_scheduled_orders()
RETURNS SETOF uuid
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_order_id uuid;
BEGIN
  FOR v_order_id IN
    SELECT id FROM orders
    WHERE fulfillment_status = 'PLACED'
      AND payment_status = 'CASH_DUE'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= now()
      AND cancelled_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE orders SET fulfillment_status = 'AWAITING_RUNNER'
      WHERE id = v_order_id AND fulfillment_status = 'PLACED';
    RETURN NEXT v_order_id;
  END LOOP;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.promote_scheduled_orders() TO service_role;

-- §17: "exact points kept until delivered + 30 days, then truncated to
-- zone level by a scheduled job. Analytics keeps the zone, not the
-- person's spot on the sand." An order that resolves by cancellation
-- rather than delivery has no `delivered_at` either — treated the same
-- way here (using `cancelled_at`) so an abandoned order doesn't retain an
-- exact location indefinitely just because it was never delivered; the
-- architecture doc doesn't say this explicitly, but leaving it out would
-- make cancellation a loophole around the retention policy it states.
-- `accuracy_m IS NOT NULL` doubles as the "not yet truncated" marker —
-- truncation always sets it to NULL, so it's never re-processed.
CREATE FUNCTION public.truncate_stale_order_locations()
RETURNS integer
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_count integer;
BEGIN
  WITH resolved AS (
    SELECT o.id AS order_id, z.polygon
    FROM orders o
    JOIN delivery_zones z ON z.id = o.zone_id
    WHERE COALESCE(o.delivered_at, o.cancelled_at) IS NOT NULL
      AND COALESCE(o.delivered_at, o.cancelled_at) < now() - interval '30 days'
  )
  UPDATE order_locations ol
  SET point = ST_Centroid(resolved.polygon::geometry)::geography,
      accuracy_m = NULL
  FROM resolved
  WHERE ol.order_id = resolved.order_id
    AND ol.accuracy_m IS NOT NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.truncate_stale_order_locations() TO service_role;
