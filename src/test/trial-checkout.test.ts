import { describe, expect, it } from "vitest";
import { canStartCheckout } from "../lib/billing";

const start = Date.parse("2026-10-29T23:40:00Z");
const end = start + 15 * 86_400_000;
const customer = { role: "owner" as const, subscriptionStatus: "trial", trialEndsAt: new Date(end).toISOString(), isBlocked: false };

describe("checkout after the free trial", () => {
  it("does not require checkout to create an account", () => {
    expect(canStartCheckout(null, start)).toBe(false);
  });
  it("withholds checkout for all 15 trial days", () => {
    expect(canStartCheckout(customer, start)).toBe(false);
    expect(canStartCheckout(customer, end - 1)).toBe(false);
  });
  it("allows checkout when the trial ends using the existing account", () => {
    expect(canStartCheckout(customer, end)).toBe(true);
  });
  it("does not allow blocked or already active accounts to checkout", () => {
    expect(canStartCheckout({ ...customer, isBlocked: true }, end)).toBe(false);
    expect(canStartCheckout({ ...customer, subscriptionStatus: "active" }, end)).toBe(false);
  });
});