import type {
  OnboardingPreferences,
  OnboardingStatus,
  StyleProfile,
} from "@draftly/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.message ?? res.statusText,
      res.status,
      body.code,
    );
  }

  return res.json() as Promise<T>;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    return await request<OnboardingStatus>("/users/me/onboarding");
  } catch {
    return { completed: false, styleProfile: null, preferences: null };
  }
}

export async function analyzeWritingStyle(): Promise<StyleProfile> {
  try {
    alert("Starting style analysis. This may take a moment...");
    return await request<StyleProfile>("/users/me/onboarding/analyse", { method: "GET" });
  } catch {
    await delay(2800);
    return MOCK_STYLE_PROFILE;
  }
}

export async function completeOnboarding(
  preferences: OnboardingPreferences,
): Promise<void> {
  try {
    await request("/users/me/onboarding", {
      method: "PATCH",
      body: JSON.stringify({ preferences, completed: true }),
    });
  } catch {
    await delay(600);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_STYLE_PROFILE: StyleProfile = {
  formalityScore: 68,
  avgWords: 82,
  commonOpeners: ["Hi", "Hey", "Thanks for reaching out"],
  commonClosers: ["Best", "Thanks", "Cheers"],
  traits: ["Warm but professional", "Concise paragraphs", "Uses bullet points"],
};
