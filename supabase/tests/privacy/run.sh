#!/usr/bin/env bash
# Database tests for the privacy gate (migrations 026 and 027), against a REAL
# throwaway Postgres. Nothing here touches Supabase or any shared database.
#
#   bash supabase/tests/privacy/run.sh            # starts and removes its own docker container
#   PGHOST=... PGUSER=postgres bash ... run.sh    # uses a server you provide (CI service)
#
# It builds the real Bayit schema (supabase/migration.sql + migrations 001..026)
# on a stand-in for Supabase auth, adds a stand-in for the events app that shares
# the database, and then proves:
#   * consent row-level security with two users and an anonymous role (30_*),
#   * migration 026 is a no-op when re-run, and its rollback removes exactly what it added,
#   * account deletion never damages the other app (20_*), is atomic, and is race-free.
# Each guarantee also runs against a deliberately broken ("mutant") version and
# must FAIL there; a test that cannot fail proves nothing.
set -uo pipefail
cd "$(dirname "$0")/../../.."
HERE=supabase/tests/privacy
FAILED=0

MODE=docker
if [ -n "${PGHOST:-}" ]; then MODE=external; fi
CONTAINER="bayit-privacy-test-$$-$(date +%s)"
cleanup() { if [ "$MODE" = docker ]; then docker rm -f "$CONTAINER" >/dev/null 2>&1; fi; }
trap cleanup EXIT

if [ "$MODE" = docker ]; then
  docker run -d --rm --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
  for _ in $(seq 1 100); do docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 0.3; done
  docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1 || { echo "PostgreSQL did not start" >&2; exit 2; }
fi

# psql wrapper: reads the SQL from stdin (-f -) so the same code works for docker and external servers.
sql() { # usage: sql <db> [psql args...] < file
  local db="$1"; shift
  if [ "$MODE" = docker ]; then docker exec -i "$CONTAINER" psql -X -q -U postgres -d "$db" "$@"; else psql -X -q -d "$db" "$@"; fi
}
admin() { if [ "$MODE" = docker ]; then docker exec -i "$CONTAINER" psql -X -q -U postgres -d postgres "$@"; else psql -X -q -d postgres "$@"; fi; }

# Errors that the real migration chain is KNOWN to produce on a fresh database
# (the live database drifted from the files; these are not ours to fix here).
ALLOWED='already exists|column h\.created_by does not exist'

apply_file() { # apply_file <db> <file> : fails the run on any error that is not in ALLOWED
  local out
  out=$(sql "$1" -v ON_ERROR_STOP=0 -f - < "$2" 2>&1 | grep -E 'ERROR' | grep -vE "$ALLOWED" || true)
  if [ -n "$out" ]; then echo "UNEXPECTED ERROR applying $2: $out" >&2; exit 2; fi
}

build_db() { # build_db <name> <last-migration-prefix-to-apply, e.g. 025|026|027> [mutant027]
  local db="$1" upto="$2"
  admin -c "DROP DATABASE IF EXISTS $db" -c "CREATE DATABASE $db"
  sql "$db" -v ON_ERROR_STOP=1 -f - < $HERE/00_supabase_stub.sql >/dev/null 2>&1 || { echo "stub failed" >&2; exit 2; }
  apply_file "$db" supabase/migration.sql
  for f in supabase/migrations/0*.sql; do
    n=$(basename "$f"); p=${n%%_*}
    if [ "$p" -le "$upto" ] 2>/dev/null && [ "$p" != 027 ]; then apply_file "$db" "$f"; fi
  done
  sql "$db" -v ON_ERROR_STOP=1 -f - < $HERE/10_events_app_fixture.sql >/dev/null
  if [ "$upto" -ge 027 ]; then
    if [ -n "${3:-}" ]; then
      apply_file "$db" "$3"
    else
      apply_file "$db" supabase/migrations/027_bayit_delete_account.sql
    fi
  fi
}

