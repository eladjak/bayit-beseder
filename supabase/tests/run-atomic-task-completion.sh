#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
container="bayit-atomic-test-$(date +%s)-$$"
docker run -d --rm --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
trap 'docker stop "$container" >/dev/null' EXIT
for i in $(seq 1 100); do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
done
docker exec "$container" mkdir -p /test/tests /test/migrations
docker cp supabase/tests/atomic_task_completion.sql "$container:/test/tests/test.sql"
docker cp supabase/migrations/20261106082323_atomic_task_completion.sql "$container:/test/migrations/20261106082323_atomic_task_completion.sql"
docker exec "$container" psql -U postgres -v ON_ERROR_STOP=1 -f /test/tests/test.sql
