import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Sparkles, Zap } from "lucide-react";

interface WelcomeStepProps {
  onContinue: () => void;
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  return (
    <div className="animate-slide-up space-y-8">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground">
          Welcome to Draftly
        </h1>
        <p className="text-balance text-muted-foreground">
          We&apos;ll learn how you write from your sent emails, then draft replies that
          sound like you — not a robot.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Mail,
            title: "Connect Gmail",
            desc: "Secure read access to analyze your writing style",
          },
          {
            icon: Sparkles,
            title: "AI style analysis",
            desc: "We scan recent sent mail to capture your tone and patterns",
          },
          {
            icon: Zap,
            title: "Smarter drafts",
            desc: "Every reply matches your voice — friendly, formal, or concise",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <Card key={title} className="border-border hover:border-brand-500/30 hover:shadow-glow transition-all duration-300">
            <CardContent className="space-y-3 pt-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Icon className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button size="lg" onClick={onContinue} className="min-w-[200px]">
          Analyze my writing style
        </Button>
        <p className="text-xs text-muted-foreground">
          Takes about 30 seconds · We only read sent mail, never store credentials
        </p>
      </div>
    </div>
  );
}
