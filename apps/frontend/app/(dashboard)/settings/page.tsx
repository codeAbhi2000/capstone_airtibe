"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getAppConfig,
  getCurrentUser,
  getUserUsage,
  updateUserPreferences,
} from "@/lib/api";
import type {
  AppConfig,
  OnboardingPreferences,
  TonePreference,
  User,
  UserUsage,
} from "@draftly/shared";
import { Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

const TONES: TonePreference[] = ["semi-formal", "friendly", "formal", "concise"];

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [preferences, setPreferences] = useState<OnboardingPreferences>({
    defaultTone: "semi-formal",
    signature: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [nextUser, nextUsage] = await Promise.all([
          getCurrentUser(),
          getUserUsage().catch(() => null),
        ]);
        const nextConfig = await getAppConfig().catch(() => null);
        setUser(nextUser);
        setUsage(nextUsage);
        setAppConfig(nextConfig);
        if (nextUser.preferences) {
          setPreferences({
            defaultTone: nextUser.preferences.defaultTone ?? "semi-formal",
            signature: nextUser.preferences.signature ?? "",
            styleProfile: nextUser.preferences.styleProfile,
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  async function savePreferences() {
    setIsSaving(true);
    setMessage(null);
    try {
      const updated = await updateUserPreferences(preferences);
      setUser(updated);
      setMessage("Preferences saved.");
    } catch {
      setMessage("Could not save preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading profile...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage account, usage, default tone, signature, and reviewed style profile.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-brand-300">
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-7 w-7" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-foreground">
                    {user?.name || "Draftly user"}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric label="Plan" value={user?.plan ?? "free"} />
                <Metric
                  label="Onboarding"
                  value={user?.onboardingComplete ? "Complete" : "Pending"}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <h2 className="font-medium text-foreground">Usage</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Metric
                  label="Drafts used"
                  value={String(usage?.draftsUsedMonth ?? user?.draftsUsedMonth ?? 0)}
                />
                <Metric
                  label="Monthly limit"
                  value={usage?.draftsLimit === null ? "Unlimited" : String(usage?.draftsLimit ?? "-")}
                />
              </div>
              {usage?.billingPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  Resets {new Date(usage.billingPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          {appConfig && (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <h2 className="font-medium text-foreground">Plan limits</h2>
                <div className="space-y-3">
                  {Object.entries(appConfig.plans).map(([plan, config]) => (
                    <div
                      key={plan}
                      className="rounded-xl border border-border bg-secondary/30 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">{config.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {config.draftsPerMonth === null
                            ? "Unlimited drafts"
                            : `${config.draftsPerMonth} drafts/month`}
                        </p>
                      </div>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {config.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardContent className="space-y-5 pt-6">
            <div>
              <h2 className="font-medium text-foreground">Drafting preferences</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These values are sent to the backend preferences store.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Default tone</span>
              <select
                value={preferences.defaultTone}
                onChange={(event) =>
                  setPreferences((prev) => ({
                    ...prev,
                    defaultTone: event.target.value as TonePreference,
                  }))
                }
                className="w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              >
                {TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Signature</span>
              <textarea
                rows={5}
                value={preferences.signature}
                onChange={(event) =>
                  setPreferences((prev) => ({ ...prev, signature: event.target.value }))
                }
                placeholder="Regards,\nYour name"
                className="w-full resize-none rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Reviewed style profile</span>
              <textarea
                rows={12}
                value={JSON.stringify(preferences.styleProfile ?? {}, null, 2)}
                onChange={(event) => {
                  try {
                    const styleProfile = JSON.parse(event.target.value);
                    setPreferences((prev) => ({ ...prev, styleProfile }));
                    setMessage(null);
                  } catch {
                    setMessage("Style profile JSON is invalid.");
                  }
                }}
                className="w-full resize-y rounded-xl border border-border bg-secondary/30 px-4 py-3 font-mono text-xs leading-5 text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <Button onClick={savePreferences} disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save profile"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium capitalize text-foreground">{value}</p>
    </div>
  );
}
