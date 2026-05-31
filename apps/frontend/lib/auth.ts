import type { User } from "@draftly/shared";

const SESSION_KEY = "draftly.session.v1";

export interface ClientSession {
  user: Pick<
    User,
    "id" | "email" | "name" | "image" | "plan" | "onboardingComplete"
  >;
  savedAt: string;
}

export function saveClientSession(user: User) {
  if (typeof window === "undefined") return;

  const session: ClientSession = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      plan: user.plan,
      onboardingComplete: user.onboardingComplete,
    },
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readClientSession(): ClientSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ClientSession;
  } catch {
    clearClientSession();
    return null;
  }
}

export function clearClientSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
