import { Result } from "better-result"

/**
 * בית בסדר (BayitBeSeder) agent client — Kami's bridge into the household app.
 *
 * Calls the Bearer-secured Agent API on bayitbeseder.com so Elad can operate
 * the house from WhatsApp without opening the UI:
 *   "מה יש היום בבית?"        → GET  /api/agent/brief
 *   "תוסיף משימה: לתלות כביסה" → POST /api/agent/task {action:"add"}
 *   "סיימתי את הכביסה"         → POST /api/agent/task {list → match → complete}
 *   "תכין תוכנית שבועית לבית"  → POST /api/agent/plan
 *
 * Env (see /opt/elad-personal-agent/.env):
 *   BAYIT_AGENT_KEY    — bearer token; the SAME key as bayit-beseder's own
 *                        `BAYIT_AGENT_KEY` (source of truth: bayit-beseder repo
 *                        `.env.local` + Vercel project env). Do NOT mint new ones.
 *   BAYIT_HOUSEHOLD_ID — Elad+Inbal household UUID (scopes reads/writes).
 *   BAYIT_API_URL      — optional, defaults to https://www.bayitbeseder.com
 *
 * Design notes:
 * - NEVER passes deliver:"whatsapp" — Kami itself is the WhatsApp channel, and
 *   double-delivery would message Elad twice. Kami forwards `whatsappText`.
 * - Personal-chat only (wired in message-router handlePersonalMessage), so the
 *   groups gate (@g.us reply-only-on-mention) is untouched by design.
 * - Fails soft: any error becomes a short honest Hebrew line, never a crash.
 */

const DEFAULT_BASE_URL = "https://www.bayitbeseder.com"
const REQUEST_TIMEOUT_MS = 15_000

export type BayitTask = {
  readonly id: string
  readonly title: string
  readonly status: string
  readonly dueDate: string | null
  readonly assignedTo: string | null
  readonly points: number
}

export type BayitIntent =
  | { readonly kind: "brief" }
  | { readonly kind: "plan" }
  | { readonly kind: "add"; readonly title: string }
  | { readonly kind: "complete"; readonly query: string }

export type BayitCompleteOutcome =
  | { readonly matched: true; readonly text: string }
  | { readonly matched: false }

export type BayitClient = {
  readonly getBrief: () => Promise<Result<string, Error>>
  readonly listOpenTasks: () => Promise<Result<readonly BayitTask[], Error>>
  readonly addTask: (title: string) => Promise<Result<string, Error>>
  readonly completeByTitle: (query: string) => Promise<Result<BayitCompleteOutcome, Error>>
  readonly weeklyPlan: () => Promise<Result<string, Error>>
}

// ── Intent detection (deterministic, pre-LLM) ────────────────────────────────
// Conservative patterns: require an explicit "home"/"task" word so ordinary
// conversation never routes here. "complete" is looser but is GATED on an
// actual open-task title match — no match → the router falls through to AI.

const BRIEF_PATTERNS: readonly RegExp[] = [
  /מה\s+(יש|קורה|המצב|מתוכנן)\s+(לנו\s+)?(היום\s+|הערב\s+|מחר\s+)?בבית\b/,
  /^מה\s+יש\s+היום\s+בבית/,
  /^(ה)?משימות\s+(של\s+)?הבית\b/,
  /^בריף\s+(של\s+)?(ה)?בית/,
  /^בית\s+בסדר[:,]?\s*(מה\s+יש|סטטוס|בריף|מה\s+המצב)/,
]

// NOTE: Hebrew FINAL letters matter — "תוסיף" ends with ף (final pe), the
// feminine "תוסיפי" uses regular פ. Match both explicitly.
const ADD_PATTERNS: readonly RegExp[] = [
  /^תוסי(?:ף|פי)\s+(?:לי\s+|לנו\s+)?משימה(?:\s+לבית)?\s*[:,-]?\s+(.+)$/,
  /^משימה\s+חדשה(?:\s+לבית)?\s*[:,-]?\s+(.+)$/,
  /^תוסי(?:ף|פי)\s+לבית\s*[:,-]?\s+(.+)$/,
]

const COMPLETE_PATTERNS: readonly RegExp[] = [
  /^סיימתי\s+(?:את\s+)?(.+)$/,
  /^ביצעתי\s+(?:את\s+)?(.+)$/,
  /^בוצע\s*[:,-]?\s*(.+)$/,
]

const PLAN_PATTERNS: readonly RegExp[] = [
  /תוכנית\s+שבועית\s+(לבית|של\s+הבית)/,
  /^(?:תכ(?:ין|יני)|תכנ(?:ן|ני)|תבנ[הי])\s+(?:לי\s+|לנו\s+)?(?:את\s+)?(?:ה)?שבוע\s+בבית/,
]

export const detectBayitIntent = (rawText: string): BayitIntent | null => {
  const text = rawText.trim()
  if (text.length === 0 || text.length > 300) return null

  if (PLAN_PATTERNS.some((r) => r.test(text))) return { kind: "plan" }
  if (BRIEF_PATTERNS.some((r) => r.test(text))) return { kind: "brief" }

  for (const pattern of ADD_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const title = (m[m.length - 1] ?? "").trim()
      if (title.length > 0 && title.length <= 200) return { kind: "add", title }
    }
  }

  for (const pattern of COMPLETE_PATTERNS) {
    const m = text.match(pattern)
    if (m) {
      const query = (m[1] ?? "").trim()
      // Keep it plausible as a task title; long sentences are conversation.
      if (query.length >= 2 && query.length <= 80) return { kind: "complete", query }
    }
  }

  return null
}

