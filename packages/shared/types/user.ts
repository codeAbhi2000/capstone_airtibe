import type { Plan } from "./plan";

export interface User {
  id: string;
  plan: Plan;
  stripeCustomerId: string | null;
  stripeSubId: string | null;
  draftsUsedMonth: number;
  billingPeriodStart: string;
}

export interface UserUsage {
  plan: Plan;
  draftsUsedMonth: number;
  draftsLimit: number | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}
