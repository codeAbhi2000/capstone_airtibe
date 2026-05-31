import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EmailDraft } from "@draftly/shared";
import { ArrowRight, Clock, Mail } from "lucide-react";
import Link from "next/link";

interface EmailCardProps {
  draft: EmailDraft;
}

export function EmailCard({ draft }: EmailCardProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={draft.status} />
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(draft.updatedAt ?? draft.createdAt)}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">
              {draft.subject || "No subject"}
            </h3>
            <p className="mt-1 flex items-center gap-2 truncate text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              {draft.fromEmail || "Unknown sender"}
            </p>
          </div>
          <p className="line-clamp-2 text-sm leading-6 text-foreground/75">
            {draft.finalDraft || draft.aiDraft || "No draft content yet."}
          </p>
        </div>
        <Link href={`/draft/${draft.id}`} className="shrink-0">
          <Button variant="secondary" className="w-full sm:w-auto">
            Open
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: EmailDraft["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        status === "pending" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
        status === "edited" && "border-sky-500/30 bg-sky-500/10 text-sky-300",
        status === "approved" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        status === "sent" && "border-brand-500/30 bg-brand-500/10 text-brand-300",
        status === "rejected" && "border-red-500/30 bg-red-500/10 text-red-300",
      )}
    >
      {status}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
