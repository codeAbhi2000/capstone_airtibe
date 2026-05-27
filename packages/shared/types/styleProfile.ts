export type TonePreference = "friendly" | "formal" | "concise";

export interface StyleProfile {
  formalityScore: number;
  avgWords: number;
  commonOpeners: string[];
  commonClosers: string[];
  traits: string[];
}

export interface OnboardingPreferences {
  defaultTone: TonePreference;
  signature: string;
}

export interface OnboardingStatus {
  completed: boolean;
  styleProfile: StyleProfile | null;
  preferences: OnboardingPreferences | null;
}
