"use client";

import { EmailCard } from "@/components/email/EmailCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDrafts } from "@/hooks/useDrafts";
import { cn } from "@/lib/utils";
import type { DraftStatus } from "@draftly/shared";
import { Archive } from "lucide-react";
import { useState } from "react";

const FILTERS: Array<{ value: DraftStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "edited", label: "Edited" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent" },
  { value: "rejected", label: "Rejected" },
];

export default function HistoryPage() {
  const [filter, setFilter] = useState<DraftStatus | "all">("all");
  const { drafts, isLoading, error, refresh } = useDrafts(filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Draft history</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View pending, edited, approved, sent, and rejected drafts.
          </p>
        </div>
        <Button variant="secondary" onClick={refresh}>
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              filter === value
                ? "border-brand-500 bg-brand-500/10 text-brand-300"
                : "border-border bg-secondary/30 text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading drafts...
          </CardContent>
        </Card>
      ) : drafts.length ? (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <EmailCard key={draft.id} draft={draft} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 rounded-2xl bg-secondary p-4 text-brand-300">
              <Archive className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No drafts found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another status filter or generate a new draft.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
