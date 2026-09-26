import { describe, expect, it } from "vitest";
import { buildResendRequest } from "@/lib/notifications/email";

describe("buildResendRequest (pure — no network; live send unverified, see PHASE-5-NOTES.md)", () => {
  it("shapes a request matching Resend's documented send API", () => {
    const { url, init } = buildResendRequest("customer@example.com", { subject: "Hi", html: "<p>hi</p>" }, "orders@example.com");

    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ "Content-Type": "application/json" });

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      from: "orders@example.com",
      to: "customer@example.com",
      subject: "Hi",
      html: "<p>hi</p>",
    });
  });
});