// ── Title matching for "סיימתי את X" ─────────────────────────────────────────

const normalizeHebrew = (s: string): string =>
  s
    .replace(/["'״׳.,!?:;()\-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()

const stripLeadingHe = (s: string): string => s.replace(/^(את\s+)?ה/, "")

/** Best open-task match: exact > contains > word-overlap. Null when nothing plausible. */
export const matchTaskByTitle = (
  tasks: readonly BayitTask[],
  query: string,
): BayitTask | null => {
  const q = normalizeHebrew(query)
  const qBare = stripLeadingHe(q)
  if (qBare.length < 2) return null

  let best: BayitTask | null = null
  let bestScore = 0
  for (const task of tasks) {
    const t = normalizeHebrew(task.title)
    const tBare = stripLeadingHe(t)
    let score = 0
    if (t === q || tBare === qBare) score = 100
    else if (t.includes(qBare) || qBare.includes(tBare)) score = 80
    else {
      const qWords = new Set(qBare.split(" ").filter((w) => w.length > 1))
      const tWords = tBare.split(" ").filter((w) => w.length > 1)
      const overlap = tWords.filter((w) => qWords.has(w)).length
      if (overlap > 0 && overlap >= Math.ceil(tWords.length / 2)) score = 40 + overlap
    }
    if (score > bestScore) {
      bestScore = score
      best = task
    }
  }
  return bestScore >= 40 ? best : null
}

// ── HTTP client ──────────────────────────────────────────────────────────────

export const createBayitClient = (): BayitClient | undefined => {
  const apiKey = process.env.BAYIT_AGENT_KEY?.trim()
  const householdId = process.env.BAYIT_HOUSEHOLD_ID?.trim()
  const baseUrl = (process.env.BAYIT_API_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "")

  if (!apiKey) {
    console.info("[bayit-client] BAYIT_AGENT_KEY not set — bayit integration disabled")
    return undefined
  }
  if (!householdId) {
    console.warn("[bayit-client] BAYIT_HOUSEHOLD_ID not set — brief/list would be UNSCOPED; disabling writes-capable client")
    return undefined
  }

  const call = async (
    path: string,
    init?: { readonly method?: "GET" | "POST"; readonly body?: unknown },
  ): Promise<Result<Record<string, unknown>, Error>> => {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const response = await fetch(`${baseUrl}${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
        signal: controller.signal,
      })
      clearTimeout(timer)
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
      if (!response.ok) {
        const message = typeof data.error === "string" ? data.error : `HTTP ${response.status}`
        return Result.err(new Error(`bayit API ${path} failed: ${message}`))
      }
      return Result.ok(data)
    } catch (err) {
      const message = err instanceof Error && err.name === "AbortError"
        ? `bayit API ${path} timeout after ${REQUEST_TIMEOUT_MS}ms`
        : `bayit API ${path} error: ${String(err)}`
      return Result.err(new Error(message))
    }
  }

  const getBrief = async (): Promise<Result<string, Error>> => {
    const res = await call(`/api/agent/brief?householdId=${householdId}`)
    if (res.isErr()) return Result.err(res.error)
    const text = res.value.whatsappText
    if (typeof text === "string" && text.length > 0) return Result.ok(text)
    return Result.err(new Error("bayit brief returned no whatsappText"))
  }

  const listOpenTasks = async (): Promise<Result<readonly BayitTask[], Error>> => {
    const res = await call("/api/agent/task", {
      method: "POST",
      body: { action: "list", householdId, limit: 50 },
    })
    if (res.isErr()) return Result.err(res.error)
    const tasks = Array.isArray(res.value.tasks) ? (res.value.tasks as BayitTask[]) : []
    return Result.ok(tasks)
  }

  const addTask = async (title: string): Promise<Result<string, Error>> => {
    const res = await call("/api/agent/task", {
      method: "POST",
      body: { action: "add", householdId, title: title.slice(0, 200) },
    })
    if (res.isErr()) return Result.err(res.error)
    const task = res.value.task as { title?: string } | undefined
    return Result.ok(`נוספה משימה לבית בסדר: "${task?.title ?? title}" ✅`)
  }

  const completeByTitle = async (
    query: string,
  ): Promise<Result<BayitCompleteOutcome, Error>> => {
    const listRes = await listOpenTasks()
    if (listRes.isErr()) return Result.err(listRes.error)
    const match = matchTaskByTitle(listRes.value, query)
    if (!match) return Result.ok({ matched: false })

    const res = await call("/api/agent/task", {
      method: "POST",
      body: { action: "complete", householdId, taskId: match.id },
    })
    if (res.isErr()) return Result.err(res.error)
    const message = typeof res.value.message === "string"
      ? res.value.message
      : `✅ משימה הושלמה: "${match.title}"`
    return Result.ok({ matched: true, text: message })
  }

  const weeklyPlan = async (): Promise<Result<string, Error>> => {
    const res = await call("/api/agent/plan", {
      method: "POST",
      body: { householdId },
    })
    if (res.isErr()) return Result.err(res.error)
    const text = res.value.whatsappText
    if (typeof text === "string" && text.length > 0) return Result.ok(text)
    return Result.err(new Error("bayit plan returned no whatsappText"))
  }

  console.info(`[bayit-client] enabled (base=${baseUrl}, household=${householdId.slice(0, 8)}…)`)
  return { getBrief, listOpenTasks, addTask, completeByTitle, weeklyPlan }
}
