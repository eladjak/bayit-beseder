/**
 * Minimal in-memory stand-in for the slice of the Supabase query builder the
 * agent routes use. Shared by the token-management, MCP and scope tests. Not a
 * general fake: it implements exactly select/insert/update/delete with
 * eq/neq/in/is/gt/lt/order/limit/single/maybeSingle, which is what the code
 * under test calls. An unsupported call THROWS so a test cannot pass by
 * silently ignoring a filter.
 */

export type Row = Record<string, unknown>;

export interface FakeDb {
  tables: Record<string, Row[]>;
  /** Every insert/update/delete, for assertions. */
  writes: Array<{ table: string; op: "insert" | "update" | "delete"; row: Row }>;
  /**
   * Simulates a migration that has not been applied: a select naming one of
   * these columns, or an insert/update writing one, fails the way PostgREST
   * does ("column ... does not exist").
   */
  missingColumns?: Record<string, string[]>;
  /** Tables that do not exist yet: every operation on them fails. */
  missingTables?: string[];
}

let idCounter = 0;
export function fakeUuid(): string {
  idCounter += 1;
  const hex = idCounter.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex}`;
}

export function createFakeDb(seed: Record<string, Row[]> = {}): FakeDb {
  const tables: Record<string, Row[]> = {};
  for (const [k, v] of Object.entries(seed)) tables[k] = v.map((r) => ({ ...r }));
  return { tables, writes: [] };
}

export function createFakeSupabase(db: FakeDb) {
  function from(table: string) {
    if (!db.tables[table]) db.tables[table] = [];
    type Filter = (r: Row) => boolean;
    const filters: Filter[] = [];
    let op: "select" | "insert" | "update" | "delete" = "select";
    let payload: Row = {};
    let selectCols = "";
    let orderBy: { col: string; asc: boolean } | null = null;
    let limitN: number | null = null;

    const failure = (): { message: string } | null => {
      if (db.missingTables?.includes(table)) {
        return { message: `relation "public.${table}" does not exist` };
      }
      const missing = db.missingColumns?.[table] ?? [];
      const touched =
        op === "insert" || op === "update" ? Object.keys(payload).join(",") : selectCols;
      const hit = missing.find((c) => new RegExp(`(^|[^a-z_])${c}([^a-z_]|$)`).test(touched));
      return hit ? { message: `column ${table}.${hit} does not exist` } : null;
    };

    const run = (): Row[] => {
      const matches = () => db.tables[table].filter((r) => filters.every((f) => f(r)));
      if (op === "insert") {
        const row: Row = {
          id: fakeUuid(),
          created_at: new Date().toISOString(),
          revoked_at: null,
          ...payload,
        };
        db.tables[table].push(row);
        db.writes.push({ table, op: "insert", row });
        return [row];
      }
      if (op === "delete") {
        const hit = matches();
        db.tables[table] = db.tables[table].filter((r) => !hit.includes(r));
        db.writes.push({ table, op: "delete", row: { count: hit.length } });
        return hit;
      }
      if (op === "update") {
        const hit = matches();
        for (const r of hit) Object.assign(r, payload);
        db.writes.push({ table, op: "update", row: payload });
        return hit;
      }
      let out = matches();
      if (orderBy) {
        const { col, asc } = orderBy;
        out = [...out].sort((a, b) => {
          const av = String(a[col] ?? "");
          const bv = String(b[col] ?? "");
          return asc ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (limitN !== null) out = out.slice(0, limitN);
      // Like PostgREST, return only the selected columns. Without this a
      // "column not there yet" fallback would still see the column's data.
      const cols = selectCols.split(",").map((c) => c.trim());
      if (cols.length > 0 && cols.every((c) => /^[a-z_0-9]+$/.test(c))) {
        out = out.map((r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]])));
      }
      return out;
    };

    const builder: Record<string, unknown> = {
      select: (cols?: string) => {
        if (cols) selectCols = cols;
        return builder;
      },
      insert: (row: Row) => {
        op = "insert";
        payload = row;
        return builder;
      },
      update: (row: Row) => {
        op = "update";
        payload = row;
        return builder;
      },
      delete: () => {
        op = "delete";
        return builder;
      },
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), builder),
      neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), builder),
      in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), builder),
      is: (c: string, v: unknown) =>
        (filters.push((r) => (r[c] ?? null) === v), builder),
      gt: (c: string, v: unknown) =>
        (filters.push((r) => String(r[c]) > String(v)), builder),
      lt: (c: string, v: unknown) =>
        (filters.push((r) => String(r[c]) < String(v)), builder),
      order: (col: string, o?: { ascending?: boolean }) => {
        orderBy = { col, asc: o?.ascending !== false };
        return builder;
      },
      limit: (n: number) => {
        limitN = n;
        return builder;
      },
      single: async () => {
        const err = failure();
        if (err) return { data: null, error: err };
        const rows = run();
        return rows[0]
          ? { data: rows[0], error: null }
          : { data: null, error: { message: "no rows" } };
      },
      maybeSingle: async () => {
        const err = failure();
        if (err) return { data: null, error: err };
        const rows = run();
        return { data: rows[0] ?? null, error: null };
      },
      then: (
        resolve: (v: { data: Row[] | null; error: { message: string } | null }) => unknown
      ) => {
        const err = failure();
        return Promise.resolve(
          err ? { data: null, error: err } : { data: run(), error: null }
        ).then(resolve);
      },
    };
    return builder;
  }
  return { from };
}
