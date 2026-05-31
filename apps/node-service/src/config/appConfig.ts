export const APP_CONFIG = {
  plans: {
    free: {
      label: "Free",
      draftsPerMonth: 10,
      features: [
        "10 drafts per month",
        "Gmail draft creation",
        "Basic style profile",
      ],
    },
    paid: {
      label: "Paid",
      draftsPerMonth: null,
      features: [
        "Unlimited drafts",
        "Gmail draft creation",
        "Reviewed style profile",
        "Rewrite with custom instructions",
      ],
    },
  },
  onboarding: {
    sentEmailsToAnalyze: 4,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
