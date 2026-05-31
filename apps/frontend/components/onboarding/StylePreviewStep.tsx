import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { StyleProfile } from "@draftly/shared";
import {
  Ban,
  MessageSquare,
  PenLine,
  Quote,
  SmilePlus,
  Type,
  type LucideIcon,
} from "lucide-react";

interface StylePreviewStepProps {
  profile: StyleProfile;
  onProfileChange: (updates: Partial<StyleProfile>) => void;
  onContinue: () => void;
}

function formalityLabel(score: number) {
  if (score >= 75) return "Formal";
  if (score >= 50) return "Balanced";
  return "Casual";
}

export function StylePreviewStep({
  profile,
  onProfileChange,
  onContinue,
}: StylePreviewStepProps) {
  const formality =
    profile.formality ??
    (typeof profile.formalityScore === "number"
      ? formalityLabel(profile.formalityScore)
      : "Not detected");
  const avgLength =
    profile.avgSentenceLength ??
    (profile.avgWords ? `~${profile.avgWords} words` : "Not detected");
  const keyPhrases = profile.keyPhrases ?? profile.commonOpeners ?? [];
  const signoffs = profile.signoff ? [profile.signoff] : profile.commonClosers ?? [];
  const traits = (
    profile.traits ?? [
      profile.writingPatterns,
      profile.punctuationStyle && `Punctuation: ${profile.punctuationStyle}`,
      profile.vocabulary && `Vocabulary: ${profile.vocabulary}`,
    ]
  ).filter(Boolean) as string[];

  return (
    <div className="animate-slide-up space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Here&apos;s what we learned</h2>
        <p className="text-muted-foreground">
          Your style profile will guide every draft Draftly creates.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Formality</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">
                  {capitalize(formality)}
                </p>
              </div>
              {profile.tone && (
                <span className="rounded-full bg-brand-500/10 px-3 py-1 text-sm font-medium text-brand-400">
                  {capitalize(profile.tone)}
                </span>
              )}
            </div>
            {typeof profile.formalityScore === "number" && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-brand-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ width: `${profile.formalityScore}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary">
              <PenLine className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sentence length</p>
              <p className="text-2xl font-semibold text-foreground">
                {capitalize(avgLength)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MiniMetric icon={Quote} label="Greeting" value={profile.greeting ?? "Not detected"} />
        <MiniMetric
          icon={MessageSquare}
          label="Signoff"
          value={signoffs.join(", ") || "Not detected"}
        />
        <MiniMetric
          icon={SmilePlus}
          label="Emoji use"
          value={profile.usesEmoji ? "Uses emoji" : "No emoji"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <Quote className="h-4 w-4 text-brand-400" />
              Key phrases
            </div>
            <div className="flex flex-wrap gap-2">
              {keyPhrases.length ? (
                keyPhrases.map((phrase) => (
                  <span
                    key={phrase}
                    className="rounded-lg border border-border/30 bg-secondary px-3 py-1.5 text-sm text-foreground/80"
                  >
                    &ldquo;{phrase}&rdquo;
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No phrases returned yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
              <Type className="h-4 w-4 text-brand-400" />
              Writing pattern
            </div>
            <p className="text-sm leading-6 text-foreground/80">
              {profile.writingPatterns ?? "No writing pattern returned yet."}
            </p>
          </CardContent>
        </Card>
      </div>

      {traits.length ? (
        <Card className="border-brand-500/25 bg-brand-500/5">
          <CardContent className="pt-6">
            <p className="mb-3 text-sm font-medium text-foreground/90">Writing traits</p>
            <ul className="flex flex-wrap gap-2">
              {traits.map((trait) => (
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
      ) : null}

      {profile.doNot?.length ? (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/90">
              <Ban className="h-4 w-4 text-brand-400" />
              Drafting guardrails
            </div>
            <ul className="flex flex-wrap gap-2">
              {profile.doNot.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border/40 bg-secondary px-3 py-1 text-sm text-foreground/80"
                >
                  {capitalize(item)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/50">
        <CardContent className="space-y-5 pt-6">
          <div>
            <h3 className="font-medium text-foreground">Adjust style profile</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              These reviewed details are saved with your onboarding preferences.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <LabeledInput
              label="Greeting"
              value={profile.greeting ?? ""}
              placeholder="Hi"
              onChange={(greeting) => onProfileChange({ greeting })}
            />
            <LabeledInput
              label="Signoff"
              value={profile.signoff ?? ""}
              placeholder="Regards"
              onChange={(signoff) => onProfileChange({ signoff })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <LabeledSelect
              label="Tone"
              value={profile.tone ?? ""}
              onChange={(tone) => onProfileChange({ tone })}
              options={["semi-formal", "friendly", "formal", "concise"]}
            />
            <LabeledSelect
              label="Formality"
              value={profile.formality ?? ""}
              onChange={(formality) => onProfileChange({ formality })}
              options={["low", "medium", "high"]}
            />
            <LabeledSelect
              label="Sentence length"
              value={profile.avgSentenceLength ?? ""}
              onChange={(avgSentenceLength) => onProfileChange({ avgSentenceLength })}
              options={["short", "medium", "long"]}
            />
          </div>

          <LabeledInput
            label="Vocabulary"
            value={profile.vocabulary ?? ""}
            placeholder="simple"
            onChange={(vocabulary) => onProfileChange({ vocabulary })}
          />

          <LabeledTextarea
            label="Key phrases"
            value={keyPhrases.join("\n")}
            placeholder="Hi sir"
            onChange={(value) => onProfileChange({ keyPhrases: toList(value) })}
          />

          <LabeledTextarea
            label="Writing pattern"
            value={profile.writingPatterns ?? ""}
            placeholder="Uses brief, direct sentences..."
            onChange={(writingPatterns) => onProfileChange({ writingPatterns })}
          />

          <LabeledTextarea
            label="Drafting guardrails"
            value={(profile.doNot ?? []).join("\n")}
            placeholder="avoid elaborate explanations"
            onChange={(value) => onProfileChange({ doNot: toList(value) })}
          />

          <label className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={Boolean(profile.usesEmoji)}
              onChange={(event) => onProfileChange({ usesEmoji: event.target.checked })}
              className="h-4 w-4 rounded border-border accent-brand-500"
            />
            Uses emoji
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button size="lg" onClick={onContinue} className="min-w-[200px]">
          Looks good - set preferences
        </Button>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      >
        <option value="">Not set</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {capitalize(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-none rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );
}

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="flex items-center gap-3 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Icon className="h-4 w-4 text-brand-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-base font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function capitalize(value: string) {
  return value.replace(/^\w/, (letter) => letter.toUpperCase());
}

function toList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
