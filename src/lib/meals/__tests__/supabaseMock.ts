/**
 * A minimal, deliberately-not-a-real-database mock of the Supabase JS client
 * used by all meal-planner API route tests. It does NOT implement real
 * filtering (`.eq()` etc. are recorded but not applied) — each table simply
 * returns whatever rows the test pre-seeded for it. That's enough to test
 * OUR route logic and wiring without ever touching production Supabase,
 * which is exactly what's forbidden here.
 */
export interface MockCall {
  table: string;
  op: string;
  args: unknown[];
}

export interface SupabaseMockOptions {
  userId?: string;
  authError?: boolean;
}

export function makeSupabaseMock(
  responses: Record<string, unknown[]>,
  options: SupabaseMockOptions = {}
) {
  const calls: MockCall[] = [];
  const inserted: Record<string, unknown[]> = {};

  function builder(table: string) {
    let mode: "select" | "insert" | "update" | "upsert" = "select";
    let payloadRows: unknown[] = [];

    const chain = {
      select: (...args: unknown[]) => {
        calls.push({ table, op: "select", args });
        return chain;
      },
      insert: (rows: unknown) => {
        mode = "insert";
        payloadRows = Array.isArray(rows) ? rows : [rows];
        calls.push({ table, op: "insert", args: [rows] });
        return chain;
      },
      update: (vals: unknown) => {
        mode = "update";
        calls.push({ table, op: "update", args: [vals] });
        return chain;
      },
      upsert: (rows: unknown, opts?: unknown) => {
        mode = "upsert";
        payloadRows = Array.isArray(rows) ? rows : [rows];
        calls.push({ table, op: "upsert", args: [rows, opts] });
        return chain;
      },
      eq: (...args: unknown[]) => {
        calls.push({ table, op: "eq", args });
        return chain;
      },
      neq: (...args: unknown[]) => {
        calls.push({ table, op: "neq", args });
        return chain;
      },
      gte: (...args: unknown[]) => {
        calls.push({ table, op: "gte", args });
        return chain;
      },
      lte: (...args: unknown[]) => {
        calls.push({ table, op: "lte", args });
        return chain;
      },
      lt: (...args: unknown[]) => {
        calls.push({ table, op: "lt", args });
        return chain;
      },
      gt: (...args: unknown[]) => {
        calls.push({ table, op: "gt", args });
        return chain;
      },
      in: (...args: unknown[]) => {
        calls.push({ table, op: "in", args });
        return chain;
      },
      not: (...args: unknown[]) => {
        calls.push({ table, op: "not", args });
        return chain;
      },
      order: (...args: unknown[]) => {
        calls.push({ table, op: "order", args });
        return chain;
      },
      limit: (...args: unknown[]) => {
        calls.push({ table, op: "limit", args });
        return chain;
      },
      single: () => resolveOne(true),
      maybeSingle: () => resolveOne(false),
      then: (
        resolve: (v: { data: unknown; error: null; count: number }) => void,
        reject: (e: unknown) => void
      ) => resolveMany().then(resolve, reject),
    };

    async function resolveMany() {
      if (mode === "insert" || mode === "upsert") {
        (responses[table] ??= []).push(...payloadRows);
        (inserted[table] ??= []).push(...payloadRows);
        return { data: payloadRows, error: null, count: payloadRows.length };
      }
      if (mode === "update") {
        return { data: null, error: null, count: 0 };
      }
      const rows = responses[table] ?? [];
      return { data: rows, error: null, count: rows.length };
    }

    async function resolveOne(required: boolean) {
      if (mode === "insert") {
        (responses[table] ??= []).push(...payloadRows);
        (inserted[table] ??= []).push(...payloadRows);
        return { data: payloadRows[0] ?? null, error: null };
      }
      const rows = responses[table] ?? [];
      const row = rows[0] ?? null;
      if (!row && required) {
        return { data: null, error: { message: `not found in ${table}` } };
      }
      return { data: row, error: null };
    }

    return chain;
  }

  return {
    auth: {
      getUser: async () =>
        options.authError
          ? { data: { user: null }, error: { message: "unauthorized" } }
          : { data: { user: { id: options.userId ?? "user-1" } }, error: null },
    },
    from: (table: string) => builder(table),
    __calls: calls,
    __inserted: inserted,
    __responses: responses,
  };
}

export type SupabaseMock = ReturnType<typeof makeSupabaseMock>;
