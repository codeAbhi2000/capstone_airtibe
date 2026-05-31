import type {
  DraftListResponse,
  DraftResponse,
  DraftStatus,
  EmailDraft,
  AppConfig,
  OnboardingPreferences,
  OnboardingStatus,
  StyleProfile,
  User,
  UserUsage,
} from "@draftly/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const NORMALIZED_API_BASE = withApiPrefix(assertNodeServiceUrl(API_BASE));

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
  const normalizedPath = path.replace(/^\/+/, "");
  const res = await fetch(`${NORMALIZED_API_BASE}/${normalizedPath}`, {
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
    const { user } = await request<{
      user: {
        onboardingComplete: boolean;
        preferences: OnboardingPreferences | null;
      };
    }>("/users/me");

    return {
      completed: user.onboardingComplete,
      styleProfile: null,
      preferences: user.preferences,
    };
  } catch {
    return { completed: false, styleProfile: null, preferences: null };
  }
}

export async function analyzeWritingStyle(): Promise<StyleProfile> {
  const profile = await request<StyleProfile | { styleProfile: StyleProfile } | null>(
    "/users/me/onboarding/analyse",
    { method: "POST" },
  );

  if (!profile) {
    throw new ApiError("No style profile returned", 502, "EMPTY_STYLE_PROFILE");
  }

  return "styleProfile" in profile ? profile.styleProfile : profile;
}

export async function getAppConfig(): Promise<AppConfig> {
  return request<AppConfig>("/config");
}

export async function completeOnboarding(
  preferences: OnboardingPreferences,
): Promise<User> {
  const { user } = await request<{ success: boolean; user: User }>(
    "/users/me/onboarding/complete",
    {
      method: "POST",
      body: JSON.stringify({ preferences }),
    },
  );
  return user;
}

export async function getCurrentUser(): Promise<User> {
  const { user } = await request<{ user: User }>("/users/me");
  return user;
}

export async function getUserUsage(): Promise<UserUsage> {
  return request<UserUsage>("/users/me/usage");
}

export async function updateUserPreferences(
  preferences: Partial<OnboardingPreferences>,
): Promise<User> {
  const { user } = await request<{ user: User }>("/users/me/preferences", {
    method: "PATCH",
    body: JSON.stringify({ preferences }),
  });
  return user;
}

export async function listDrafts(params?: {
  status?: DraftStatus | "all";
  limit?: number;
  offset?: number;
}): Promise<EmailDraft[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") query.set("status", params.status);
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const { drafts } = await request<DraftListResponse>(`/drafts${suffix}`);
  return drafts;
}

export async function getDraft(id: string): Promise<EmailDraft> {
  const { draft } = await request<DraftResponse>(`/drafts/${id}`);
  return draft;
}

export async function editDraft(id: string, finalDraft: string): Promise<EmailDraft> {
  const { draft } = await request<DraftResponse>(`/drafts/${id}/edit`, {
    method: "PATCH",
    body: JSON.stringify({ finalDraft }),
  });
  return draft;
}

export async function approveDraft(id: string): Promise<EmailDraft> {
  const { draft } = await request<DraftResponse>(`/drafts/${id}/approve`, {
    method: "PATCH",
  });
  return draft;
}

export async function rejectDraft(id: string): Promise<EmailDraft> {
  const { draft } = await request<DraftResponse>(`/drafts/${id}/reject`, {
    method: "PATCH",
  });
  return draft;
}

export async function sendDraft(id: string): Promise<EmailDraft> {
  const { draft } = await request<DraftResponse & { success: boolean }>(
    `/drafts/${id}/send`,
    { method: "POST" },
  );
  return draft;
}

export async function generateDraft(input: {
  messageId: string;
  tone?: string;
  additionalInstruction?: string;
}): Promise<EmailDraft> {
  const { draft } = await request<DraftResponse>("/drafts/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return draft;
}

export async function rewriteDraft(input: {
  id: string;
  instruction: string;
  finalDraft?: string;
}): Promise<EmailDraft> {
  const { draft } = await request<DraftResponse>(`/drafts/${input.id}/rewrite`, {
    method: "PATCH",
    body: JSON.stringify({
      instruction: input.instruction,
      finalDraft: input.finalDraft,
    }),
  });
  return draft;
}

export async function logout(): Promise<void> {
  await request("/auth/logout", { method: "POST" });
}

function withApiPrefix(url: string) {
  const trimmed = url.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function assertNodeServiceUrl(url: string) {
  const normalized = url.toLowerCase();
  if (
    normalized.includes("ai-service") ||
    normalized.includes("localhost:8000") ||
    normalized.includes("127.0.0.1:8000")
  ) {
    throw new Error(
      "Frontend API URL must point to the Node service, not the AI service.",
    );
  }

  return url;
}
