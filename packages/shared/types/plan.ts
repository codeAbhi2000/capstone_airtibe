export type Plan = "free" | "paid";

export const PLAN_LIMITS = {
  free: { draftsPerMonth: 10 },
  paid: { draftsPerMonth: null },
} as const;
