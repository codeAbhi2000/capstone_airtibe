"use client";

import { logout } from "@/lib/api";
import { clearClientSession } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function runLogout() {
      await logout().catch(() => undefined);
      clearClientSession();
      router.replace("/login");
    }

    runLogout();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <div className="rounded-2xl border border-border bg-card px-8 py-6 text-center shadow-card">
        <h1 className="text-lg font-semibold">Signing out</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Clearing your local session and secure cookie.
        </p>
      </div>
    </main>
  );
}
