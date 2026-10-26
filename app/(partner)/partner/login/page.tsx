"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { browserClient } from "@/lib/db/browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "not_partner" ? "That account isn't linked to a partner." : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = browserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Incorrect email or password.");
      setSubmitting(false);
      return;
    }

    router.push("/partner/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="font-display text-2xl font-bold text-jungle-900">Partner sign-in</h1>

      {error && <p className="mt-4 font-medium text-red-700">{error}</p>}

      <label className="mt-6 block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
        />
      </label>
      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-bold uppercase tracking-wide text-ink-soft">Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="min-h-11 w-full rounded-full border-2 border-sand-200 px-4 text-base"
        />
      </label>

      <Button type="submit" disabled={submitting} size="lg" className="mt-6 w-full">
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
