-- 0007_rls.sql deliberately left partner_users with RLS enabled and NO
-- policy ("service-role only") — true until Phase 9 added client-facing
-- partner login. loadPartnerSession() (lib/auth/partner-guards.ts) now
-- reads this table under the signed-in partner's own RLS-scoped session,
-- and partner_own_record / partner_own_qr / partner_own_campaigns /
-- partner_attributed_orders (0018_partner_rls.sql) all EXISTS-subquery
-- into it too — every one of those was silently returning zero rows
-- because the subquery itself runs under the same restricted role and
-- couldn't see any partner_users row at all, no policy having ever
-- granted that. Confirmed empty via a real partner access token, not
-- just service_role, before writing this fix (§16's recurring lesson).
CREATE POLICY partner_user_self ON partner_users FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
