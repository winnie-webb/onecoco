import { requireStaffSession } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireStaffSession();
  return <AdminShell session={session}>{children}</AdminShell>;
}
