"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Settings → "חיבור לסוכנים". A household member creates, lists and revokes
 * the per-household bearer tokens that external agents (Claude, Kami...) use
 * against /api/agent/* and /api/mcp.
 *
 * The raw token exists ONLY in `created` state, straight from the POST
 * response. It is never written to storage and never re-fetched: closing the
 * box (or leaving the page) loses it, by design.
 */

interface TokenRow {
  id: string;
  label: string | null;
  createdAt: string;
  maskedPrefix: string;
  /** Absent on older responses: treated as the default scopes. */
  scopes?: string[];
}

interface AuditRow {
  id: string;
  action: "delete_task" | "deliver_to_me";
  outcome: "preview" | "executed" | "denied" | "rejected" | "failed";
  tokenLabel: string | null;
  detail: string | null;
  createdAt: string;
}

interface CreatedToken {
  id: string;
  label: string;
  rawToken: string;
}

const MAX_LABEL = 60;

function CodeBlock({
  text,
  copyLabel,
  copiedLabel,
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  }
  return (
    <div className="relative">
      <pre
        dir="ltr"
        className="text-left text-xs leading-relaxed bg-surface-hover text-foreground rounded-xl p-3 pe-3 overflow-x-auto whitespace-pre-wrap break-all border border-border/60"
      >
        {text}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-surface-hover transition-colors min-h-[44px]"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

export function AgentConnectSection() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const householdId = profile?.household_id ?? null;

  const [tokens, setTokens] = useState<TokenRow[] | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  // Opt-in scopes: unchecked unless the member deliberately ticks them.
  const [scopeDeliver, setScopeDeliver] = useState(false);
  const [scopeDelete, setScopeDelete] = useState(false);
  const [max, setMax] = useState(10);
  const [loadError, setLoadError] = useState(false);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedToken | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("https://www.bayitbeseder.com");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoadError(false);
    try {
      const res = await fetch(
        `/api/agent-tokens?householdId=${encodeURIComponent(householdId)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setTokens(data.tokens as TokenRow[]);
      setAudit(Array.isArray(data.audit) ? (data.audit as AuditRow[]) : []);
      if (typeof data.max === "number") setMax(data.max);
    } catch {
      setLoadError(true);
      setTokens((prev) => prev ?? []);
    }
  }, [householdId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!householdId || creating) return;
    const trimmed = label.trim();
    if (!trimmed) return;
    setCreating(true);
    setFormError(null);
    try {
      const res = await fetch("/api/agent-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdId,
          label: trimmed,
          scopes: [
            ...(scopeDeliver ? ["deliver_to_me"] : []),
            ...(scopeDelete ? ["delete_tasks"] : []),
          ],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setFormError(t("agentSection.limitReached"));
        return;
      }
      if (!res.ok || !data.token?.rawToken) {
        setFormError(data.error || t("agentSection.createError"));
        return;
      }
      setCreated({ id: data.token.id, label: data.token.label, rawToken: data.token.rawToken });
      setLabel("");
      setScopeDeliver(false);
      setScopeDelete(false);
      await load();
    } catch {
      setFormError(t("agentSection.createError"));
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!householdId) return;
    if (!confirm(t("agentSection.revokeConfirm"))) return;
    setRevokingId(id);
    try {
      const res = await fetch(
        `/api/agent-tokens/${id}?householdId=${encodeURIComponent(householdId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(String(res.status));
      toast.success(t("agentSection.revokeSuccess"));
      if (created?.id === id) setCreated(null);
      await load();
    } catch {
      toast.error(t("agentSection.revokeError"));
    } finally {
      setRevokingId(null);
    }
  }

  const tokenShown = created?.rawToken ?? t("agentSection.tokenPlaceholder");
  const mcpUrl = `${origin}/api/mcp`;
  const claudeCmd = `claude mcp add --transport http bayit ${mcpUrl} --header "Authorization: Bearer ${tokenShown}"`;
  const httpCmd = `curl -X POST ${origin}/api/agent/task \\\n  -H "Authorization: Bearer ${tokenShown}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"action":"list"}'`;

  if (!householdId) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted" role="status">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        {t("agentSection.loading")}
      </div>
    );
  }

  const atLimit = (tokens?.length ?? 0) >= max;

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground leading-relaxed">{t("agentSection.intro")}</p>

      {created && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/60 p-3 space-y-2"
        >
          <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
            {t("agentSection.newTitle")}: {created.label}
          </p>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            {t("agentSection.newWarning")}
          </p>
          <CodeBlock
            text={created.rawToken}
            copyLabel={t("agentSection.copy")}
            copiedLabel={t("agentSection.copied")}
          />
          <button
            type="button"
            onClick={() => setCreated(null)}
            className="text-xs font-medium text-amber-950 dark:text-amber-100 underline underline-offset-2 min-h-[44px]"
          >
            {t("agentSection.dismiss")}
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-2">
        <label htmlFor="agent-token-label" className="block text-xs font-medium text-foreground">
          {t("agentSection.labelField")}
        </label>
        <div className="flex gap-2">
          <input
            id="agent-token-label"
            type="text"
            value={label}
            maxLength={MAX_LABEL}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("agentSection.labelPlaceholder")}
            aria-describedby={formError ? "agent-token-error" : undefined}
            aria-invalid={formError ? true : undefined}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-border bg-surface text-sm text-foreground placeholder:text-muted min-h-[44px]"
          />
          <button
            type="submit"
            disabled={creating || atLimit || !label.trim()}
            className="px-4 rounded-xl gradient-primary text-white text-sm font-bold active:scale-[0.97] transition-transform disabled:opacity-40 min-h-[44px] shrink-0"
          >
            {creating ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                {t("agentSection.creating")}
              </span>
            ) : (
              t("agentSection.createButton")
            )}
          </button>
        </div>
        <fieldset className="space-y-2 rounded-xl border border-border/60 p-3">
          <legend className="px-1 text-xs font-semibold text-foreground">
            {t("agentSection.scopesTitle")}
          </legend>
          <p className="text-xs text-muted">{t("agentSection.scopesDefault")}</p>
          <label className="flex items-start gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={scopeDeliver}
              onChange={(e) => setScopeDeliver(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span className="text-xs text-foreground leading-relaxed">
              <span className="font-medium">{t("agentSection.scopeDeliver")}</span>
              <span className="block text-amber-800 dark:text-amber-300">
                {t("agentSection.scopeDeliverWarn")}
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={scopeDelete}
              onChange={(e) => setScopeDelete(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0"
            />
            <span className="text-xs text-foreground leading-relaxed">
              <span className="font-medium">{t("agentSection.scopeDelete")}</span>
              <span className="block text-amber-800 dark:text-amber-300">
                {t("agentSection.scopeDeleteWarn")}
              </span>
            </span>
          </label>
          <p className="text-xs text-muted">{t("agentSection.scopesFixed")}</p>
        </fieldset>
        {atLimit && !formError && (
          <p className="text-xs text-muted">{t("agentSection.limitReached")}</p>
        )}
        {formError && (
          <p id="agent-token-error" role="alert" className="text-xs text-red-700 dark:text-red-400">
            {formError}
          </p>
        )}
      </form>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">
            {t("agentSection.activeCount")}
          </h3>
          {tokens && (
            <span className="text-xs text-muted">
              {tokens.length}/{max}
            </span>
          )}
        </div>

        {tokens === null && (
          <div className="flex items-center gap-2 text-sm text-muted" role="status">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            {t("agentSection.loading")}
          </div>
        )}

        {loadError && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 dark:border-red-800 px-3 py-2.5">
            <span role="alert" className="text-xs text-red-700 dark:text-red-400">
              {t("agentSection.loadError")}
            </span>
            <button
              type="button"
              onClick={() => void load()}
              className="text-xs font-medium text-foreground underline underline-offset-2 min-h-[44px]"
            >
              {t("agentSection.retry")}
            </button>
          </div>
        )}

        {tokens && tokens.length === 0 && !loadError && (
          <p className="text-sm text-muted">{t("agentSection.empty")}</p>
        )}

        {tokens && tokens.length > 0 && (
          <ul className="space-y-2">
            {tokens.map((tok) => (
              <li
                key={tok.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5"
              >
                <KeyRound className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {tok.label || "—"}
                  </p>
                  <p className="text-xs text-muted">
                    <span dir="ltr">{tok.maskedPrefix}</span>
                    {" · "}
                    {t("agentSection.createdAt")}{" "}
                    {new Date(tok.createdAt).toLocaleDateString("he-IL")}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted">
                      {t("agentSection.scopeBadgeDefault")}
                    </span>
                    {tok.scopes?.includes("deliver_to_me") && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                        {t("agentSection.scopeBadgeDeliver")}
                      </span>
                    )}
                    {tok.scopes?.includes("delete_tasks") && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                        {t("agentSection.scopeBadgeDelete")}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(tok.id)}
                  disabled={revokingId === tok.id}
                  aria-label={`${t("agentSection.revoke")}: ${tok.label ?? ""}`}
                  className="inline-flex items-center gap-1 px-3 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40 min-h-[44px]"
                >
                  {revokingId === tok.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {t("agentSection.revoke")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">
          {t("agentSection.auditTitle")}
        </h3>
        {audit.length === 0 ? (
          <p className="text-sm text-muted">{t("agentSection.auditEmpty")}</p>
        ) : (
          <ul className="space-y-1.5">
            {audit.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-border/60 px-3 py-2 text-xs text-foreground"
              >
                <span className="font-medium">
                  {a.action === "delete_task"
                    ? t("agentSection.auditDelete")
                    : t("agentSection.auditDeliver")}
                </span>
                {" · "}
                {t(`agentSection.audit${a.outcome.charAt(0).toUpperCase()}${a.outcome.slice(1)}`)}
                {a.detail ? ` · ${a.detail}` : ""}
                <span className="block text-muted">
                  {a.tokenLabel ? `${a.tokenLabel} · ` : ""}
                  {new Date(a.createdAt).toLocaleString("he-IL")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-border/50 pt-4">
        <h3 className="text-sm font-semibold text-foreground">{t("agentSection.howToTitle")}</h3>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">{t("agentSection.claudeTitle")}</p>
          <p className="text-xs text-muted">{t("agentSection.claudeHint")}</p>
          <CodeBlock
            text={claudeCmd}
            copyLabel={t("agentSection.copy")}
            copiedLabel={t("agentSection.copied")}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">{t("agentSection.httpTitle")}</p>
          <p className="text-xs text-muted">{t("agentSection.httpHint")}</p>
          <CodeBlock
            text={httpCmd}
            copyLabel={t("agentSection.copy")}
            copiedLabel={t("agentSection.copied")}
          />
        </div>

        <p className="text-xs text-muted">
          {t("agentSection.docsHint")}{" "}
          <a
            href="/api/agent/openapi.json"
            dir="ltr"
            className="underline underline-offset-2 text-foreground"
          >
            /api/agent/openapi.json
          </a>
        </p>
      </div>
    </div>
  );
}
