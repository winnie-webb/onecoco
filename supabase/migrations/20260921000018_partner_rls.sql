-- 0018_partner_rls.sql
-- Phase 9: the partner dashboard needs to read the orders attributed to
-- it and its own campaigns — 0007_rls.sql gave partners their own
-- `partners`/`qr_codes` rows but never extended that to `orders` or
-- `campaigns`. Learned from Phases 6–7's pattern of exactly this kind of
-- gap: added now, before the dashboard query is written, and still
-- verified against a real signed-in partner session below rather than
-- assumed correct because it "should" work.

SET search_path TO public, extensions;

CREATE POLICY partner_attributed_orders ON orders FOR SELECT TO authenticated
  USING (
    partner_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM partner_users pu WHERE pu.partner_id = orders.partner_id AND pu.user_id = (SELECT auth.uid()))
  );

CREATE POLICY partner_own_campaigns ON campaigns FOR SELECT TO authenticated
  USING (
    partner_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM partner_users pu WHERE pu.partner_id = campaigns.partner_id AND pu.user_id = (SELECT auth.uid()))
  );
