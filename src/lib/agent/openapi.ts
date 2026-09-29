/**
 * OpenAPI 3.1 description of the BayitBeSeder agent HTTP API.
 * Served (public, no auth: it is documentation) at /api/agent/openapi.json.
 * Keep in sync with src/app/api/agent/{capabilities,plan,brief,task,prep}/route.ts
 * and docs/AGENT-API.md.
 */

export const AGENT_API_ORIGIN = "https://www.bayitbeseder.com";

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

const commonErrors = {
  "401": errorResponse("Missing bearer token / חסר אסימון"),
  "403": errorResponse(
    "Bad token, token authorizes no household, or the token lacks the scope this action needs (deliver_to_me / delete_tasks) / אסימון שגוי, ללא משק בית, או ללא ההרשאה הנדרשת"
  ),
  "429": errorResponse("Rate limited / יותר מדי בקשות"),
  "503": errorResponse("Auth backend temporarily unavailable / שירות האימות אינו זמין"),
};

export function buildAgentOpenApi(origin: string = AGENT_API_ORIGIN) {
  return {
    openapi: "3.1.0",
    info: {
      title: "BayitBeSeder Agent API",
      summary: "Let an external agent manage one household's chores.",
      description:
        "HTTP API for external agents (Claude, Kami, OpenClaw...) to read and manage ONE household's tasks, weekly plan, daily brief and meal prep. " +
        "Every request needs a per-household bearer token created by a household member in the app (Settings → חיבור לסוכנים). " +
        "The token alone decides which household is acted on; any `householdId` in a request is ignored. " +
        "The same capabilities are also available as an MCP server at " +
        `${origin}/api/mcp (Streamable HTTP, same bearer token). ` +
        "Tokens carry scopes chosen at creation. Default: read + add/complete tasks. Opt-in (unchecked by default): " +
        "`deliver_to_me` (send the plan/brief/prep by WhatsApp ONLY to the phone of the member who created the token) and " +
        "`delete_tasks`. Both are two-step: the first call returns a preview and a single-use `confirm_token` (5 minutes, bound to the token, action and target); " +
        "the action happens only on a second call carrying it, and an agent must ask its human before making that call. " +
        "A call without the needed scope returns 403.",
      version: "1.2.0",
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: origin }],
    security: [{ householdToken: [] }],
    tags: [
      { name: "tasks", description: "Read, add and complete tasks (delete with the opt-in delete_tasks scope)" },
      { name: "planning", description: "Weekly plan, daily brief, meal prep" },
      { name: "meta", description: "Self-description" },
    ],
    paths: {
      "/api/agent/capabilities": {
        get: {
          operationId: "getCapabilities",
          tags: ["meta"],
          summary: "Self-describing capability manifest",
          responses: {
            "200": {
              description: "Manifest",
              content: { "application/json": { schema: { type: "object" } } },
            },
            ...commonErrors,
          },
        },
      },
      "/api/agent/task": {
        post: {
          operationId: "taskAction",
          tags: ["tasks"],
          summary: "List, add or complete a task",
          description:
            "`action` selects the operation: `list` returns tasks (default open ones), `add` creates a task (201), `complete` marks a pending/in-progress task completed, `delete` deletes a task (needs the delete_tasks scope; two-step: without confirm_token you only get a preview and a confirm_token, nothing is deleted).",
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/TaskRequest" } },
            },
          },
          responses: {
            "200": {
              description: "list / complete result",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "201": {
              description: "Task created (action=add)",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "400": errorResponse("Invalid parameters / פרמטרים לא תקינים"),
            "404": errorResponse("Task not found in this household"),
            "409": errorResponse("Task already completed or skipped, or (action=delete) the confirm_token was used, expired or does not match"),
            ...commonErrors,
          },
        },
      },
      "/api/agent/plan": {
        post: {
          operationId: "generateWeeklyPlan",
          tags: ["planning"],
          summary: "Generate a balanced weekly plan",
          requestBody: {
            required: false,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/PlanRequest" } },
            },
          },
          responses: {
            "200": {
              description:
                "{ plan, whatsappText, delivery }. With deliver=whatsapp and no confirm_token, delivery.requiresConfirmation is true and delivery.confirmToken is set: nothing was sent.",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "400": errorResponse("Invalid parameters, or the request names a recipient (not allowed)"),
            "409": errorResponse("deliver=whatsapp: confirm_token used, expired or mismatched, or no phone in the creator's profile"),
            ...commonErrors,
          },
        },
      },
      "/api/agent/brief": {
        get: {
          operationId: "getTodayBrief",
          tags: ["planning"],
          summary: "Today's brief (open tasks, overdue count, streak)",
          parameters: [
            {
              name: "deliver",
              in: "query",
              required: false,
              description:
                "`whatsapp` sends the text to the phone of the member who created the token, never to a caller-chosen recipient. Needs the deliver_to_me scope (else 403). Two-step: without confirm_token you get a preview and a confirm_token, nothing is sent.",
              schema: { type: "string", enum: ["whatsapp"] },
            },
            {
              name: "confirm_token",
              in: "query",
              required: false,
              description:
                "Second step of deliver=whatsapp: the single-use token from the preview. Only send it after your human approved the message.",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "{ date, tasks[], overdueCount, streak, whatsappText, delivery }",
              content: { "application/json": { schema: { type: "object" } } },
            },
            ...commonErrors,
          },
        },
      },
      "/api/agent/prep": {
        get: {
          operationId: "getTonightPrep",
          tags: ["planning"],
          summary: "What to defrost/prepare tonight",
          responses: {
            "200": {
              description: "Meal-prep plan for the next 36 hours",
              content: { "application/json": { schema: { type: "object" } } },
            },
            ...commonErrors,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        householdToken: {
          type: "http",
          scheme: "bearer",
          description:
            "Per-household agent token (prefix `bbs_agent_`). Created in the app: Settings → חיבור לסוכנים. Shown once at creation; revocable at any time.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
        },
        TaskRequest: {
          oneOf: [
            {
              type: "object",
              required: ["action"],
              properties: {
                action: { const: "list" },
                status: { type: "string", enum: ["pending", "in_progress", "completed", "all"] },
                limit: { type: "integer", minimum: 1, maximum: 50 },
              },
            },
            {
              type: "object",
              required: ["action", "title"],
              properties: {
                action: { const: "add" },
                title: { type: "string", minLength: 1, maxLength: 200 },
                due: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                assignee: { type: "string", maxLength: 100 },
                category: { type: "string", maxLength: 50 },
                difficulty: { type: "integer", enum: [1, 2, 3] },
              },
            },
            {
              type: "object",
              required: ["action", "taskId"],
              properties: {
                action: { const: "complete" },
                taskId: { type: "string", format: "uuid" },
                note: { type: "string", maxLength: 500 },
              },
            },
            {
              type: "object",
              required: ["action", "taskId"],
              description:
                "Needs the delete_tasks scope. Call once without confirm_token to get a preview and a confirm_token; call again WITH it (only after your human said yes) to delete.",
              properties: {
                action: { const: "delete" },
                taskId: { type: "string", format: "uuid" },
                confirm_token: { type: "string" },
              },
            },
          ],
        },
        PlanRequest: {
          type: "object",
          properties: {
            weekStart: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            zoneMode: { type: "boolean" },
            members: { type: "array", maxItems: 10, items: { type: "string", format: "uuid" } },
            deliver: {
              type: "string",
              enum: ["whatsapp"],
              description:
                "Needs the deliver_to_me scope. Sends only to the token creator's own phone. Two-step with confirm_token. Any field naming a recipient is rejected with 400.",
            },
            confirm_token: { type: "string" },
          },
        },
      },
    },
  };
}
