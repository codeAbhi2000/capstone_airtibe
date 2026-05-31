"use client";

import { DraftPanel } from "@/components/email/DraftPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDraft } from "@/hooks/useDrafts";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DraftPage() {
  const params = useParams<{ id: string }>();
  const { draft, isLoading, isSaving, error, save, approve, reject, send, rewrite } =
    useDraft(params.id);

  async function handleRewrite(instruction: string, finalDraft: string) {
    return rewrite(instruction, finalDraft);
  }

  return (
    <div className="space-y-6">
      <Link href="/history">
        <Button variant="ghost">
          <ArrowLeft className="h-4 w-4" />
          Back to drafts
        </Button>
      </Link>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading draft...
          </CardContent>
        </Card>
      ) : draft ? (
        <DraftPanel
          draft={draft}
          isSaving={isSaving}
          onSave={save}
          onApprove={approve}
          onReject={reject}
          onSend={send}
          onRewrite={handleRewrite}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Draft not found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
