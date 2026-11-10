#!/usr/bin/env bash
# Database tests for the privacy gate (migrations 026, 027, 028), against a REAL throwaway Postgres.
# Nothing here touches Supabase or any shared database.
#
#   bash supabase/tests/privacy/run.sh            # starts and removes its own docker container
#   PGHOST=... PGUSER=postgres bash ... run.sh    # uses a server you provide (CI service container)
#   LIVE_DUMP=<dir> bash ... run.sh               # ALSO runs everything on a schema rebuilt from a catalog dump
#                                                  # of the real shared project (see build-live-schema.py)
#
# It builds the real Bayit schema (supabase/migration.sql + migrations 001..025) on a stand-in for
# Supabase auth, adds a stand-in for the events app that shares the database, and proves:
#   * consent row-level security with two users and an anonymous role (30_*),
#   * migration 026 is a no-op when re-run, and its rollback removes exactly what it added,
#   * account deletion NEVER deletes the shared auth user or profile, is atomic and race-safe (20_*),
#   * the database-level consent gate (028) closes the household tables for people without consent,
#     leaves everything else alone, and rolls back exactly (40_*).
# Each guarantee also runs against a deliberately broken ("mutant") version and must FAIL there,
# at the assertion that was predicted; a test that cannot fail proves nothing.
set -uo pipefail
cd "$(dirname "$0")/../../.."
HERE=supabase/tests/privacy
M=supabase/migrations
R=supabase/rollbacks
FAILED=0
T=$(mktemp -d /tmp/bayit-priv-XXXXXX)

MODE=docker
if [ -n "${PGHOST:-}" ]; then MODE=external; fi
CONTAINER="bayit-privacy-test-$$-$(date +%s)"
cleanup() { rm -rf "$T"; if [ "$MODE" = docker ]; then docker rm -f "$CONTAINER" >/dev/null 2>&1; fi; }
trap cleanup EXIT

if [ "$MODE" = docker ]; then
  docker run -d --rm --name "$CONTAINER" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
  # The image starts a temporary server first and then restarts: wait until a real query works twice in a row.
  ok=0
  for _ in $(seq 1 200); do
    if docker exec "$CONTAINER" psql -X -q -U postgres -d postgres -Atc "select 1" >/dev/null 2>&1; then ok=$((ok + 1)); [ "$ok" -ge 3 ] && break; else ok=0; fi
    sleep 0.3
  done
  [ "$ok" -ge 3 ] || { echo "PostgreSQL did not start" >&2; exit 2; }
fi

sql() { # sql <db> [psql args...] < file
  local db="$1"; shift
  if [ "$MODE" = docker ]; then docker exec -i "$CONTAINER" psql -X -q -U postgres -d "$db" "$@"; else psql -X -q -d "$db" "$@"; fi
}
admin() { if [ "$MODE" = docker ]; then docker exec -i "$CONTAINER" psql -X -q -U postgres -d postgres "$@"; else psql -X -q -d postgres "$@"; fi; }

# Errors the real migration chain is KNOWN to produce on a fresh database (the live database drifted).
ALLOWED='already exists|column h\.created_by does not exist'

apply_file() { # apply_file <db> <file> : any error that is not in ALLOWED stops the run
  local out
  out=$(sql "$1" -v ON_ERROR_STOP=0 -f - < "$2" 2>&1 | grep -E 'ERROR' | grep -vE "$ALLOWED" || true)
  if [ -n "$out" ]; then echo "UNEXPECTED ERROR applying $2: $out" >&2; exit 2; fi
}
apply_strict() { # apply_strict <db> <file> : ANY error stops the run (for the migrations this PR adds)
  local out
  out=$(sql "$1" -v ON_ERROR_STOP=0 -f - < "$2" 2>&1 | grep -E 'ERROR' || true)
  if [ -n "$out" ]; then echo "ERROR applying $2: $out" >&2; exit 2; fi
}