snapshot() { # snapshot <db> : everything in public that a migration could add or change
  sql "$1" -At -f - <<'SQL'
SELECT 'table ' || c.relname || ' rls=' || c.relrowsecurity FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p')
UNION ALL SELECT 'policy ' || tablename || '.' || policyname || ' ' || cmd || ' ' || coalesce(qual,'') || ' ' || coalesce(with_check,'') FROM pg_policies WHERE schemaname = 'public'
UNION ALL SELECT 'column ' || table_name || '.' || column_name || ' ' || data_type || ' ' || is_nullable || ' ' || coalesce(column_default,'') FROM information_schema.columns WHERE table_schema = 'public'
UNION ALL SELECT 'constraint ' || conrelid::regclass || ' ' || conname || ' ' || pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace = 'public'::regnamespace
UNION ALL SELECT 'index ' || indexname || ' ' || indexdef FROM pg_indexes WHERE schemaname = 'public'
UNION ALL SELECT 'function ' || p.oid::regprocedure::text FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
UNION ALL SELECT 'grant ' || table_name || ' ' || grantee || ' ' || privilege_type FROM information_schema.role_table_grants WHERE table_schema = 'public'
ORDER BY 1;
SQL
}

pass() { echo "  PASS  $1"; }
fail() { echo "  FAIL  $1"; FAILED=1; }
expect_assertion_failure() { # expect_assertion_failure <label> [expected text] : red must come from OUR assertion, and the one we predicted
  if [ -n "${2:-}" ] && ! echo "$LAST" | grep -m1 'ASSERT FAILED' | grep -q "$2"; then fail "$1 failed, but not where predicted ($2): $(echo "$LAST" | grep -m1 'ASSERT FAILED')"; return; fi
  if echo "$LAST" | grep -q 'ASSERT FAILED'; then pass "$1: $(echo "$LAST" | grep -m1 'ASSERT FAILED' | sed 's/.*ASSERT FAILED: //')"; else fail "$1 failed for the WRONG reason (a crash, not an assertion): $(echo "$LAST" | grep -m1 ERROR)"; fi
}
run_sql_test() { # run_sql_test <db> <file> -> 0 when every assertion held
  local out; out=$(sql "$1" -v ON_ERROR_STOP=1 -f - < "$2" 2>&1); local rc=$?
  PASSES=$(echo "$out" | grep -c 'PASS ' || true)
  LAST="$out"
  return $rc
}

echo "== 1. migration 026: consent row-level security (two users + anonymous) =="
build_db t026 026
if run_sql_test t026 $HERE/30_consent_rls_test.sql; then pass "30_consent_rls_test.sql ($PASSES assertions)"; else fail "consent RLS"; echo "$LAST" | tail -15; fi

echo "== 1b. the same test must FAIL against a mutant (RLS switched off) =="
build_db t026m 026
sql t026m -v ON_ERROR_STOP=1 -c "ALTER TABLE public.privacy_consents DISABLE ROW LEVEL SECURITY" >/dev/null
if run_sql_test t026m $HERE/30_consent_rls_test.sql; then fail "mutant with RLS off was NOT detected"; else expect_assertion_failure "mutant with RLS off is detected"; fi

