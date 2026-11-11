// Integration test: disposable, network-isolated Postgres only. Requires Docker and postgres:16-alpine.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";

it("applies and rolls back with household-isolated reads and no client writes", () => {
  const migration = readFileSync("supabase/migrations/029_ui_v2_households.sql", "utf8");
  const name = `f04-test-${randomUUID()}`;
  const docker = (...args: string[]) => execFileSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  const sql = (input: string) => execFileSync("docker", ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  try {
    docker("run", "-d", "--name", name, "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-alpine");
    let successes = 0;
    for (let i = 0; i < 400 && successes < 3; i++) {
      try { docker("exec", name, "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-Atc", "select 1"); successes++; } catch { successes = 0; }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300);
    }
    if (successes < 3) throw new Error("disposable Postgres did not start");
    sql(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE TABLE public.households (id uuid PRIMARY KEY);
      CREATE TABLE public.household_members (household_id uuid, user_id uuid);
      CREATE FUNCTION public.is_household_member(target_household_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM public.household_members WHERE household_id=target_household_id AND user_id=auth.uid()) $$;
      GRANT EXECUTE ON FUNCTION public.is_household_member(uuid) TO authenticated;
      INSERT INTO households VALUES ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002'), ('00000000-0000-0000-0000-000000000003');
      INSERT INTO household_members VALUES ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');`);
    sql(migration);
    sql(`INSERT INTO ui_v2_households (household_id) VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');`);
    const result = sql(`SET ROLE authenticated; SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001'; SELECT household_id FROM ui_v2_households;`);
    expect(result).toContain("00000000-0000-0000-0000-000000000001");
    expect(result).not.toContain("00000000-0000-0000-0000-000000000002");
    expect(() => sql(`SET ROLE authenticated; INSERT INTO ui_v2_households (household_id) VALUES ('00000000-0000-0000-0000-000000000003');`)).toThrow(/permission denied/);
    sql("DROP TABLE public.ui_v2_households;");
    expect(sql("SELECT to_regclass('public.ui_v2_households') IS NULL;")).toContain("t");
  } finally { try { docker("rm", "-f", name); } catch { /* container may not have started */ } }
}, 180000);
