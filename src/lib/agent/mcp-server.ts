/**
 * MCP server for BayitBeSeder (served at /api/mcp).
 *
 * Every tool is a THIN ADAPTER over the existing /api/agent/* route handlers:
 * it builds a request carrying the caller's own `Authorization` header and
 * invokes the real handler in-process. So the business logic, validation,
 * rate limits and — crucially — household scoping live in exactly one place.
 * The household is always resolved from the bearer token by the route;
 * no tool accepts a `householdId`, and none forwards one.
 *
 * Deliberately NOT exposed: the `deliver: "whatsapp"` option. That sends a
 * message to a person (the owner's number) and must never be triggerable by a
 * household's agent via MCP.
 */
import { NextRequest } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { POST as taskRoute } from "@/app/api/agent/task/route";
import { POST as planRoute } from "@/app/api/agent/plan/route";
import { GET as briefRoute } from "@/app/api/agent/brief/route";
import { GET as prepRoute } from "@/app/api/agent/prep/route";

export const MCP_SERVER_INFO = { name: "bayit-beseder", version: "1.0.0" } as const;

export interface McpCallContext {
  /** Absolute origin of this deployment, e.g. https://www.bayitbeseder.com */
  origin: string;
  /** The caller's `Authorization` header, verbatim. */
  authorization: string;
  /** Caller IP (x-forwarded-for) so per-IP rate limits stay per-caller. */
  forwardedFor: string | null;
}

type RouteHandler = (req: NextRequest) => Promise<Response>;

function buildRequest(
  ctx: McpCallContext,
  method: "GET" | "POST",
  path: string,
  body?: unknown
): NextRequest {
  const headers: Record<string, string> = { authorization: ctx.authorization };
  if (ctx.forwardedFor) headers["x-forwarded-for"] = ctx.forwardedFor;
  if (body !== undefined) headers["content-type"] = "application/json";
  return new NextRequest(new URL(path, ctx.origin), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function invoke(handler: RouteHandler, req: NextRequest) {
  let res: Response;
  try {
    res = await handler(req);
  } catch {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "שגיאה פנימית / Internal error" }],
    };
  }
  const text = await res.text();
  let pretty = text;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // Not JSON: return as-is.
  }
  return { isError: !res.ok, content: [{ type: "text" as const, text: pretty }] };
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

/** Build a fresh McpServer bound to one authenticated request. */
export function createBayitMcpServer(ctx: McpCallContext): McpServer {
  const server = new McpServer(MCP_SERVER_INFO);

  server.registerTool(
    "list_tasks",
    {
      title: "רשימת משימות / List tasks",
      description:
        "מחזיר את משימות משק הבית (ברירת מחדל: פתוחות). / Returns the household's tasks (default: open ones).",
      inputSchema: {
        status: z
          .enum(["pending", "in_progress", "completed", "all"])
          .optional()
          .describe("סינון לפי סטטוס. ברירת מחדל: פתוחות / Status filter. Default: open"),
        limit: z.number().int().min(1).max(50).optional().describe("עד 50 / max 50"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ status, limit }) =>
      invoke(
        taskRoute,
        buildRequest(ctx, "POST", "/api/agent/task", { action: "list", status, limit })
      )
  );

  server.registerTool(
    "add_task",
    {
      title: "הוספת משימה / Add a task",
      description:
        "מוסיף משימה חדשה למשק הבית של החיבור. / Adds a new task to the household this connection belongs to.",
      inputSchema: {
        title: z.string().min(1).max(200).describe("כותרת המשימה / Task title"),
        due: isoDate.optional().describe("תאריך יעד YYYY-MM-DD, ברירת מחדל היום / Due date, default today"),
        assignee: z.string().min(1).max(100).optional().describe("שם בן/בת הבית / Member display name"),
        category: z.string().min(1).max(50).optional().describe("קטגוריה, למשל kitchen / Category key"),
        difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().describe("קושי 1-3 / Difficulty 1-3"),
      },
    },
    async ({ title, due, assignee, category, difficulty }) =>
      invoke(
        taskRoute,
        buildRequest(ctx, "POST", "/api/agent/task", {
          action: "add",
          title,
          due,
          assignee,
          category,
          difficulty,
        })
      )
  );

  server.registerTool(
    "complete_task",
    {
      title: "סימון משימה כהושלמה / Complete a task",
      description:
        "מסמן משימה פתוחה כהושלמה ומעניק נקודות. / Marks an open task completed and awards points.",
      inputSchema: {
        taskId: z.string().uuid().describe("מזהה המשימה (מ-list_tasks) / Task id from list_tasks"),
        note: z.string().max(500).optional().describe("הערה אופציונלית / Optional note"),
      },
    },
    async ({ taskId, note }) =>
      invoke(
        taskRoute,
        buildRequest(ctx, "POST", "/api/agent/task", { action: "complete", taskId, note })
      )
  );

  server.registerTool(
    "weekly_plan",
    {
      title: "תוכנית שבועית / Weekly plan",
      description:
        "מייצר תוכנית שבועית מאוזנת ומחזיר JSON וגם טקסט מוכן לשליחה. לא שולח הודעות. / Generates a balanced weekly plan; returns JSON plus ready-to-send text. Sends nothing.",
      inputSchema: {
        weekStart: isoDate.optional().describe("תחילת השבוע YYYY-MM-DD / Week start"),
        zoneMode: z.boolean().optional().describe("קיבוץ לפי חדרי הבית / Group by home zones"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ weekStart, zoneMode }) =>
      invoke(
        planRoute,
        buildRequest(ctx, "POST", "/api/agent/plan", { weekStart, zoneMode })
      )
  );

  server.registerTool(
    "daily_brief",
    {
      title: "סיכום היום / Today's brief",
      description:
        "סיכום היום: משימות פתוחות, באיחור ורצף. לא שולח הודעות. / Today's open tasks, overdue count and streak. Sends nothing.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => invoke(briefRoute, buildRequest(ctx, "GET", "/api/agent/brief"))
  );

  server.registerTool(
    "tonight_prep",
    {
      title: "מה להפשיר הערב / Tonight's meal prep",
      description:
        "מה להפשיר ולהכין הערב לפי תוכנית הארוחות של 36 השעות הקרובות. / What to defrost/prepare tonight for the next 36h of planned meals.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => invoke(prepRoute, buildRequest(ctx, "GET", "/api/agent/prep"))
  );

  return server;
}
