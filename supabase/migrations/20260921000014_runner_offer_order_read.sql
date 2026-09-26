-- 0014_runner_offer_order_read.sql
-- Phase 6 bugfix, found by actually running the offers page end to end:
-- `runner_assigned_orders` (0007_rls.sql) only lets a runner read an order
-- they already have an ACTIVE ASSIGNMENT for — but the offers list embeds
-- `orders(...)` for offers a runner has NOT yet accepted. PostgREST's
-- embedded-resource join behaves like an inner join, so when RLS blocked
-- the nested `orders` row, the whole `order_offers` row silently
-- disappeared from the response — not an error, just an empty list. A
-- runner needs to see enough about an order to decide whether to accept
-- it, so this policy extends read access to orders they hold an open
-- (or resolved) offer for, not just ones they're assigned to.

SET search_path TO public, extensions;

CREATE POLICY runner_offered_orders ON orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_offers o
      WHERE o.order_id = orders.id
        AND o.runner_id = public.current_runner_id()
    )
  );
