import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function CompleteStep() {
  return (
    <div className="animate-slide-up flex flex-col items-center space-y-8 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
      </div>

      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">You&apos;re all set!</h2>
        <p className="text-muted-foreground">
          Draftly has learned your voice. Head to your inbox — we&apos;ll surface emails
          that need a reply and draft responses in your style.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/inbox">
          <Button size="lg" className="min-w-[180px] w-full sm:w-auto">
            Go to inbox
          </Button>
        </Link>
        <Link href="/settings">
          <Button size="lg" variant="secondary" className="min-w-[180px] w-full sm:w-auto">
            View settings
          </Button>
        </Link>
      </div>
    </div>
  );
}
