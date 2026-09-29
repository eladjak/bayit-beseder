/**
 * Minimal in-memory stand-in for the slice of the Supabase query builder the
 * agent routes use. Shared by the token-management and MCP tests. Not a
 * general fake: it implements exactly select/insert/update with
 * eq/neq/in/is/lt/order/limit/single/maybeSingle, which is what the code
 * under test calls. An unsupported call THROWS so a test cannot pass by
 * silently ignoring a filter.
 */

export type Row = Record<string, unknown>;

export interface FakeDb {
  tables: Record<string, Row[]>;
  /** Every insert/update, for assertions. */
  writes: Array<{ table: string; op: "insert" | "update"; row: Row }>;
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
    let op: "select" | "insert" | "update" = "select";
    let payload: Row = {};
    let orderBy: { col: string; asc: boolean } | null = null;
    let limitN: number | null = null;

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
      return out;
    };

    const builder: Record<string, unknown> = {
      select: () => builder,
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
      eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), builder),
      neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), builder),
      in: (c: string, v: unknown[]) => (filters.push((r) => v.includes(r[c])), builder),
      is: (c: string, v: unknown) =>
        (filters.push((r) => (r[c] ?? null) === v), builder),
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
        const rows = run();
        return rows[0]
          ? { data: rows[0], error: null }
          : { data: null, error: { message: "no rows" } };
      },
      maybeSingle: async () => {
        const rows = run();
        return { data: rows[0] ?? null, error: null };
      },
      then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
        Promise.resolve({ data: run(), error: null }).then(resolve),
    };
    return builder;
  }
  return { from };
}
