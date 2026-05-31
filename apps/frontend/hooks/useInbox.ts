"use client";

import { useDrafts } from "@/hooks/useDrafts";

export function useInbox() {
  return useDrafts("pending");
}
