import type { Plan } from "./plan";

export interface PlanConfig {
  label: string;
  draftsPerMonth: number | null;
  features: string[];
}

export interface AppConfig {
  plans: Record<Plan, PlanConfig>;
  onboarding: {
    sentEmailsToAnalyze: number;
  };
}
