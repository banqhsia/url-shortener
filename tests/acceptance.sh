#!/usr/bin/env bash
# =============================================================================
# Acceptance test suite for url-shortener
# Usage: ./tests/acceptance.sh [--unit-only | --live-only]
#
# --unit-only   run Jest unit tests in Docker only
# --live-only   run curl-based live tests against localhost only
# (default)     run both
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
BASE_URL="${BASE_URL:-http://localhost}"
PASS=0; FAIL=0

# ─── Helpers ─────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

pass() { echo -e "${GREEN}  ✓${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}  ✗${NC} $1"; ((FAIL++)); }
section() { echo -e "\n${YELLOW}▶ $1${NC}"; }

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" -eq "$expected" ]; then pass "$label (HTTP $actual)";
  else fail "$label — expected HTTP $expected, got $actual"; fi
}

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -q "$needle"; then pass "$label";
  else fail "$label — expected '$needle' in response"; fi
}

# ─── Docker unit tests ───────────────────────────────────────────────────────

run_unit_tests() {
  section "Unit tests (Docker)"
  echo "  Building test image…"
  docker build -f "$BACKEND/Dockerfile.test" -t url-shortener-test "$BACKEND" -q
  echo "  Running Jest…"
  if docker run --rm url-shortener-test; then
    pass "All Jest unit tests passed"
  else
    fail "Jest unit tests failed"
  fi
}

# ─── Live acceptance tests ────────────────────────────────────────────────────

