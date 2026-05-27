import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started — Draftly",
  description: "Set up your writing style profile",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-950/25 via-background to-background antialiased">
      <header className="border-b border-border bg-background/60 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-brand-400 to-cyan-400 bg-clip-text text-transparent">
            Draftly
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">{children}</main>
    </div>
  );
}
