import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { serverClient } from "@/lib/db/server";

export interface PartnerSession {
  userId: string;
  partnerId: string;
  partnerName: string;
  commissionRateBps: number;
}

async function loadPartnerSession(): Promise<PartnerSession | "NO_SESSION" | "NOT_PARTNER"> {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "NO_SESSION";

  const { data: appUser } = await supabase.from("app_users").select("role, active").eq("id", user.id).single();
  if (!appUser || !appUser.active || appUser.role !== "PARTNER") return "NOT_PARTNER";

  // MVP: one partner org per user. partner_users is many-to-many (a hotel
  // could have several staff logins) but nothing yet needs a user on
  // multiple partner orgs, so the first row is the whole answer.
  const { data: link } = await supabase
    .from("partner_users")
    .select("partner_id, partners(name, commission_rate_bps, status)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!link) return "NOT_PARTNER";

  const partner = link.partners as unknown as { name: string; commission_rate_bps: number; status: string } | null;
  if (!partner) return "NOT_PARTNER";

  return { userId: user.id, partnerId: link.partner_id, partnerName: partner.name, commissionRateBps: partner.commission_rate_bps };
}

export async function requirePartnerSession(): Promise<PartnerSession> {
  const session = await loadPartnerSession();
  if (session === "NOT_PARTNER") redirect("/partner/login?error=not_partner");
  if (session === "NO_SESSION") redirect("/partner/login");
  return session;
}

export async function requirePartnerApi(): Promise<{ session: PartnerSession } | { response: NextResponse }> {
  const session = await loadPartnerSession();
  if (typeof session === "string") {
    const status = session === "NO_SESSION" ? 401 : 403;
    return { response: NextResponse.json({ error: "not signed in as a partner" }, { status }) };
  }
  return { session };
}
