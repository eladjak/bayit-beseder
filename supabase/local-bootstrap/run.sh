#!/usr/bin/env bash
set -euo pipefail
: "${LOCAL_CONTAINER:?Set to a disposable job-priv2-* PostgreSQL container}"
: "${LOCAL_DATABASE:?Set to a fresh job_priv2_* database}"
case "$LOCAL_CONTAINER" in job-priv2-*) ;; *) echo "Refusing container name" >&2; exit 2;; esac
case "$LOCAL_DATABASE" in job_priv2_*) ;; *) echo "Refusing database name" >&2; exit 2;; esac
for file in supabase/migration.sql supabase/local-bootstrap/phase3-compat.sql supabase/migrations/002*.sql supabase/migrations/0{03..09}*.sql supabase/local-bootstrap/010_subscriptions-fresh.sql supabase/migrations/0{11..25}*.sql supabase/migrations/202*.sql supabase/local-bootstrap/final-compat.sql; do
  [ -f "$file" ] || { echo "Missing $file" >&2; exit 1; }
  printf 'Applying %s\n' "$file"
  docker exec -i "$LOCAL_CONTAINER" psql -U postgres -d "$LOCAL_DATABASE" -v ON_ERROR_STOP=1 -1 < "$file"
done
