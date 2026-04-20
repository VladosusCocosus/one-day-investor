import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Switch } from "radix-ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Preferences {
  notify_snapshot_reminders: boolean;
  notify_service_updates: boolean;
  notify_blog_posts: boolean;
}

type CategoryDef = { key: keyof Preferences; labelKey: string; descKey: string };

const CATEGORIES: CategoryDef[] = [
  {
    key: "notify_snapshot_reminders",
    labelKey: "unsubscribe.snapshotReminders",
    descKey: "unsubscribe.snapshotRemindersDesc",
  },
  {
    key: "notify_service_updates",
    labelKey: "unsubscribe.serviceUpdates",
    descKey: "unsubscribe.serviceUpdatesDesc",
  },
  {
    key: "notify_blog_posts",
    labelKey: "unsubscribe.blogPosts",
    descKey: "unsubscribe.blogPostsDesc",
  },
];

export function UnsubscribePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t("unsubscribe.missingToken"));
      return;
    }
    api
      .get<Preferences>(`/api/notifications/preferences?token=${token}`)
      .then((res) => setPrefs(res.data))
      .catch(() => setError(t("unsubscribe.invalidLink")));
  }, [token]);

  const update = async (patch: Partial<Preferences>) => {
    if (!token || !prefs) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.put<Preferences>(
        `/api/notifications/preferences?token=${token}`,
        patch
      );
      setPrefs(res.data);
    } catch {
      setError(t("unsubscribe.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const unsubscribeAll = () =>
    update({
      notify_snapshot_reminders: false,
      notify_service_updates: false,
      notify_blog_posts: false,
    });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-lg font-bold text-foreground">
            <span className="text-primary">●</span> {t("unsubscribe.appName")}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-bold text-foreground">
            {t("unsubscribe.emailPreferences")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("unsubscribe.chooseEmails")}
          </p>

          {error && !prefs && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {prefs && (
            <>
              <div className="mt-6 space-y-4">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.key}
                    className="flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {t(cat.labelKey)}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t(cat.descKey)}
                      </p>
                    </div>
                    <Switch.Root
                      checked={prefs[cat.key]}
                      disabled={saving}
                      onCheckedChange={(checked) =>
                        update({ [cat.key]: checked })
                      }
                      aria-label={t(cat.labelKey)}
                      className={cn(
                        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border border-border transition-colors outline-none",
                        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        prefs[cat.key] ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <Switch.Thumb
                        className={cn(
                          "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                          "translate-x-0.5 data-[state=checked]:translate-x-[22px]"
                        )}
                      />
                    </Switch.Root>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={saving}
                  onClick={unsubscribeAll}
                >
                  {t("unsubscribe.unsubscribeAll")}
                </Button>
              </div>

              {error && (
                <div className="mt-3 text-xs text-destructive">{error}</div>
              )}
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("unsubscribe.manageFromProfile")}{" "}
          <a href="/profile" className="text-foreground underline">
            {t("unsubscribe.profileSettings")}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
