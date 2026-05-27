"use client";

import { AnalyzeStep } from "@/components/onboarding/AnalyzeStep";
import { CompleteStep } from "@/components/onboarding/CompleteStep";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { PreferencesStep } from "@/components/onboarding/PreferencesStep";
import { StylePreviewStep } from "@/components/onboarding/StylePreviewStep";
import { WelcomeStep } from "@/components/onboarding/WelcomeStep";
import { useOnboarding } from "@/hooks/useOnboarding";

export function OnboardingWizard() {
  const {
    step,
    styleProfile,
    preferences,
    analyzeProgress,
    isSubmitting,
    error,
    goTo,
    runAnalysis,
    updateTone,
    updateSignature,
    finishOnboarding,
  } = useOnboarding();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-10">
      <OnboardingProgress currentStep={step} />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {step === "welcome" && <WelcomeStep onContinue={runAnalysis} />}

      {step === "analyze" && <AnalyzeStep progress={analyzeProgress} />}

      {step === "style-preview" && styleProfile && (
        <StylePreviewStep
          profile={styleProfile}
          onContinue={() => goTo("preferences")}
        />
      )}

      {step === "preferences" && (
        <PreferencesStep
          preferences={preferences}
          onToneChange={updateTone}
          onSignatureChange={updateSignature}
          onContinue={finishOnboarding}
          isSubmitting={isSubmitting}
        />
      )}

      {step === "complete" && <CompleteStep />}
    </div>
  );
}
