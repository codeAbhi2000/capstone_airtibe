import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/hooks/useOnboarding";

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: "Welcome",
  analyze: "Analyze",
  "style-preview": "Your style",
  preferences: "Preferences",
  complete: "Done",
};

const VISIBLE_STEPS: OnboardingStep[] = [
  "welcome",
  "analyze",
  "style-preview",
  "preferences",
  "complete",
];

interface OnboardingProgressProps {
  currentStep: OnboardingStep;
}

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  const currentIndex = VISIBLE_STEPS.indexOf(currentStep);

  return (
    <nav aria-label="Onboarding progress" className="w-full">
      <ol className="flex items-center justify-between gap-2">
        {VISIBLE_STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <li key={step} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isComplete || isCurrent ? "bg-brand-500" : "bg-secondary",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                    isComplete && "bg-brand-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]",
                    isCurrent && "bg-brand-600 text-white ring-4 ring-brand-950 shadow-[0_0_15px_rgba(99,102,241,0.5)]",
                    !isComplete && !isCurrent && "bg-secondary text-muted-foreground",
                  )}
                >
                  {isComplete ? "✓" : index + 1}
                </div>
                {index < VISIBLE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      isComplete ? "bg-brand-500" : "bg-secondary",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "hidden text-center text-xs sm:block",
                  isCurrent ? "font-medium text-brand-400" : "text-muted-foreground",
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
