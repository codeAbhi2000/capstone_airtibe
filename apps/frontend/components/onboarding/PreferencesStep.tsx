import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { OnboardingPreferences, TonePreference } from "@draftly/shared";

interface PreferencesStepProps {
  preferences: OnboardingPreferences;
  onToneChange: (tone: TonePreference) => void;
  onSignatureChange: (signature: string) => void;
  onContinue: () => void;
  isSubmitting: boolean;
}

const TONES: { value: TonePreference; label: string; description: string }[] = [
  {
    value: "semi-formal",
    label: "Semi-formal",
    description: "Clear, polite, lightly professional",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, approachable, conversational",
  },
  {
    value: "formal",
    label: "Formal",
    description: "Professional, polished, structured",
  },
  {
    value: "concise",
    label: "Concise",
    description: "Short, direct, to the point",
  },
];

export function PreferencesStep({
  preferences,
  onToneChange,
  onSignatureChange,
  onContinue,
  isSubmitting,
}: PreferencesStepProps) {
  return (
    <div className="animate-slide-up space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Fine-tune your defaults</h2>
        <p className="text-muted-foreground">
          You can change these anytime in Settings
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h3 className="font-medium text-foreground">Default draft tone</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Used when generating new replies from your inbox
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {TONES.map(({ value, label, description }) => {
              const selected = preferences.defaultTone === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onToneChange(value)}
                  className={cn(
                    "rounded-xl border-2 p-4 text-left transition-all duration-300",
                    selected
                      ? "border-brand-500 bg-brand-500/10 shadow-glow"
                      : "border-border bg-secondary/30 hover:border-border-hover hover:bg-secondary",
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      selected ? "text-brand-400" : "text-foreground",
                    )}
                  >
                    {label}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <label htmlFor="signature" className="font-medium text-foreground">
              Email signature{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              Appended to drafts when you approve and send
            </p>
          </div>
          <textarea
            id="signature"
            rows={4}
            value={preferences.signature}
            onChange={(e) => onSignatureChange(e.target.value)}
            placeholder={`Best,\nYour Name\nYour Title`}
            className="w-full resize-none rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all duration-300"
          />
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={onContinue}
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? "Saving…" : "Finish setup"}
        </Button>
      </div>
    </div>
  );
}
