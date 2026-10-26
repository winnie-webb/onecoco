-- 0011_realtime_orders.sql
-- Phase 4: the admin order board subscribes to `orders` via Supabase
-- Realtime (§3, §15) — this is the one authenticated-staff surface the
-- architecture reserves Realtime for. A table isn't broadcast until it's
-- added to the `supabase_realtime` publication; without this migration the
-- board's subscription would silently receive nothing, in every
-- environment, not just local dev.
--
-- Nothing else is added here. Guests still poll (§10) and every other
-- staff table (payments, runners, etc.) has no ops-facing live view yet
-- that needs it.

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