echo "== 2. migration 026 is a no-op when re-run =="
build_db t026r 026
sql t026r -c "INSERT INTO auth.users (id,email) VALUES ('c0000000-0000-0000-0000-00000000000c','c@t.test')" -c "INSERT INTO public.privacy_consents (user_id,policy_version,age_confirmed,privacy_accepted,terms_accepted) VALUES ('c0000000-0000-0000-0000-00000000000c','v1',true,true,true)"
snapshot t026r > /tmp/bayit-priv-$$-before.txt
ROWS_BEFORE=$(sql t026r -At -c "SELECT count(*) FROM public.privacy_consents")
sql t026r -v ON_ERROR_STOP=1 -f - < supabase/migrations/026_privacy_consent.sql >/dev/null 2>&1; RC=$?
snapshot t026r > /tmp/bayit-priv-$$-after.txt
ROWS_AFTER=$(sql t026r -At -c "SELECT count(*) FROM public.privacy_consents")
if [ $RC -eq 0 ] && diff -q /tmp/bayit-priv-$$-before.txt /tmp/bayit-priv-$$-after.txt >/dev/null && [ "$ROWS_BEFORE" = "$ROWS_AFTER" ] && [ "$ROWS_AFTER" = 1 ]; then pass "second run: no error, identical schema ($(wc -l < /tmp/bayit-priv-$$-after.txt) catalog lines), data kept"; else fail "re-run changed something"; diff /tmp/bayit-priv-$$-before.txt /tmp/bayit-priv-$$-after.txt | head; fi

echo "== 3. rollback of 026 removes exactly what 026 added =="
build_db t025 025
snapshot t025 > /tmp/bayit-priv-$$-s025.txt
sql t025 -v ON_ERROR_STOP=1 -f - < supabase/migrations/026_privacy_consent.sql >/dev/null 2>&1
snapshot t025 > /tmp/bayit-priv-$$-s026.txt
ADDED=$(diff /tmp/bayit-priv-$$-s025.txt /tmp/bayit-priv-$$-s026.txt | grep -c '^>' || true)
sql t025 -v ON_ERROR_STOP=1 -f - < supabase/rollbacks/026_privacy_consent_rollback.sql >/dev/null 2>&1; RC=$?
snapshot t025 > /tmp/bayit-priv-$$-sback.txt
if [ $RC -eq 0 ] && [ "$ADDED" -gt 0 ] && diff -q /tmp/bayit-priv-$$-s025.txt /tmp/bayit-priv-$$-sback.txt >/dev/null; then pass "after rollback the schema is identical to before 026 ($ADDED catalog lines were added and all removed)"; else fail "rollback is not exact"; diff /tmp/bayit-priv-$$-s025.txt /tmp/bayit-priv-$$-sback.txt | head; fi
echo "   (mutant: a rollback that leaves the table behind must be detected by the same comparison)"
sql t025 -v ON_ERROR_STOP=1 -f - < supabase/migrations/026_privacy_consent.sql >/dev/null 2>&1
sql t025 -c 'DROP POLICY IF EXISTS "bayit_consent_insert_own" ON public.privacy_consents' -c 'DROP POLICY IF EXISTS "bayit_consent_select_own" ON public.privacy_consents' >/dev/null 2>&1
snapshot t025 > /tmp/bayit-priv-$$-smut.txt
if diff -q /tmp/bayit-priv-$$-s025.txt /tmp/bayit-priv-$$-smut.txt >/dev/null; then fail "an incomplete rollback was NOT detected"; else pass "an incomplete rollback (policies only) is detected"; fi

echo "== 4. migration 027: delete my account never damages the events app =="
build_db t027 027
if run_sql_test t027 $HERE/20_delete_account_test.sql; then pass "20_delete_account_test.sql ($PASSES assertions)"; else fail "delete account"; echo "$LAST" | tail -15; fi

echo "== 4b. the same test must FAIL against a mutant that always deletes the auth user =="
sed 's/IF cardinality(v_blockers) = 0 THEN/IF true THEN/' supabase/migrations/027_bayit_delete_account.sql > /tmp/bayit-priv-$$-mutant027.sql
if cmp -s /tmp/bayit-priv-$$-mutant027.sql supabase/migrations/027_bayit_delete_account.sql; then fail "mutant was not applied (sed matched nothing)"; fi
build_db t027m 027 /tmp/bayit-priv-$$-mutant027.sql
if run_sql_test t027m $HERE/20_delete_account_test.sql; then fail "mutant that deletes the shared auth user was NOT detected"; else expect_assertion_failure "mutant that deletes the shared auth user is detected"; fi

