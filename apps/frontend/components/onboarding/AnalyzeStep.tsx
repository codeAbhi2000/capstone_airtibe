import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Mail, Search, Sparkles } from "lucide-react";

interface AnalyzeStepProps {
  progress: number;
}

const PHASES = [
  { icon: Mail, label: "Fetching sent emails", threshold: 30 },
  { icon: Search, label: "Detecting tone & patterns", threshold: 65 },
  { icon: Sparkles, label: "Building your style profile", threshold: 100 },
];

export function AnalyzeStep({ progress }: AnalyzeStepProps) {
  const activePhase =
    PHASES.find((p) => progress < p.threshold) ?? PHASES[PHASES.length - 1];

  return (
    <div className="animate-fade-in space-y-8 py-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          <Loader2 className="h-7 w-7 animate-spin text-brand-400" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Learning your writing style
        </h2>
        <p className="text-muted-foreground">
          Analyzing your recent sent emails to understand how you communicate
        </p>
      </div>

      <Card className="shadow-glow border-brand-500/10">
        <CardContent className="space-y-6 pt-8">
          <Progress value={progress} />
          <p className="text-center text-sm font-medium text-brand-400">
            {progress}% complete
          </p>

          <ul className="space-y-3">
            {PHASES.map(({ icon: Icon, label, threshold }) => {
              const done = progress >= threshold;
              const active = activePhase.label === label;

              return (
                <li
                  key={label}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-300 ${
                    active 
                      ? "bg-brand-500/5 border-brand-500/30 text-foreground" 
                      : done 
                        ? "bg-secondary/20 border-border/50 text-foreground/80" 
                        : "border-transparent text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      done
                        ? "bg-brand-600 text-white shadow-[0_0_10px_rgba(99,102,241,0.25)]"
                        : active
                          ? "bg-brand-500/20 text-brand-400"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <span className="text-sm">✓</span>
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      done || active ? "font-medium" : ""
                    }`}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
