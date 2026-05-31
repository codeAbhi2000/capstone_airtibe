export type DraftStatus = "pending" | "approved" | "edited" | "rejected" | "sent";
export type DraftPriority = "high" | "medium" | "low";

export interface EmailDraft {
  id: string;
  messageId: string;
  threadId: string;
  subject: string | null;
  fromEmail: string | null;
  status: DraftStatus;
  priority: DraftPriority;
  aiDraft: string | null;
  finalDraft: string | null;
  promptVersion?: string | null;
  rewriteCount?: number;
  suggestedEdits?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface DraftListResponse {
  drafts: EmailDraft[];
}

export interface DraftResponse {
  draft: EmailDraft;
}
