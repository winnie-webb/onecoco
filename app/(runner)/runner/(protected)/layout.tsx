import { requireRunnerSession } from "@/lib/auth/runner-guards";
import { RunnerShell } from "@/components/runner/RunnerShell";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await requireRunnerSession();
  return <RunnerShell session={session}>{children}</RunnerShell>;
}
