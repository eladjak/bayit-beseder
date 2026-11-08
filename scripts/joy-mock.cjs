/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local CommonJS mock server. */
// Loopback-only disposable Supabase stand-in for visual evidence. Never stores data.
const http = require("http");
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@example.invalid",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const household = "00000000-0000-4000-8000-000000000002";
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
let completed = false;
let empty = false;
const tasks = ["לשטוף כלים", "לקפל כביסה", "להוציא זבל"].map((title, i) => ({
  id: `00000000-0000-4000-8000-00000000001${i}`,
  household_id: household,
  title,
  description: null,
  status: "pending",
  priority: "medium",
  category: "cleaning",
  category_id: ["cat-kitchen", "cat-laundry", "cat-general"][i],
  assigned_to: user.id,
  due_date: today,
  recurring: "none",
  estimated_minutes: 15,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}));
const profile = {
  id: user.id,
  display_name: "נועה",
  avatar_url: null,
  points: 120,
  streak: 3,
  household_id: household,
  notification_preferences: null,
  whatsapp_phone: null,
  created_at: user.created_at,
  updated_at: user.created_at,
};
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/state") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ completed, empty }));
  }
  if (url.pathname === "/reset") {
    completed = false;
    empty = false;
    return res.end("ok");
  }
  if (url.pathname === "/empty") {
    empty = true;
    return res.end("ok");
  }
  if (url.pathname === "/auth/v1/user") {
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify(user));
  }
  let table = url.pathname.split("/").pop();
  let rows =
    table === "task_categories"
      ? [
          {
            id: "task-cat-kitchen",
            household_id: household,
            name: "מטבח",
            icon: "🍳",
            color: "#F59E0B",
            sort_order: 0,
          },
          {
            id: "task-cat-laundry",
            household_id: household,
            name: "כביסה",
            icon: "🧺",
            color: "#8B5CF6",
            sort_order: 1,
          },
          {
            id: "task-cat-general",
            household_id: household,
            name: "כללי",
            icon: "🏠",
            color: "#10B981",
            sort_order: 2,
          },
        ]
      : table === "categories"
        ? [
            { id: "cat-kitchen", name: "מטבח" },
            { id: "cat-laundry", name: "כביסה" },
            { id: "cat-general", name: "כללי" },
          ]
        : table === "profiles"
          ? [profile]
          : table === "households"
            ? [
                {
                  id: household,
                  name: "הבית שלנו",
                  invite_code: "DEMO-ONLY",
                  golden_rule_target: 80,
                  city: null,
                },
              ]
            : table === "tasks" && empty
              ? []
              : table === "tasks"
                ? tasks.map((t, i) => ({
                    ...t,
                    status: i === 0 && completed ? "completed" : "pending",
                  }))
                : table === "task_completions" && completed
                  ? [
                      {
                        id: "completion-1",
                        task_id: tasks[0].id,
                        completed_by: user.id,
                        user_id: user.id,
                        completed_at: new Date().toISOString(),
                      },
                    ]
                  : [];
  if (req.method === "POST" && table === "transition_task_completion") {
    completed = true;
    rows = [
      {
        id: "completion-1",
        task_id: tasks[0].id,
        completed_by: user.id,
        user_id: user.id,
        completed_at: new Date().toISOString(),
      },
    ];
  }
  if (req.method === "POST" && table === "task_completions") {
    completed = true;
    rows = [
      {
        id: "completion-1",
        task_id: tasks[0].id,
        completed_by: user.id,
        user_id: user.id,
        completed_at: new Date().toISOString(),
      },
    ];
  }
  if (req.method === "PATCH" && table === "tasks") completed = true;
  if (req.method === "DELETE" && table === "task_completions")
    completed = false;
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Range",
    `0-${Math.max(rows.length - 1, 0)}/${rows.length}`,
  );
  const single = (req.headers.accept || "").includes(
    "application/vnd.pgrst.object+json",
  );
  res.end(JSON.stringify(single ? rows[0] || null : rows));
});
server.listen(54329, "127.0.0.1", () => console.log("mock on 127.0.0.1:54329"));