echo "== 4c. each way of finding the other app's data must be needed (mutants: catalog foreign-key scan off / person-column scan off) =="
sed "s/WHERE k.contype = 'f' AND cardinality(k.conkey) = 1/WHERE false/" supabase/migrations/027_bayit_delete_account.sql > /tmp/bayit-priv-$$-mutC.sql
sed "s/AND a.atttypid = 'uuid'::regtype AND a.attname ~ v_person_cols/AND false/" supabase/migrations/027_bayit_delete_account.sql > /tmp/bayit-priv-$$-mutB.sql
for m in C B; do cmp -s /tmp/bayit-priv-$$-mut$m.sql supabase/migrations/027_bayit_delete_account.sql && fail "mutant $m was not applied"; done
build_db t027mc 027 /tmp/bayit-priv-$$-mutC.sql
if run_sql_test t027mc $HERE/20_delete_account_test.sql; then fail "mutant C (no foreign-key scan) was NOT detected"; else expect_assertion_failure "mutant C (no foreign-key scan) is detected" "S2d"; fi
build_db t027mb 027 /tmp/bayit-priv-$$-mutB.sql
if run_sql_test t027mb $HERE/20_delete_account_test.sql; then fail "mutant B (no person-column scan) was NOT detected"; else expect_assertion_failure "mutant B (no person-column scan) is detected" "S2c"; fi

echo "== 5. race: the other app writes while the deletion is in flight =="
build_db t027c 027
sql t027c -v ON_ERROR_STOP=1 -q -f - >/dev/null <<'SQL'
INSERT INTO auth.users (id,email) VALUES ('d0000000-0000-0000-0000-00000000000d','d@t.test');
INSERT INTO public.profiles (id, display_name) VALUES ('d0000000-0000-0000-0000-00000000000d','n') ON CONFLICT DO NOTHING;
SQL
# Session 1: starts the deletion, then holds the transaction open for 4 seconds.
( sql t027c -v ON_ERROR_STOP=1 -At -f - >/tmp/bayit-priv-$$-s1.txt 2>&1 <<'SQL'
BEGIN;
SET LOCAL ROLE service_role;
SELECT public.bayit_delete_account('d0000000-0000-0000-0000-00000000000d')::jsonb ->> 'auth_user_deleted';
SELECT pg_sleep(4);
COMMIT;
SQL
) &
S1=$!
sleep 1.5
# Session 2: the events app tries to attach data to that user while session 1 is still open.
T0=$(date +%s)
sql t027c -At -f - >/tmp/bayit-priv-$$-s2.txt 2>&1 <<'SQL'
INSERT INTO public.event_assignments (user_id) VALUES ('d0000000-0000-0000-0000-00000000000d');
SQL
T1=$(date +%s)
wait $S1
WAITED=$((T1 - T0))
GONE=$(sql t027c -At -c "SELECT NOT EXISTS (SELECT 1 FROM auth.users WHERE id='d0000000-0000-0000-0000-00000000000d')")
ORPHANS=$(sql t027c -At -c "SELECT count(*) FROM public.event_assignments")
if [ "$WAITED" -ge 2 ] && grep -qi 'foreign key\|violates' /tmp/bayit-priv-$$-s2.txt && [ "$GONE" = t ] && [ "$ORPHANS" = 0 ]; then pass "the other app's insert waited ${WAITED}s for the lock and then failed its foreign key; no orphan, no half-deleted state"; else fail "race not handled (waited ${WAITED}s gone=$GONE orphans=$ORPHANS: $(head -c 200 /tmp/bayit-priv-$$-s2.txt))"; fi

rm -f /tmp/bayit-priv-$$-*
echo
if [ "$FAILED" -eq 0 ]; then echo "ALL PRIVACY DATABASE TESTS PASSED"; else echo "PRIVACY DATABASE TESTS FAILED"; exit 1; fi
