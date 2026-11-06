#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
container="bayit-atomic-test-$(date +%s)-$$"
docker run -d --rm --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
trap 'docker stop "$container" >/dev/null' EXIT
ready=false
for i in $(seq 1 100); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 0.1
done
if [ "$ready" != true ]; then echo 'PostgreSQL did not become ready' >&2; exit 1; fi
docker exec "$container" mkdir -p /test
docker cp supabase/tests/atomic_task_completion.sql "$container:/test/test.sql"
docker cp supabase/tests/fixtures/atomic_task_completion_original.sql "$container:/test/original.sql"
docker cp supabase/migrations/20261106082323_atomic_task_completion.sql "$container:/test/corrected.sql"
for arm in red green; do
  docker exec "$container" createdb -U postgres "$arm"
  if [ "$arm" = red ]; then migration=/test/original.sql; else migration=/test/corrected.sql; fi
  docker exec "$container" psql -U postgres -d "$arm" -v ON_ERROR_STOP=1 -v red="$([ "$arm" = red ] && echo true || echo false)" -v migration="$migration" -f /test/test.sql
done
