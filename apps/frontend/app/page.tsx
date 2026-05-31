import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  PenLine,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--card))_0%,hsl(var(--background))_72%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="text-xl font-semibold tracking-tight text-foreground">
              Draftly
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Connect Gmail</Button>
              </Link>
            </div>
          </nav>

          <div className="grid flex-1 gap-10 py-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:py-14">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-sm text-brand-300">
                <Sparkles className="h-4 w-4" />
                AI email drafts reviewed by you
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                  Your Gmail replies, already written in your voice.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Draftly learns how you write, prepares replies for emails that
                  need attention, and saves approved responses into Gmail Drafts.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto">
                    Start with Gmail
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/inbox">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                    View dashboard
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Review queue</p>
                    <p className="text-xs text-muted-foreground">Replies ready for approval</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                    Synced
                  </span>
                </div>

                <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="border-b border-border lg:border-b-0 lg:border-r">
                    {DRAFTS.map((draft, index) => (
                      <div
                        key={draft.subject}
                        className={`border-b border-border px-5 py-4 ${
                          index === 0 ? "bg-brand-500/10" : "bg-card"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-foreground">
                            {draft.subject}
                          </p>
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            {draft.status}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {draft.preview}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Generated reply</p>
                        <h2 className="mt-1 text-lg font-semibold text-foreground">
                          Q3 vendor update
                        </h2>
                      </div>
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                        pending
                      </span>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm leading-6 text-foreground/85">
                      Hi sir,
                      <br />
                      <br />
                      Please find the attached file for the Q3 vendor update.
                      I will review the missing entries and share the final version by EOD.
                      <br />
                      <br />
                      Regards
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <PreviewAction icon={PenLine} label="Edit" />
                      <PreviewAction icon={Sparkles} label="Rewrite" />
                      <PreviewAction icon={Mail} label="Approve" />
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      Once approved, Draftly locks the draft and stores it in Gmail Drafts.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <HeroClaim title="Highly secure" text="Your account access is protected by secure server-side sessions." />
                <HeroClaim title="Human reviewed" text="Every reply waits for approval." />
                <HeroClaim title="Gmail native" text="Approved replies land in Drafts." />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-brand-300">What Draftly promises</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              A careful workflow for people who still want the final say.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Claim
              icon={Mail}
              title="Gmail-native"
              text="Approved replies are created in Gmail Drafts, inside the original thread."
            />
            <Claim
              icon={PenLine}
              title="Fully editable"
              text="Review, tweak, rewrite, or reject every generated response before approval."
            />
            <Claim
              icon={LockKeyhole}
              title="Locked after approval"
              text="Once a draft is approved, edits and rewrites are disabled across UI and API."
            />
            <Claim
              icon={Workflow}
              title="Clean routing"
              text="Frontend talks only to Node. Node owns AI calls, Gmail calls, audit logs, and config."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

const DRAFTS = [
  ["Q3 vendor update", "Hi sir, please find the attached file and final notes by EOD.", "pending"],
  ["Invoice follow up", "Thank you for understanding. I will send the revised copy today.", "edited"],
  ["Missed call", "I have missed your call. Please share a good time to connect.", "pending"],
].map(([subject, preview, status]) => ({ subject, preview, status }));

function PreviewAction({ icon: Icon, label }: { icon: typeof PenLine; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground">
      <Icon className="h-4 w-4 text-brand-300" />
      {label}
    </div>
  );
}

function HeroClaim({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function Claim({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
