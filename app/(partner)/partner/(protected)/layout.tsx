import { requirePartnerSession } from "@/lib/auth/partner-guards";
import { PartnerShell } from "@/components/partner/PartnerShell";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requirePartnerSession();
  return <PartnerShell partnerName={session.partnerName}>{children}</PartnerShell>;
}
