-- 0010_at_risk_view.sql
-- Phase 4: the admin order board's `at_risk` signal (§4.5, §15).
--
-- "device_last_seen_at exists because status is a claim made at a past
-- instant; liveness is a separate signal... The ops board derives an
-- at_risk view from it — a view, not a status."
--
-- Phase 6 (runner heartbeat) hasn't landed yet, so device_last_seen_at is
-- always NULL today — an OUT_FOR_DELIVERY order with no heartbeat correctly
-- reads as at-risk right now, which is honest: there is genuinely no
-- liveness signal for it yet, not a false negative.

SET search_path TO public, extensions;

CREATE VIEW orders_at_risk AS
SELECT
  o.id AS order_id,
  o.order_number,
  o.fulfillment_status,
  o.beach_id,
  o.zone_id,
  a.runner_id,
  r.device_last_seen_at,
  CASE
    WHEN o.fulfillment_status = 'AWAITING_RUNNER' AND o.accept_deadline_at < now()
      THEN 'ACCEPT_WINDOW_BLOWN'
    WHEN o.fulfillment_status = 'ASSIGNED' AND a.picked_up_at IS NULL AND a.assigned_at < now() - interval '15 minutes'
      THEN 'STUCK_AT_ASSIGNED'
    WHEN o.fulfillment_status = 'OUT_FOR_DELIVERY' AND (r.device_last_seen_at IS NULL OR r.device_last_seen_at < now() - interval '10 minutes')
      THEN 'RUNNER_SIGNAL_STALE'
    WHEN o.fulfillment_status = 'OUT_FOR_DELIVERY' AND o.promised_eta_max_at IS NOT NULL AND o.promised_eta_max_at < now()
      THEN 'RUNNING_LATE'
  END AS risk_reason
FROM orders o
LEFT JOIN order_assignments a ON a.order_id = o.id AND a.released_at IS NULL
LEFT JOIN runners r ON r.id = a.runner_id
WHERE o.fulfillment_status IN ('AWAITING_RUNNER', 'ASSIGNED', 'OUT_FOR_DELIVERY')
  AND (
    (o.fulfillment_status = 'AWAITING_RUNNER' AND o.accept_deadline_at < now())
    OR (o.fulfillment_status = 'ASSIGNED' AND a.picked_up_at IS NULL AND a.assigned_at < now() - interval '15 minutes')
    OR (o.fulfillment_status = 'OUT_FOR_DELIVERY' AND (r.device_last_seen_at IS NULL OR r.device_last_seen_at < now() - interval '10 minutes'))
    OR (o.fulfillment_status = 'OUT_FOR_DELIVERY' AND o.promised_eta_max_at IS NOT NULL AND o.promised_eta_max_at < now())
  );

-- Staff only — same posture as the underlying tables (§16). A view does not
-- inherit RLS from its base tables automatically unless it's a security
-- invoker view (the Postgres default as of PG15+, which this is), so it's
-- still gated by staff_all_orders/runner_own_shifts underneath. Belt and
-- braces: also restrict the grant itself.
REVOKE ALL ON orders_at_risk FROM PUBLIC;
GRANT SELECT ON orders_at_risk TO authenticated, service_role;