build_db() { # build_db <name> <last chain migration number: 025|026> [extra files to apply strictly, in order...]
  local db="$1" upto="$2"; shift 2
  admin -c "DROP DATABASE IF EXISTS $db" -c "CREATE DATABASE $db"
  sql "$db" -v ON_ERROR_STOP=1 -f - < $HERE/00_supabase_stub.sql >/dev/null 2>&1 || { echo "stub failed" >&2; exit 2; }
  apply_file "$db" supabase/migration.sql
  for f in $M/0*.sql; do
    n=$(basename "$f"); p=${n%%_*}
    if [ "$p" -le "$upto" ] 2>/dev/null && [ "$p" -le 026 ]; then
      if [ "$p" = 026 ]; then apply_strict "$db" "$f"; else apply_file "$db" "$f"; fi
    fi
  done
  sql "$db" -v ON_ERROR_STOP=1 -f - < $HERE/10_events_app_fixture.sql >/dev/null
  for f in "$@"; do apply_strict "$db" "$f"; done
}

snapshot() { # everything in public that a migration could add or change
  sql "$1" -At -f - <<'SQL'
SELECT 'table ' || c.relname || ' rls=' || c.relrowsecurity FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r','p')
UNION ALL SELECT 'policy ' || tablename || '.' || policyname || ' ' || permissive || ' ' || cmd || ' ' || coalesce(qual,'') || ' ' || coalesce(with_check,'') FROM pg_policies WHERE schemaname = 'public'
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
expect_assertion_failure() { # <label> [expected text]: red must come from OUR assertion, and the one we predicted
  if [ -n "${2:-}" ] && ! echo "$LAST" | grep -m1 'ASSERT FAILED' | grep -q "$2"; then fail "$1 failed, but not where predicted ($2): $(echo "$LAST" | grep -m1 'ASSERT FAILED')"; return; fi
  if echo "$LAST" | grep -q 'ASSERT FAILED'; then pass "$1: $(echo "$LAST" | grep -m1 'ASSERT FAILED' | sed 's/.*ASSERT FAILED: //')"; else fail "$1 failed for the WRONG reason (a crash, not an assertion): $(echo "$LAST" | grep -m1 ERROR)"; fi
}
run_sql_test() { # run_sql_test <db> <file> -> 0 when every assertion held
  local out; out=$(sql "$1" -v ON_ERROR_STOP=1 -f - < "$2" 2>&1); local rc=$?
  PASSES=$(echo "$out" | grep -c 'PASS ' || true)
  LAST="$out"
  return $rc
}
mutant() { # mutant <out file> <sed expression> <source file>: fails the run if the mutation changed nothing
  sed "$2" "$3" > "$1"
  if cmp -s "$1" "$3"; then fail "mutant $(basename "$1") was not applied (the pattern matched nothing)"; fi
}

echo "== 1. migration 026: consent row-level security (two users + anonymous) =="
build_db t026 026
if run_sql_test t026 $HERE/30_consent_rls_test.sql; then pass "30_consent_rls_test.sql ($PASSES assertions)"; else fail "consent RLS"; echo "$LAST" | tail -15; fi
build_db t026m 026
sql t026m -v ON_ERROR_STOP=1 -c "ALTER TABLE public.privacy_consents DISABLE ROW LEVEL SECURITY" >/dev/null
if run_sql_test t026m $HERE/30_consent_rls_test.sql; then fail "mutant with RLS off was NOT detected"; else expect_assertion_failure "mutant with RLS off is detected" "RLS is enabled"; fi

mutant $T/t1.sql "s/NEW.accepted_at := now();/NEW.accepted_at := NEW.accepted_at;/" $M/026_privacy_consent.sql
build_db t026t 025 $T/t1.sql
if run_sql_test t026t $HERE/30_consent_rls_test.sql; then fail "mutant that trusts the client-supplied accepted_at was NOT detected"; else expect_assertion_failure "mutant that trusts the client time is detected" "SERVER time"; fi

echo "== 2. migration 026 is a no-op when re-run =="
build_db t026r 026
sql t026r -c "INSERT INTO auth.users (id,email) VALUES ('c0000000-0000-0000-0000-00000000000c','c@t.test')" -c "INSERT INTO public.privacy_consents (user_id,policy_version,age_confirmed,privacy_accepted,terms_accepted) VALUES ('c0000000-0000-0000-0000-00000000000c','v1',true,true,true)"
snapshot t026r > $T/b.txt
sql t026r -v ON_ERROR_STOP=1 -f - < $M/026_privacy_consent.sql >/dev/null 2>&1; RC=$?
snapshot t026r > $T/a.txt
ROWS=$(sql t026r -At -c "SELECT count(*) FROM public.privacy_consents")
if [ $RC -eq 0 ] && diff -q $T/b.txt $T/a.txt >/dev/null && [ "$ROWS" = 1 ]; then pass "026 second run: no error, identical schema ($(wc -l < $T/a.txt) catalog lines), data kept"; else fail "026 re-run changed something"; diff $T/b.txt $T/a.txt | head; fi

echo "== 3. rollbacks remove exactly what each migration added (and an incomplete one is detected) =="
build_db t025 025
snapshot t025 > $T/s025.txt
sql t025 -v ON_ERROR_STOP=1 -f - < $M/026_privacy_consent.sql >/dev/null 2>&1
snapshot t025 > $T/s026.txt
ADDED=$(diff $T/s025.txt $T/s026.txt | grep -c '^>' || true)
sql t025 -v ON_ERROR_STOP=1 -f - < $R/026_privacy_consent_rollback.sql >/dev/null 2>&1; RC=$?
snapshot t025 > $T/sback.txt
if [ $RC -eq 0 ] && [ "$ADDED" -gt 0 ] && diff -q $T/s025.txt $T/sback.txt >/dev/null; then pass "026 rollback: schema identical to before ($ADDED catalog lines added, all removed)"; else fail "026 rollback is not exact"; diff $T/s025.txt $T/sback.txt | head; fi
sql t025 -v ON_ERROR_STOP=1 -f - < $M/026_privacy_consent.sql >/dev/null 2>&1
sql t025 -c 'DROP POLICY IF EXISTS "bayit_consent_insert_own" ON public.privacy_consents' -c 'DROP POLICY IF EXISTS "bayit_consent_select_own" ON public.privacy_consents' >/dev/null 2>&1
snapshot t025 > $T/smut.txt
if diff -q $T/s025.txt $T/smut.txt >/dev/null; then fail "an incomplete 026 rollback was NOT detected"; else pass "an incomplete rollback (policies only) is detected by the same comparison"; fi

build_db t027rb 026
snapshot t027rb > $T/b27.txt
apply_strict t027rb $M/027_bayit_delete_account.sql; snapshot t027rb > $T/a27.txt
sql t027rb -v ON_ERROR_STOP=1 -f - < $R/027_bayit_delete_account_rollback.sql >/dev/null 2>&1; RC=$?; snapshot t027rb > $T/r27.txt
if [ $RC -eq 0 ] && ! diff -q $T/b27.txt $T/a27.txt >/dev/null && diff -q $T/b27.txt $T/r27.txt >/dev/null; then pass "027 rollback: schema identical to before 027 ($(diff $T/b27.txt $T/a27.txt | grep -c '^>') catalog lines added, all removed)"; else fail "027 rollback is not exact"; diff $T/b27.txt $T/r27.txt | head; fi
build_db t027rf 026 $M/027_bayit_delete_account.sql
sql t027rf -c "INSERT INTO public.bayit_identity_deletion_requests (user_id) VALUES (gen_random_uuid())" >/dev/null
if sql t027rf -v ON_ERROR_STOP=1 -f - < $R/027_bayit_delete_account_rollback.sql >/dev/null 2>&1; then fail "027 rollback ran while a deletion request was pending (it would lose work)"; else pass "027 rollback REFUSES while identity-deletion requests are pending"; fi

build_db t028rb 026 $M/027_bayit_delete_account.sql
snapshot t028rb > $T/b28.txt
apply_strict t028rb $M/028_consent_gate_rls.sql; snapshot t028rb > $T/a28.txt
sql t028rb -v ON_ERROR_STOP=1 -f - < $M/028_consent_gate_rls.sql >/dev/null 2>&1; RC2=$?; snapshot t028rb > $T/a28b.txt
sql t028rb -v ON_ERROR_STOP=1 -f - < $R/028_consent_gate_rls_rollback.sql >/dev/null 2>&1; RC=$?; snapshot t028rb > $T/r28.txt
if [ $RC2 -eq 0 ] && diff -q $T/a28.txt $T/a28b.txt >/dev/null; then pass "028 second run is a no-op"; else fail "028 re-run changed something"; fi
if [ $RC -eq 0 ] && ! diff -q $T/b28.txt $T/a28.txt >/dev/null && diff -q $T/b28.txt $T/r28.txt >/dev/null; then pass "028 rollback: schema identical to before 028 ($(diff $T/b28.txt $T/a28.txt | grep -c '^>') catalog lines added, all removed)"; else fail "028 rollback is not exact"; diff $T/b28.txt $T/r28.txt | head; fi

echo "== 4. migration 027: delete my account never touches the shared identity =="
build_db t027 026 $M/027_bayit_delete_account.sql $M/028_consent_gate_rls.sql
if run_sql_test t027 $HERE/20_delete_account_test.sql; then pass "20_delete_account_test.sql ($PASSES assertions, with the 028 gate active)"; else fail "delete account"; echo "$LAST" | tail -15; fi

echo "== 4b. mutants of 027: each must be caught at the predicted assertion =="
run027mutant() { # run027mutant <name> <sed expression> <expected assertion text> <label>
  mutant $T/$1.sql "$2" $M/027_bayit_delete_account.sql
  build_db t027_$1 026 $T/$1.sql $M/028_consent_gate_rls.sql
  if run_sql_test t027_$1 $HERE/20_delete_account_test.sql; then fail "$4 was NOT detected"; else expect_assertion_failure "$4 is detected" "$3"; fi
}
run027mutant m1 "s/^  INSERT INTO public.bayit_identity_deletion_requests (user_id, kept_shared)/  DELETE FROM public.weekly_syncs WHERE created_by = p_user; DELETE FROM auth.users WHERE id = p_user;\n  INSERT INTO public.bayit_identity_deletion_requests (user_id, kept_shared)/" "IDENTITY the auth user" "mutant that deletes the shared login"
run027mutant m2 "s/AND tier <> 'free'/AND true/" "SUB a FREE" "mutant that blocks on FREE subscriptions"
run027mutant m4 "s/UPDATE public.profiles SET household_id = NULL WHERE id = p_user AND household_id = hh;/UPDATE public.profiles SET household_id = NULL;/" "IDENTITY a bystander" "mutant that detaches everybody's profile"
run027mutant m5 "s/DELETE FROM public.task_completions WHERE user_id = p_user;/DELETE FROM public.task_completions WHERE user_id = p_user OR task_id IN (SELECT id FROM public.tasks WHERE household_id = ANY (v_hhs));/" "OWN task_completions" "mutant that deletes ALL completions of the household (the round-2 behaviour)"
run027mutant m6 "s/sender_id = p_user AND recipient_id = p_user;/sender_id = p_user OR recipient_id = p_user;/" "SHARED love_tokens" "mutant that deletes love tokens addressed to or from others"
run027mutant m7 "s/IF cardinality(v_left) = 0 THEN/IF true THEN/" "OWN streaks" "mutant that deletes the household (and, by cascade, a former member's rows) regardless"
run027mutant m8 "s/IF v_nullable = 'YES' THEN/IF false THEN/" "SHARED tasks" "mutant that never anonymises shared rows"
run027mutant m9 "s/EXECUTE format('DELETE FROM public.%I WHERE %I = \$1', v_own_delete\[i\]\[1\], v_own_delete\[i\]\[2\]) USING p_user;/EXECUTE format('DELETE FROM public.%I WHERE %I IS NOT NULL OR \$1 IS NULL', v_own_delete[i][1], v_own_delete[i][2]) USING p_user;/" "IDENTITY a bystander" "mutant that deletes other people's own-class rows"
run027mutant m10 "s/ AND NOT EXISTS (SELECT 1 FROM public.task_completions c WHERE c.task_id = tasks.id)//" "OWN task_completions" "mutant that deletes tasks a former member completed (cascade over their completion)"

echo "== 5. migration 028: the consent gate in the database =="
build_db t028 026 $M/027_bayit_delete_account.sql $M/028_consent_gate_rls.sql
if run_sql_test t028 $HERE/40_consent_gate_rls_test.sql; then pass "40_consent_gate_rls_test.sql ($PASSES assertions)"; else fail "consent gate RLS"; echo "$LAST" | tail -15; fi
echo "== 5b. mutants of 028 =="
mutant $T/g1.sql "s/AND c.policy_version = '2026-11-10'/AND true/" $M/028_consent_gate_rls.sql
build_db t028m1 026 $M/027_bayit_delete_account.sql $T/g1.sql
if run_sql_test t028m1 $HERE/40_consent_gate_rls_test.sql; then fail "mutant that accepts any policy version was NOT detected"; else expect_assertion_failure "mutant that accepts any version is detected" "OLD version"; fi
mutant $T/g2.sql "s/AS RESTRICTIVE FOR ALL TO authenticated USING (public.bayit_has_current_consent()) WITH CHECK (public.bayit_has_current_consent())/AS RESTRICTIVE FOR ALL TO authenticated USING (true) WITH CHECK (true)/" $M/028_consent_gate_rls.sql
build_db t028m2 026 $M/027_bayit_delete_account.sql $T/g2.sql
if run_sql_test t028m2 $HERE/40_consent_gate_rls_test.sql; then fail "mutant with an open gate was NOT detected"; else expect_assertion_failure "mutant with an open gate is detected" "no consent: cannot read"; fi
mutant $T/g3.sql "s/'agent_audit_log','agent_confirmations','app_feedback','coaching_events',/'agent_audit_log','agent_confirmations','app_feedback','coaching_events','profiles',/" $M/028_consent_gate_rls.sql
build_db t028m3 026 $M/027_bayit_delete_account.sql $T/g3.sql
if run_sql_test t028m3 $HERE/40_consent_gate_rls_test.sql; then fail "mutant that gates the SHARED profiles table was NOT detected"; else expect_assertion_failure "mutant that gates the shared profiles / events tables is detected" "NO gate policy on the shared profiles"; fi

mutant $T/g4.sql "s/^COMMIT;/DROP POLICY bayit_consent_gate ON public.subscriptions;\nCREATE POLICY bayit_consent_gate ON public.subscriptions AS RESTRICTIVE FOR ALL TO authenticated USING (public.bayit_has_current_consent() OR user_id = auth.uid()) WITH CHECK (public.bayit_has_current_consent());\nCOMMIT;/" $M/028_consent_gate_rls.sql
build_db t028m4 026 $M/027_bayit_delete_account.sql $T/g4.sql
if run_sql_test t028m4 $HERE/40_consent_gate_rls_test.sql; then fail "mutant that re-adds a subscription read exception was NOT detected"; else expect_assertion_failure "mutant that re-adds a read exception for the person's own subscription is detected" "OWN subscription"; fi

echo "== 6. races: a join while the last member's deletion is in flight, and a second deletion of the same person =="
build_db t027c 026 $M/027_bayit_delete_account.sql
sql t027c -v ON_ERROR_STOP=1 -q -f - >/dev/null <<'SQL'
INSERT INTO auth.users (id,email) VALUES ('d0000000-0000-0000-0000-00000000000d','d@t.test'), ('e0000000-0000-0000-0000-00000000000e','e@t.test');
INSERT INTO public.profiles (id, display_name) VALUES ('d0000000-0000-0000-0000-00000000000d','n'), ('e0000000-0000-0000-0000-00000000000e','n') ON CONFLICT DO NOTHING;
INSERT INTO public.households (id, name) VALUES ('d1000000-0000-0000-0000-0000000000d1','solo');
INSERT INTO public.household_members (household_id, user_id, role) VALUES ('d1000000-0000-0000-0000-0000000000d1','d0000000-0000-0000-0000-00000000000d','owner');
UPDATE public.profiles SET household_id = 'd1000000-0000-0000-0000-0000000000d1' WHERE id = 'd0000000-0000-0000-0000-00000000000d';
SQL
( sql t027c -v ON_ERROR_STOP=1 -At -f - >$T/s1.txt 2>&1 <<'SQL'
BEGIN;
SET LOCAL ROLE service_role;
SELECT public.bayit_delete_account('d0000000-0000-0000-0000-00000000000d')::jsonb ->> 'household';
SELECT pg_sleep(4);
COMMIT;
SQL
) &
S1=$!
sleep 1.5
T0=$(date +%s)
sql t027c -At -f - >$T/s2.txt 2>&1 <<'SQL'
INSERT INTO public.household_members (household_id, user_id, role) VALUES ('d1000000-0000-0000-0000-0000000000d1','e0000000-0000-0000-0000-00000000000e','member');
SQL
T1=$(date +%s)
wait $S1
WAITED=$((T1 - T0))
GONE=$(sql t027c -At -c "SELECT NOT EXISTS (SELECT 1 FROM public.households WHERE id='d1000000-0000-0000-0000-0000000000d1')")
JOINED=$(sql t027c -At -c "SELECT count(*) FROM public.household_members WHERE user_id='e0000000-0000-0000-0000-00000000000e'")
if [ "$WAITED" -ge 2 ] && grep -qi 'foreign key\|violates' $T/s2.txt && [ "$GONE" = t ] && [ "$JOINED" = 0 ]; then pass "a join waited ${WAITED}s for the household lock, then failed its foreign key; no member attached to a deleted household"; else fail "household race not handled (waited ${WAITED}s gone=$GONE joined=$JOINED: $(head -c 200 $T/s2.txt))"; fi

echo
if [ -n "${LIVE_DUMP:-}" ]; then
  echo "== 7. the same migrations and tests on a schema rebuilt from the REAL shared project (catalog dump, no row data) =="
  python3 $HERE/build-live-schema.py "$LIVE_DUMP" > $T/live.sql || { echo "could not build live schema" >&2; exit 2; }
  build_live() { # build_live <db>: the live schema, with nothing from this PR applied
    admin -c "DROP DATABASE IF EXISTS $1" -c "CREATE DATABASE $1"
    sql "$1" -v ON_ERROR_STOP=1 -f - < $HERE/00_supabase_stub.sql >/dev/null 2>&1
    sql "$1" -v ON_ERROR_STOP=0 -f - < $T/live.sql 2>&1 | grep -E 'ERROR' | sort -u | head -8 > $T/live-errors.txt
  }
  build_live tlive0
  if [ -s $T/live-errors.txt ]; then fail "rebuilding the live schema reported errors: $(cat $T/live-errors.txt)"; else pass "live schema rebuilt without errors"; fi
  echo "   privacy_consents exists live: $(sql tlive0 -At -c "SELECT to_regclass('public.privacy_consents') IS NOT NULL")   app_feedback exists live: $(sql tlive0 -At -c "SELECT to_regclass('public.app_feedback') IS NOT NULL")"
  snapshot tlive0 > $T/live-before.txt
  for f in 026_privacy_consent 027_bayit_delete_account 028_consent_gate_rls; do
    if sql tlive0 -v ON_ERROR_STOP=1 -f - < $M/$f.sql >/dev/null 2>$T/err.txt; then pass "applies cleanly on the live schema: $f"; else fail "$f FAILED on the live schema: $(head -c 300 $T/err.txt)"; fi
  done
  sql tlive0 -v ON_ERROR_STOP=1 -f - < $M/026_privacy_consent.sql >/dev/null 2>&1 && sql tlive0 -v ON_ERROR_STOP=1 -f - < $M/028_consent_gate_rls.sql >/dev/null 2>&1 && pass "026 and 028 re-run on the live schema: no-op, no error"
  for f in 028_consent_gate_rls 027_bayit_delete_account 026_privacy_consent; do
    sql tlive0 -v ON_ERROR_STOP=1 -f - < $R/${f}_rollback.sql >/dev/null 2>$T/err.txt && pass "rollback runs on the live schema: $f" || fail "rollback of $f failed on live: $(head -c 300 $T/err.txt)"
  done
  snapshot tlive0 > $T/live-after.txt
  if diff -q $T/live-before.txt $T/live-after.txt >/dev/null; then pass "after the three rollbacks the live schema is identical to before ($(wc -l < $T/live-before.txt) catalog lines)"; else fail "rollbacks on the live schema left a difference"; diff $T/live-before.txt $T/live-after.txt | head; fi
  for pair in "30_consent_rls_test.sql:026_privacy_consent" "40_consent_gate_rls_test.sql:026_privacy_consent 027_bayit_delete_account 028_consent_gate_rls" "20_delete_account_test.sql:026_privacy_consent 027_bayit_delete_account 028_consent_gate_rls"; do
    tf=${pair%%:*}; mig=${pair#*:}
    build_live tlive1
    for f in $mig; do sql tlive1 -v ON_ERROR_STOP=1 -f - < $M/$f.sql >/dev/null 2>&1; done
    if run_sql_test tlive1 $HERE/$tf; then pass "$tf on the live schema ($PASSES assertions)"; else fail "$tf on the live schema"; echo "$LAST" | grep -E "ERROR|DETAIL|ASSERT" | head -4; fi
  done
fi

echo
if [ "$FAILED" -eq 0 ]; then echo "ALL PRIVACY DATABASE TESTS PASSED"; else echo "PRIVACY DATABASE TESTS FAILED"; exit 1; fi
