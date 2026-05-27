import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { StyleProfile } from "@draftly/shared";
import { MessageSquare, PenLine, Quote } from "lucide-react";

interface StylePreviewStepProps {
  profile: StyleProfile;
  onContinue: () => void;
}

function formalityLabel(score: number) {
  if (score >= 75) return "Formal";
  if (score >= 50) return "Balanced";
  return "Casual";
}

export function StylePreviewStep({ profile, onContinue }: StylePreviewStepProps) {
  return (
    <div className="animate-slide-up space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Here&apos;s what we learned</h2>
        <p className="text-muted-foreground">
          Your style profile — Draftly will use this for every draft
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Formality</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {formalityLabel(profile.formalityScore)}
                </p>
              </div>
              <span className="rounded-full bg-brand-500/10 px-3 py-1 text-sm font-medium text-brand-400">
                {profile.formalityScore}%
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-brand-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                style={{ width: `${profile.formalityScore}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
              <PenLine className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg. email length</p>
              <p className="text-2xl font-semibold text-foreground">
                ~{profile.avgWords} words
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <Quote className="h-4 w-4 text-brand-400" />
              How you open emails
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.commonOpeners.map((opener) => (
                <span
                  key={opener}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground/80 border border-border/30"
                >
                  &ldquo;{opener}&rdquo;
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <MessageSquare className="h-4 w-4 text-brand-400" />
              How you sign off
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.commonClosers.map((closer) => (
                <span
                  key={closer}
                  className="rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground/80 border border-border/30"
                >
                  {closer},
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-brand-500/25 bg-brand-500/5">
        <CardContent className="pt-6">
          <p className="mb-3 text-sm font-medium text-foreground/90">Writing traits</p>
          <ul className="flex flex-wrap gap-2">
            {profile.traits.map((trait) => (
              <li
                key={trait}
                className="rounded-full border border-brand-500/20 bg-card px-3 py-1 text-sm text-brand-300"
              >
                {trait}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button size="lg" onClick={onContinue} className="min-w-[200px]">
          Looks good — set preferences
        </Button>
      </div>
    </div>
  );
}
