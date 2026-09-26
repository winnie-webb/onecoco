-- 0017_staff_read_assignments.sql
-- Phase 7 bugfix, found by actually running the admin live map: `orders_
-- assignments` has had RLS enabled since 0007_rls.sql (Phase 0) with only
-- `runner_own_assignments` (a runner reads their own) — there was never a
-- staff policy on this table at all. Every prior admin feature happened to
-- read `orders` directly instead, so this went unnoticed until Phase 7
-- needed to join through `order_assignments` to find out which runner is
-- currently on which order. Confirmed directly: the exact query the admin
-- live map runs returned zero rows as the real signed-in admin user, and
-- all expected rows as service_role — a textbook RLS gap, invisible to
-- anything that doesn't run as the actual authenticated role.

SET search_path TO public, extensions;

CREATE POLICY staff_all_assignments ON order_assignments FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
