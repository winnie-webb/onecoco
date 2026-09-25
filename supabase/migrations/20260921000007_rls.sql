-- 0007_rls.sql
--
-- THE SUPABASE ANON KEY IS PUBLIC BY DESIGN. It ships in the browser bundle.
-- RLS is therefore the real access control, not a second line of defence, and
-- a table with RLS enabled but no policy denies everything -- which is the
-- posture we want by default.
--
-- POSTURE: deny by default. The anon role may read the public catalogue and
-- geography and nothing else. Every write, and every read of an order, goes
-- through a server Route Handler using the service role (which bypasses RLS)
-- after the server has authorised the caller itself.
--
-- This is why the guest tracking page polls our own API rather than
-- subscribing to Realtime: an anonymous client has no JWT claim that could tie
-- it to its order, so no policy could express "this client holds the token",
-- and postgres_changes would ship the WHOLE row to every subscriber that
-- passed RLS.

-- SECURITY DEFINER so a policy can read app_users without recursing into
-- app_users' own policies. Empty search_path per Supabase guidance.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT u.role FROM public.app_users u
  WHERE u.id = (SELECT auth.uid()) AND u.active
$fn$;

CREATE OR REPLACE FUNCTION public.current_runner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
  SELECT r.id FROM public.runners r
  WHERE r.user_id = (SELECT auth.uid()) AND r.active
$fn$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$
  SELECT public.current_app_role() IN ('ADMIN', 'OPS')
$fn$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. Anything not given a policy below is closed.
-- ---------------------------------------------------------------------------
ALTER TABLE countries                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE beaches                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_points                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones              ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_availability        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customization_options       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_customization_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_customizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_locations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE runners                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_cash                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_offers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_demand_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings                    ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Public read: geography and catalogue only, active rows only.
-- Safe because these are the same facts the marketing pages already publish.
-- ---------------------------------------------------------------------------
CREATE POLICY public_read_countries ON countries
  FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY public_read_regions ON regions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY public_read_cities ON cities
  FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY public_read_beaches ON beaches
  FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY public_read_zones ON delivery_zones
  FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY public_read_products ON products
  FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY public_read_availability ON product_availability
  FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY public_read_cgroups ON customization_groups
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY public_read_coptions ON customization_options
  FOR SELECT TO anon, authenticated USING (active);

CREATE POLICY public_read_pcgroups ON product_customization_groups
  FOR SELECT TO anon, authenticated USING (true);

-- NOTE: prep_points is deliberately NOT publicly readable. Where the stock and
-- the staff are is operational information, not catalogue.

-- ---------------------------------------------------------------------------
-- Staff (ADMIN / OPS): full read across the operation.
-- ---------------------------------------------------------------------------
CREATE POLICY staff_all_orders     ON orders     FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_items      ON order_items FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_customers  ON customers  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_payments   ON payments   FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY staff_all_refunds    ON refunds    FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_events     ON order_events FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY staff_all_runners    ON runners    FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_zones      ON delivery_zones FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_products   ON products   FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_prep       ON prep_points FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_inventory  ON inventory  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_all_settings   ON settings   FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY staff_read_demand    ON zone_demand_requests FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY staff_read_audit     ON audit_log  FOR SELECT TO authenticated
  USING (public.current_app_role() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- Runners: their own row, their own shifts, offers made TO THEM, and orders
-- they are actively assigned. Nothing else -- a runner cannot browse the book.
-- ---------------------------------------------------------------------------
CREATE POLICY runner_self ON runners FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY runner_own_shifts ON shifts FOR ALL TO authenticated
  USING (runner_id = public.current_runner_id())
  WITH CHECK (runner_id = public.current_runner_id());

CREATE POLICY runner_own_offers ON order_offers FOR SELECT TO authenticated
  USING (runner_id = public.current_runner_id());

CREATE POLICY runner_own_assignments ON order_assignments FOR SELECT TO authenticated
  USING (runner_id = public.current_runner_id());

CREATE POLICY runner_assigned_orders ON orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_assignments a
      WHERE a.order_id = orders.id
        AND a.runner_id = public.current_runner_id()
        AND a.released_at IS NULL
    )
  );

CREATE POLICY runner_assigned_order_items ON order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM order_assignments a
      WHERE a.order_id = order_items.order_id
        AND a.runner_id = public.current_runner_id()
        AND a.released_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Partners: only rows carrying their own partner_id.
-- ---------------------------------------------------------------------------
CREATE POLICY partner_own_record ON partners FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_users pu
      WHERE pu.partner_id = partners.id AND pu.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY partner_own_qr ON qr_codes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_users pu
      WHERE pu.partner_id = qr_codes.partner_id AND pu.user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Everyone reads their own app_users row.
-- ---------------------------------------------------------------------------
CREATE POLICY app_user_self ON app_users FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- webhook_events, quotes, order_locations, order_item_customizations,
-- shift_cash, notifications and partner_users are intentionally left with RLS
-- enabled and NO policy: service-role only. If a future feature needs one of
-- them client-side, that is a deliberate decision to make then, not an
-- accident to inherit now.
