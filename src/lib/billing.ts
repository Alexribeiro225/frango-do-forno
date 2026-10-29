type BillingUser = {
  role: "master" | "owner";
  subscriptionStatus: string;
  trialEndsAt: string | null;
  isBlocked: boolean;
};

export function canStartCheckout(user: BillingUser | null, now = Date.now()): boolean {
  if (!user || user.role !== "owner" || user.isBlocked || user.subscriptionStatus === "active") return false;
  if (user.trialEndsAt && new Date(user.trialEndsAt).getTime() > now) return false;
  return true;
}