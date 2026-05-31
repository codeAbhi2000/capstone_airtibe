"use client";

import { EmailCard } from "@/components/email/EmailCard";
import { Card, CardContent } from "@/components/ui/card";
import { useInbox } from "@/hooks/useInbox";
import { Inbox } from "lucide-react";

export default function InboxPage() {
  const { drafts, isLoading, error } = useInbox();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inbox drafts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pending replies that are ready to review, edit, approve, or send.
        </p>
      </div>

      {error && <Alert message={error} />}
      {isLoading && <LoadingRows />}

      {!isLoading && !drafts.length ? (
        <EmptyState
          title="No pending drafts"
          description="New drafts will appear here when the backend creates them."
        />
      ) : (
        <div className="space-y-3">
          {drafts.map((draft) => (
            <EmailCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
    </div>
  );
}

function Alert({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((item) => (
        <Card key={item}>
          <CardContent className="space-y-3 pt-6">
            <div className="h-4 w-36 animate-pulse rounded bg-secondary" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
            <div className="h-4 w-full animate-pulse rounded bg-secondary" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 rounded-2xl bg-secondary p-4 text-brand-300">
          <Inbox className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
