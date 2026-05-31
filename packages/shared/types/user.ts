import type { Plan } from "./plan";
import type { OnboardingPreferences } from "./styleProfile";

export interface User {
  id: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  plan: Plan;
  stripeCustomerId?: string | null;
  stripeSubId?: string | null;
  draftsUsedMonth?: number;
  billingPeriodStart?: string;
  onboardingComplete?: boolean;
  preferences?: OnboardingPreferences | null;
  createdAt?: string;
}

export interface UserUsage {
  plan: Plan;
  draftsUsedMonth: number;
  draftsLimit: number | null;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}
