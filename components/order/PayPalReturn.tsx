"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PAYPAL_PENDING_KEY } from "@/components/order/paypal-pending";
import { track } from "@/lib/analytics/events";

interface Pending {
  paymentId?: string;
  providerRef?: string;
  trackToken?: string;
}

function readPending(): Pending {
  try {
    return JSON.parse(sessionStorage.getItem(PAYPAL_PENDING_KEY) ?? "{}") as Pending;
  } catch {
    return {};
  }
}

type State = "capturing" | "paid-no-link" | "pending" | "failed" | "cancelled";

export function PayPalReturn({ providerRef, cancelled }: { providerRef: string | null; cancelled: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<State>(cancelled ? "cancelled" : "capturing");
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (cancelled || started.current) return;
    started.current = true;

    const pending = readPending();
    // Only trust our own stored paymentId if it's for the PayPal order
    // PayPal just sent back; otherwise fall back to the token alone.
    const paymentId = pending.providerRef && pending.providerRef === providerRef ? pending.paymentId : undefined;

    (async () => {
      if (!providerRef) {
        setState("failed");
        setMessage("PayPal didn't send us a payment reference.");
        return;
      }
      try {
        const res = await fetch("/api/v1/payments/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId, providerRef }),
        });
        const data = await res.json();
        if (!res.ok) {
          setState("failed");
          setMessage(data.code === "ORDER_NOT_PAYABLE" ? "This order has expired. You haven't been charged." : null);
          return;
        }
        if (data.status === "PENDING") {
          setState("pending");
          return;
        }
        track("payment_succeeded", { provider: "paypal" });
        try {
          sessionStorage.removeItem(PAYPAL_PENDING_KEY);
        } catch {}
        if (pending.trackToken && paymentId) router.replace(`/confirm/${pending.trackToken}`);
        else setState("paid-no-link");
      } catch {
        setState("failed");
      }
    })();
  }, [cancelled, providerRef, router]);

  const body: Record<State, { title: string; text: string }> = {
    capturing: { title: "Finishing your payment…", text: "Don't close this page — it only takes a moment." },
    "paid-no-link": {
      title: "Payment received",
      text: "Your order is placed — the runner will show you your delivery code.",
    },
    pending: {
      title: "Payment processing",
      text: "PayPal is still confirming your payment. We'll send a runner as soon as it clears.",
    },
    failed: {
      title: "Payment didn't go through",
      text: message ?? "You haven't been charged. Try again, or choose cash on delivery.",
    },
    cancelled: { title: "Payment cancelled", text: "No problem — you haven't been charged. Your order wasn't sent to a runner." },
  };

  return (
    <div className="mx-auto max-w-lg text-center" role="status" aria-live="polite">
      <h1 className="font-display text-3xl font-extrabold text-jungle-900">{body[state].title}</h1>
      <p className="mt-3 text-ink-soft">{body[state].text}</p>
      {(state === "failed" || state === "cancelled") && (
        <div className="mt-6">
          <Button href="/order">Start again</Button>
        </div>
      )}
    </div>
  );
}
