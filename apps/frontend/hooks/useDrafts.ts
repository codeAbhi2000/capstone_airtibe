"use client";

import {
  approveDraft,
  editDraft,
  getDraft,
  listDrafts,
  rejectDraft,
  rewriteDraft,
  sendDraft,
} from "@/lib/api";
import type { DraftStatus, EmailDraft } from "@draftly/shared";
import { useCallback, useEffect, useState } from "react";

export function useDrafts(status: DraftStatus | "all" = "all") {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDrafts(await listDrafts({ status, limit: 100 }));
    } catch {
      setError("Could not load drafts.");
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { drafts, isLoading, error, refresh };
}

export function useDraft(id: string) {
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDraft(await getDraft(id));
    } catch {
      setError("Could not load this draft.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runAction = useCallback(
    async (action: () => Promise<EmailDraft>) => {
      setIsSaving(true);
      setError(null);
      try {
        const updated = await action();
        setDraft(updated);
        return updated;
      } catch {
        setError("Action failed. Please try again.");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return {
    draft,
    isLoading,
    isSaving,
    error,
    refresh,
    save: (finalDraft: string) => runAction(() => editDraft(id, finalDraft)),
    approve: () => runAction(() => approveDraft(id)),
    reject: () => runAction(() => rejectDraft(id)),
    send: () => runAction(() => sendDraft(id)),
    rewrite: (instruction: string, finalDraft: string) =>
      runAction(() => rewriteDraft({ id, instruction, finalDraft })),
  };
}