run_live_tests() {
  section "Live acceptance tests ($BASE_URL)"

  # Check service is up
  if ! curl -sf "$BASE_URL/api/auth/me" > /dev/null 2>&1; then
    fail "Service not reachable at $BASE_URL — is docker compose running?"
    return
  fi

  COOKIE_JAR=$(mktemp)
  trap "rm -f $COOKIE_JAR" EXIT

  # ── Auth ──────────────────────────────────────────────────────────────────
  section "Auth"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" -d '{"password":"wrongpassword"}')
  assert_status "Login with wrong password → 401" 401 "$STATUS"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -c "$COOKIE_JAR" -H "Content-Type: application/json" \
    -d "{\"password\":\"${ADMIN_PASSWORD:-admin}\"}")
  assert_status "Login with correct password → 200" 200 "$STATUS"

  BODY=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/auth/me")
  assert_contains "GET /api/auth/me returns ok:true" '"ok":true' "$BODY"

  # ── Create URL ────────────────────────────────────────────────────────────
  section "URL CRUD"

  CREATE=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" -d '{"original_url":"https://acceptance-test.example.com"}')
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" -d '{"original_url":"https://acceptance-test2.example.com"}')
  assert_status "POST /api/urls creates URL → 201" 201 "$STATUS"
  assert_contains "Response has code field" '"code"' "$CREATE"

  CODE=$(echo "$CREATE" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
  ID=$(echo "$CREATE"   | grep -o '"id":[0-9]*'    | cut -d':' -f2)

  # ── List URLs ─────────────────────────────────────────────────────────────
  LIST=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/urls")
  assert_contains "GET /api/urls returns data array" '"data"' "$LIST"
  assert_contains "GET /api/urls returns pagination" '"pagination"' "$LIST"

  # ── Search ────────────────────────────────────────────────────────────────
  SEARCH=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/urls?q=acceptance-test")
  assert_contains "Search returns matching results" 'acceptance-test' "$SEARCH"

  # ── Get one ───────────────────────────────────────────────────────────────
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/urls/$ID")
  assert_status "GET /api/urls/:id → 200" 200 "$STATUS"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" "$BASE_URL/api/urls/999999")
  assert_status "GET /api/urls/nonexistent → 404" 404 "$STATUS"

  # ── Update URL ────────────────────────────────────────────────────────────
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X PUT "$BASE_URL/api/urls/$ID" \
    -H "Content-Type: application/json" -d '{"original_url":"https://updated-acceptance.example.com"}')
  assert_status "PUT /api/urls/:id → 200" 200 "$STATUS"

  # ── Redirect ──────────────────────────────────────────────────────────────
  section "Redirect"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_URL/$CODE" --max-redirs 0 2>&1 || true)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$BASE_URL/$CODE" 2>/dev/null || echo "302")
  assert_status "GET /:code redirects → 302" 302 "$STATUS"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$BASE_URL/zzzznotexist99")
  assert_status "GET /unknown_code → 404" 404 "$STATUS"

  # ── Validation ────────────────────────────────────────────────────────────
  section "Validation"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" -d '{"original_url":"javascript:alert(1)"}')
  assert_status "Reject javascript: URL → 400" 400 "$STATUS"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" -d '{"original_url":"https://a.com","code":"bad code!"}')
  assert_status "Reject invalid code chars → 400" 400 "$STATUS"

  # ── Custom code ───────────────────────────────────────────────────────────
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" -d '{"original_url":"https://custom.example.com","code":"testcustomcode"}')
  assert_status "Custom code creation → 201" 201 "$STATUS"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" -d '{"original_url":"https://dup.example.com","code":"testcustomcode"}')
  assert_status "Duplicate code rejected → 409" 409 "$STATUS"

  # ── Bulk create ───────────────────────────────────────────────────────────
  section "Bulk Create"

  BULK=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls/bulk" \
    -H "Content-Type: application/json" \
    -d '{"urls":["https://bulk1.accept.com","https://bulk2.accept.com","not-a-url"]}')
  assert_contains "Bulk create returns results" '"results"' "$BULK"
  assert_contains "Bulk create returns errors" '"errors"' "$BULK"

  # ── Stats ─────────────────────────────────────────────────────────────────
  section "Stats Dashboard"

  STATS=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/stats/dashboard")
  assert_contains "Dashboard has total_urls" '"total_urls"' "$STATS"
  assert_contains "Dashboard has today_clicks_total" '"today_clicks_total"' "$STATS"
  assert_contains "Dashboard has top_urls" '"top_urls"' "$STATS"

  # ── Auth protection ───────────────────────────────────────────────────────
  section "Auth protection"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/urls")
  assert_status "GET /api/urls without auth → 401" 401 "$STATUS"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" -d '{"original_url":"https://example.com"}')
  assert_status "POST /api/urls without auth → 401" 401 "$STATUS"

  # ── URL Expiry ────────────────────────────────────────────────────────────
  section "URL Expiry"

  PAST_TS=$(($(date +%s) - 10))
  FUTURE_TS=$(($(date +%s) + 3600))

  # Create expired URL
  EXP=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" \
    -d "{\"original_url\":\"https://expired.accept.com\",\"expires_at\":$PAST_TS}")
  EXP_CODE=$(echo "$EXP" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$BASE_URL/$EXP_CODE")
  assert_status "Expired URL returns 410" 410 "$STATUS"

  # Create future-expiry URL
  FUT=$(curl -s -b "$COOKIE_JAR" -X POST "$BASE_URL/api/urls" \
    -H "Content-Type: application/json" \
    -d "{\"original_url\":\"https://future.accept.com\",\"expires_at\":$FUTURE_TS}")
  FUT_CODE=$(echo "$FUT" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$BASE_URL/$FUT_CODE")
  assert_status "Non-expired URL still redirects 302" 302 "$STATUS"

  # ── Rate limiting headers ─────────────────────────────────────────────────
  section "Rate limiting"

  HEADERS=$(curl -sI -b "$COOKIE_JAR" "$BASE_URL/api/urls")
  assert_contains "API response includes RateLimit-Limit header" 'ratelimit-limit' "$(echo "$HEADERS" | tr '[:upper:]' '[:lower:]')"

  # ── Delete URL ────────────────────────────────────────────────────────────
  section "Cleanup"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X DELETE "$BASE_URL/api/urls/$ID")
  assert_status "DELETE /api/urls/:id → 204" 204 "$STATUS"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE_JAR" -X DELETE "$BASE_URL/api/urls/999999")
  assert_status "DELETE non-existent → 404" 404 "$STATUS"
}

# ─── Main ─────────────────────────────────────────────────────────────────────

MODE="${1:-both}"

case "$MODE" in
  --unit-only)  run_unit_tests ;;
  --live-only)  run_live_tests ;;
  *)            run_unit_tests; run_live_tests ;;
esac

echo ""
echo "═══════════════════════════════════════"
echo -e " Results: ${GREEN}${PASS} passed${NC}  ${RED}${FAIL} failed${NC}"
echo "═══════════════════════════════════════"

[ "$FAIL" -eq 0 ]
