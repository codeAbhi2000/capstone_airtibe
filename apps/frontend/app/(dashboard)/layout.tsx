"use client";

import { Button } from "@/components/ui/button";
import { getCurrentUser, logout } from "@/lib/api";
import { clearClientSession, saveClientSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Archive, Inbox, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/history", label: "Drafts", icon: Archive },
  { href: "/settings", label: "Profile", icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    getCurrentUser()
      .then(saveClientSession)
      .catch(() => {
        clearClientSession();
        router.push("/login");
      });
  }, [router]);

  async function handleLogout() {
    await logout().catch(() => undefined);
    clearClientSession();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card/60 px-4 py-5 backdrop-blur-md lg:block">
        <Link href="/inbox" className="block px-3 text-xl font-semibold text-foreground">
          Draftly
        </Link>
        <nav className="mt-8 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-500/10 text-brand-300"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <Button
          variant="ghost"
          className="absolute bottom-5 left-4 right-4 justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/inbox" className="font-semibold text-foreground">
              Draftly
            </Link>
            <div className="flex items-center gap-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={cn(
                    "rounded-lg p-2 text-muted-foreground",
                    pathname === href && "bg-secondary text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
