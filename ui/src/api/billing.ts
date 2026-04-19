import { api } from "./client.js";

export interface SubscriptionStatus {
  active: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

export const billingApi = {
  getStatus: () => api.get<SubscriptionStatus>("/billing/status"),
  createCheckout: () => api.post<{ url: string }>("/billing/checkout", {}),
  createPortal: () => api.post<{ url: string }>("/billing/portal", {}),
};
