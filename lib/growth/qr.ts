import { serviceClient } from "@/lib/db/client";

export interface QrAttribution {
  qrCodeId: string;
  partnerId: string | null;
  campaignId: string | null;
}

/**
 * §2: "Technically one table and one URL parameter landing on the same
 * D2C flow." A scanned/typo'd code that doesn't resolve, is inactive, or
 * belongs to a campaign outside its date window is simply not attributed
 * — never blocks the order. Attribution is a nice-to-have for the
 * business, not something a customer's checkout should ever fail over.
 */
export async function resolveQrCode(code: string): Promise<QrAttribution | null> {
  const db = serviceClient();
  const { data: qr } = await db
    .from("qr_codes")
    .select("id, partner_id, campaign_id, active, campaigns(starts_at, ends_at)")
    .eq("code", code)
    .maybeSingle();
  if (!qr || !qr.active) return null;

  const campaign = qr.campaigns as unknown as { starts_at: string | null; ends_at: string | null } | null;
  if (campaign) {
    const now = Date.now();
    if (campaign.starts_at && now < new Date(campaign.starts_at).getTime()) return null;
    if (campaign.ends_at && now > new Date(campaign.ends_at).getTime()) return null;
  }

  return { qrCodeId: qr.id, partnerId: qr.partner_id, campaignId: qr.campaign_id };
}
