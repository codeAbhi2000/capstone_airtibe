export type TonePreference = "friendly" | "formal" | "concise" | "semi-formal";

export interface StyleProfile {
  tone?: TonePreference | string;
  avgSentenceLength?: "short" | "medium" | "long" | string;
  formality?: "low" | "medium" | "high" | string;
  greeting?: string;
  signoff?: string;
  vocabulary?: "simple" | "moderate" | "advanced" | string;
  punctuationStyle?: string;
  usesEmoji?: boolean;
  keyPhrases?: string[];
  writingPatterns?: string;
  doNot?: string[];
  formalityScore?: number;
  avgWords?: number;
  commonOpeners?: string[];
  commonClosers?: string[];
  traits?: string[];
}

export interface OnboardingPreferences {
  defaultTone: TonePreference;
  signature: string;
  styleProfile?: StyleProfile;
}

export interface OnboardingStatus {
  completed: boolean;
  styleProfile: StyleProfile | null;
  preferences: OnboardingPreferences | null;
}
