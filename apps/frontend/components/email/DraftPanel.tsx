"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/email/EmailCard";
import { TonePicker } from "@/components/email/TonePicker";
import type { EmailDraft, TonePreference } from "@draftly/shared";
import { Check, RotateCcw, Save, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

interface DraftPanelProps {
  draft: EmailDraft;
  isSaving: boolean;
  onSave: (content: string) => Promise<EmailDraft | null>;
  onApprove: () => Promise<EmailDraft | null>;
  onReject: () => Promise<EmailDraft | null>;
  onSend: () => Promise<EmailDraft | null>;
  onRewrite: (
    instruction: string,
    finalDraft: string,
  ) => Promise<EmailDraft | null>;
}

export function DraftPanel({
  draft,
  isSaving,
  onSave,
  onApprove,
  onReject,
  onSend,
  onRewrite,
}: DraftPanelProps) {
  const [content, setContent] = useState(draft.finalDraft || draft.aiDraft || "");
  const [tone, setTone] = useState<TonePreference>("semi-formal");
  const [instruction, setInstruction] = useState("");
  const locked = draft.status === "approved" || draft.status === "sent";

  useEffect(() => {
    setContent(draft.finalDraft || draft.aiDraft || "");
  }, [draft]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2">
                <StatusBadge status={draft.status} />
              </div>
              <h1 className="truncate text-2xl font-semibold text-foreground">
                {draft.subject || "No subject"}
              </h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                From {draft.fromEmail || "unknown sender"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => onSave(content)}
                disabled={isSaving || locked}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              <Button
                onClick={async () => {
                  const saved = await onSave(content);
                  if (saved) await onApprove();
                }}
                disabled={isSaving || locked}
              >
                <Check className="h-4 w-4" />
                Approve
              </Button>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            readOnly={locked}
            rows={16}
            className="min-h-[360px] w-full resize-y rounded-xl border border-border bg-secondary/20 px-4 py-4 text-sm leading-6 text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 read-only:cursor-not-allowed read-only:opacity-70"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                const saved = await onSave(content);
                if (saved) await onSend();
              }}
              disabled={isSaving || locked}
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
            <Button variant="ghost" onClick={onReject} disabled={isSaving || locked}>
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div>
            <h2 className="font-medium text-foreground">Rewrite with tweaks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generates a fresh draft from the same email using your instruction.
            </p>
          </div>
          <TonePicker value={tone} onChange={setTone} disabled={locked} />
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            readOnly={locked}
            rows={4}
            placeholder="Make it shorter, more apologetic, and mention EOD."
            className="w-full resize-none rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 read-only:cursor-not-allowed read-only:opacity-70"
          />
          <Button
            variant="secondary"
            onClick={() =>
              onRewrite(
                tone ? `${instruction}\n\nTone: ${tone}` : instruction,
                content,
              )
            }
            disabled={isSaving || locked || !instruction.trim()}
          >
            <RotateCcw className="h-4 w-4" />
            Rewrite draft
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
