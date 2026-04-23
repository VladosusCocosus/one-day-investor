import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAgents,
  useCreateAgent,
  useRevokeAgent,
  useAgentTokens,
  useCreateAgentToken,
  useRevokeAgentToken,
} from "@/hooks/useAgents";
import type { CreateTokenResponse } from "@/lib/agentsApi";
import { cn } from "@/lib/utils";

const EXPIRY_OPTIONS = ["1h", "6h", "24h", "7d", "30d"] as const;
type Expiry = (typeof EXPIRY_OPTIONS)[number];

export function AgentsPage() {
  const { t } = useTranslation();
  const { data: agents = [], isLoading } = useAgents();
  const createAgent = useCreateAgent();
  const revokeAgent = useRevokeAgent();

  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [freshToken, setFreshToken] = useState<CreateTokenResponse | null>(null);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    await createAgent.mutateAsync({ name });
    setNewName("");
  };

  const examplePrompt = t("agents.examplePromptBody", {
    token: freshToken?.token ?? "oda_xxxxxxxxxxxxxxxxxxxxx",
  });

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">{t("agents.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("agents.subtitle")}{" "}
        <a
          className="underline"
          href="https://odinvestor.net/agents.json"
          target="_blank"
          rel="noreferrer"
        >
          agents.json
        </a>
      </p>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={t("agents.namePlaceholder")}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <Button onClick={handleCreate} disabled={createAgent.isPending}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t("agents.createAgent")}
          </Button>
        </div>
      </section>

      {freshToken && (
        <section className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-5">
          <div className="text-sm font-semibold">{t("agents.tokenCreated")}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {t("agents.tokenOnceWarning")}
          </div>
          <div className="mt-3 flex gap-2">
            <code className="flex-1 rounded-md bg-background border border-border px-3 py-2 font-mono text-xs break-all">
              {freshToken.token}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(freshToken.token)}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              {t("agents.copy")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFreshToken(null)}>
              {t("common.close")}
            </Button>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="text-sm font-semibold text-foreground">
          {t("agents.examplePromptTitle")}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("agents.examplePromptSubtitle")}
        </div>
        <pre className="mt-3 rounded-md bg-background border border-border p-3 font-mono text-xs whitespace-pre-wrap break-all">
          {examplePrompt}
        </pre>
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard.writeText(examplePrompt)}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {t("agents.copy")}
          </Button>
        </div>
      </section>

      <section className="mt-6 space-y-3">
        {isLoading && (
          <div className="text-sm text-muted-foreground">{t("common.loading")}</div>
        )}
        {!isLoading && agents.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            {t("agents.empty")}
          </div>
        )}
        {agents.map((a) => (
          <article key={a.id} className="rounded-xl border border-border bg-card p-5">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{a.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("agents.tokensCount", { count: a.active_token_count })} ·{" "}
                  {a.last_used_at
                    ? t("agents.lastUsed", {
                        when: new Date(a.last_used_at).toLocaleString(),
                      })
                    : t("agents.neverUsed")}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExpandedId(expandedId === a.id ? null : a.id)
                  }
                >
                  {expandedId === a.id ? t("common.close") : t("agents.manageTokens")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(t("agents.confirmRevoke"))) {
                      revokeAgent.mutate(a.id);
                      if (expandedId === a.id) setExpandedId(null);
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </header>
            {expandedId === a.id && (
              <AgentTokens agentId={a.id} onTokenCreated={setFreshToken} />
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

function AgentTokens({
  agentId,
  onTokenCreated,
}: {
  agentId: string;
  onTokenCreated: (t: CreateTokenResponse) => void;
}) {
  const { t } = useTranslation();
  const { data: tokens = [], isLoading } = useAgentTokens(agentId);
  const createToken = useCreateAgentToken(agentId);
  const revokeToken = useRevokeAgentToken(agentId);
  const [expiry, setExpiry] = useState<Expiry>("24h");

  const handleCreate = async () => {
    const resp = await createToken.mutateAsync(expiry);
    onTokenCreated(resp);
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">{t("agents.expiresIn")}:</label>
        <select
          value={expiry}
          onChange={(e) => setExpiry(e.target.value as Expiry)}
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        >
          {EXPIRY_OPTIONS.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <Button size="sm" onClick={handleCreate} disabled={createToken.isPending}>
          {t("agents.createToken")}
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {isLoading && (
          <li className="text-xs text-muted-foreground">{t("common.loading")}</li>
        )}
        {tokens.map((tok) => {
          const expired = new Date(tok.expires_at) < new Date();
          const status = tok.revoked_at
            ? t("agents.statusRevoked")
            : expired
              ? t("agents.statusExpired")
              : t("agents.statusActive");
          return (
            <li
              key={tok.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2",
                (tok.revoked_at || expired) && "opacity-60"
              )}
            >
              <div className="min-w-0 text-xs">
                <div className="font-mono">…{tok.token_last4}</div>
                <div className="text-muted-foreground">
                  {status} ·{" "}
                  {t("agents.expiresAt", { when: new Date(tok.expires_at).toLocaleString() })}
                </div>
              </div>
              {!tok.revoked_at && !expired && (
                <Button size="sm" variant="outline" onClick={() => revokeToken.mutate(tok.id)}>
                  {t("agents.revokeToken")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
