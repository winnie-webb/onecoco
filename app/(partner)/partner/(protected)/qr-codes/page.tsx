import type { Metadata } from "next";
import QRCode from "qrcode";
import { requirePartnerSession } from "@/lib/auth/partner-guards";
import { serverClient } from "@/lib/db/server";
import { siteUrl } from "@/lib/brand";

export const metadata: Metadata = { title: "QR codes" };
export const dynamic = "force-dynamic";

/**
 * §2: "print QR codes" (Journeys, Partner). Generated entirely offline
 * with the `qrcode` package — no external QR-generation API, which this
 * sandbox's network policy wouldn't reach anyway (same class of host as
 * the map tile providers Phase 7 found blocked).
 */
export default async function Page() {
  const session = await requirePartnerSession();
  const db = await serverClient();

  const { data: qrCodes, error } = await db
    .from("qr_codes")
    .select("id, code, placement_label, active, created_at")
    .eq("partner_id", session.partnerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const withImages = await Promise.all(
    (qrCodes ?? []).map(async (qr) => {
      const url = `${siteUrl}/order?qr=${encodeURIComponent(qr.code)}`;
      const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
      return { ...qr, url, dataUrl };
    }),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-jungle-900">QR codes</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Print these at your check-in desk, beach chairs, or concierge stand. Scanning one attributes the order to you.
      </p>

      {withImages.length === 0 && <p className="mt-6 text-ink-soft">No QR codes yet — ask staff to create one for you.</p>}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {withImages.map((qr) => (
          <div key={qr.id} className="rounded-card border-2 border-sand-200 bg-sand-50 p-5 text-center print:break-inside-avoid">
            {/* eslint-disable-next-line @next/next/no-img-element -- a
                generated data: URL, not an optimizable remote image */}
            <img src={qr.dataUrl} alt={`QR code for ${qr.placement_label ?? qr.code}`} className="mx-auto" width={220} height={220} />
            <p className="mt-3 font-semibold text-jungle-900">{qr.placement_label ?? qr.code}</p>
            <p className="mt-1 break-all text-xs text-ink-soft">{qr.url}</p>
            {!qr.active && <p className="mt-1 text-xs font-bold uppercase text-red-700">Inactive</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
