"use client";

import { useCallback, useState } from "react";
import {
  analyzeWritingStyle,
  completeOnboarding,
} from "@/lib/api";
import type {
  OnboardingPreferences,
  StyleProfile,
  TonePreference,
} from "@draftly/shared";

export type OnboardingStep =
  | "welcome"
  | "analyze"
  | "style-preview"
  | "preferences"
  | "complete";

const STEPS: OnboardingStep[] = [
  "welcome",
  "analyze",
  "style-preview",
  "preferences",
  "complete",
];

export function useOnboarding() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    defaultTone: "friendly",
    signature: "",
  });
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length;

  const baseURL = process.env.NEXT_PUBLIC_NODE_SERVICE_URL || "http://localhost:4000";

  const goTo = useCallback((next: OnboardingStep) => {
    setError(null);
    setStep(next);
  }, []);

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    setError(null);
    goTo("analyze");

    

    const progressInterval = setInterval(() => {
      setAnalyzeProgress((p) => Math.min(p + 4, 92));
    }, 120);

    try {
      const profile = await analyzeWritingStyle();
      setStyleProfile(profile);
      setAnalyzeProgress(100);
      await delay(400);
      goTo("style-preview");
    } catch {
      setError("We couldn't analyze your emails. Please try again.");
      goTo("welcome");
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
    }
  }, [goTo]);

  const updateTone = useCallback((defaultTone: TonePreference) => {
    setPreferences((prev) => ({ ...prev, defaultTone }));
  }, []);

  const updateSignature = useCallback((signature: string) => {
    setPreferences((prev) => ({ ...prev, signature }));
  }, []);

  const finishOnboarding = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await completeOnboarding(preferences);
      goTo("complete");
    } catch {
      setError("Something went wrong saving your preferences. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [preferences, goTo]);

  return {
    step,
    stepIndex,
    totalSteps,
    styleProfile,
    preferences,
    analyzeProgress,
    isAnalyzing,
    isSubmitting,
    error,
    goTo,
    runAnalysis,
    updateTone,
    updateSignature,
    finishOnboarding,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
