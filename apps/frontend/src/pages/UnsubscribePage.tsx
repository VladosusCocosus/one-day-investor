import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { Switch } from "radix-ui";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Preferences {
  notify_snapshot_reminders: boolean;
  notify_service_updates: boolean;
  notify_blog_posts: boolean;
}

const CATEGORIES: { key: keyof Preferences; label: string; description: string }[] = [
  {
    key: "notify_snapshot_reminders",
    label: "Snapshot reminders",
    description: "Monthly reminder to record your portfolio snapshot.",
  },
  {
    key: "notify_service_updates",
    label: "Service updates",
    description: "New features, integrations, and maintenance notices.",
  },
  {
    key: "notify_blog_posts",
    label: "Blog posts",
    description: "New blog posts published on One Day Investor.",
  },
];

export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing token. Please use the link from your email.");
      return;
    }
    api
      .get<Preferences>(`/api/notifications/preferences?token=${token}`)
      .then((res) => setPrefs(res.data))
      .catch(() => setError("Invalid or expired link."));
  }, [token]);

  const update = async (patch: Partial<Preferences>) => {
    if (!token || !prefs) return;
    setSaving(true);
    try {
      const res = await api.put<Preferences>(
        `/api/notifications/preferences?token=${token}`,
        patch
      );
      setPrefs(res.data);
    } catch {
      setError("Failed to save. Please try again.");
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
            <span className="text-primary">●</span> One Day Investor
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h1 className="text-lg font-bold text-foreground">
            Email preferences
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose which emails you'd like to receive.
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
                        {cat.label}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cat.description}
                      </p>
                    </div>
                    <Switch.Root
                      checked={prefs[cat.key]}
                      disabled={saving}
                      onCheckedChange={(checked) =>
                        update({ [cat.key]: checked })
                      }
                      aria-label={cat.label}
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
                  Unsubscribe from all
                </Button>
              </div>

              {error && (
                <div className="mt-3 text-xs text-destructive">{error}</div>
              )}
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can also manage these from your{" "}
          <a href="/profile" className="text-foreground underline">
            profile settings
          </a>
          .
        </p>
      </div>
    </div>
  );
}
