#!/usr/bin/env bash
set -euo pipefail
# Only the disposable PostgreSQL service created for the CI workflow.
: "${PG_CONTAINER:?Missing CI PostgreSQL container}"
if [ "${GITHUB_ACTIONS:-}" != "true" ]; then
  echo "This recovery test is restricted to GitHub Actions." >&2
  exit 1
fi
source_db=restaurant_erp_test
target_db=restaurant_erp_restore
archive=$(mktemp)
before=$(mktemp)
after=$(mktemp)
trap 'rm -f "$archive" "$before" "$after"' EXIT
docker exec "$PG_CONTAINER" pg_dump -U restaurant_test -d "$source_db" --format=custom --no-owner --no-privileges > "$archive"
test -s "$archive"
docker exec "$PG_CONTAINER" createdb -U restaurant_test "$target_db"
docker exec -i "$PG_CONTAINER" pg_restore -U restaurant_test -d "$target_db" --exit-on-error --no-owner --no-privileges < "$archive"
snapshot() {
  docker exec -i "$PG_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U restaurant_test -d "$1" <<'SQL'
SELECT format('SELECT %L || '':'' || count(*) FROM %I.%I;', tablename, schemaname, tablename)
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename \gexec
SELECT 'completed:' || count(*) FROM "Order" WHERE "status" = 'COMPLETED';
SELECT 'payments:' || count(*) FROM "Payment";
SELECT 'payment-total:' || COALESCE(sum("amount"), 0) FROM "Payment";
SELECT 'stock-total:' || COALESCE(sum("quantity"), 0) FROM "InventoryBalance";
SELECT 'audit:' || count(*) FROM "AuditEvent";
SQL
}
snapshot "$source_db" > "$before"
snapshot "$target_db" > "$after"
cmp "$before" "$after"
grep -Eq '^completed:[1-9][0-9]*$' "$after"
grep -Eq '^payments:[1-9][0-9]*$' "$after"
grep -Eq '^audit:[1-9][0-9]*$' "$after"
echo "Backup restored; table counts, completed orders, payment totals, inventory and audit counts match."
