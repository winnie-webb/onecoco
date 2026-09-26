-- 0013_realtime_offers.sql
-- Phase 6: runner offers via Realtime — §3 names this explicitly:
-- "Admin board and runner offers are 'watch these rows' with a real JWT."
-- RLS (`runner_own_offers`, 0007_rls.sql) already scopes each runner to
-- only their own offers, so Realtime naturally deals only those rows to
-- the runner who is allowed to see them.

ALTER PUBLICATION supabase_realtime ADD TABLE public.order_offers;
