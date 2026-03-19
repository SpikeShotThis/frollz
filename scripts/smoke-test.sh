#!/usr/bin/env bash
# scripts/smoke-test.sh — Frollz compose stack smoke test
#
# Exercises the full API lifecycle (film formats, stocks, rolls, transitions)
# then restarts the entire compose stack and verifies all data survived on the
# postgres volume. Intended to catch regressions introduced by redeployment.
#
# Prerequisites: curl, jq, docker (with compose plugin)
#
# Usage:
#   ./scripts/smoke-test.sh
#
# Environment overrides:
#   BASE_URL          API base URL       (default: http://localhost:3000/api)
#   COMPOSE_FILE      Compose file path  (default: docker-compose.yml)
#   STARTUP_TIMEOUT   Seconds to wait for API after restart (default: 90)
#   NO_RESTART=1      Skip the compose restart phase (useful for API-only checks)
#   NO_CLEANUP=1      Leave test data in the database after the run

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
STARTUP_TIMEOUT="${STARTUP_TIMEOUT:-90}"
NO_RESTART="${NO_RESTART:-0}"
NO_CLEANUP="${NO_CLEANUP:-0}"

# ── colours ───────────────────────────────────────────────────────────────────
BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

# ── state ─────────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
# "endpoint-prefix:uuid" pairs — processed in reverse order during cleanup
CLEANUP_KEYS=()

# ── logging ───────────────────────────────────────────────────────────────────
phase() { echo -e "\n${BOLD}${CYAN}▶ $*${NC}"; }
pass()  { echo -e "  ${GREEN}✓${NC} $*";           PASS=$((PASS + 1)); }
fail()  { echo -e "  ${RED}✗${NC} $*";             FAIL=$((FAIL + 1)); }
info()  { echo -e "  ${YELLOW}·${NC} $*"; }
dim()   { echo -e "  ${DIM}$*${NC}"; }
abort() { echo -e "\n${RED}${BOLD}ABORT: $*${NC}" >&2; exit 1; }

# ── assertions ────────────────────────────────────────────────────────────────
check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$expected" == "$actual" ]]; then
    pass "$label"
  else
    fail "$label  ${DIM}(expected '$expected', got '$actual')${NC}"
  fi
}

check_nonempty() {
  local label="$1" value="$2"
  if [[ -n "$value" && "$value" != "null" ]]; then
    pass "$label"
  else
    fail "$label  ${DIM}(empty or null)${NC}"
  fi
}

# Abort the run — used when a prerequisite call fails (no key to continue with)
require_key() {
  local label="$1" value="$2"
  if [[ -z "$value" || "$value" == "null" ]]; then
    abort "Could not get key for '$label' — cannot continue"
  fi
}

# ── HTTP helpers ──────────────────────────────────────────────────────────────
GET() {
  curl -sf "${BASE_URL}$1"
}

POST() {
  curl -sf -X POST -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1"
}

DELETE() {
  curl -sf -X DELETE "${BASE_URL}$1" >/dev/null 2>&1 || true
}

# Returns only the HTTP status code; never aborts on non-2xx.
HTTP_STATUS() {
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST -H "Content-Type: application/json" -d "$2" "${BASE_URL}$1"
}

# ── API readiness ─────────────────────────────────────────────────────────────
wait_for_api() {
  local label="${1:-API}" elapsed=0
  info "Waiting for $label to be ready (timeout: ${STARTUP_TIMEOUT}s)…"
  until curl -sf "${BASE_URL}/film-formats" >/dev/null 2>&1; do
    if [[ $elapsed -ge $STARTUP_TIMEOUT ]]; then
      abort "$label did not become ready within ${STARTUP_TIMEOUT}s"
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  info "$label is ready (${elapsed}s)"
}

# ── cleanup ───────────────────────────────────────────────────────────────────
cleanup() {
  if [[ "$NO_CLEANUP" == "1" ]]; then
    info "NO_CLEANUP=1 — leaving test data in place"
    return
  fi
  phase "Cleanup"
  # Process in reverse so rolls are deleted before stocks before formats
  for (( i=${#CLEANUP_KEYS[@]}-1; i>=0; i-- )); do
    IFS=: read -r endpoint key <<< "${CLEANUP_KEYS[$i]}"
    DELETE "/${endpoint}/${key}"
    dim "Deleted /${endpoint}/${key}"
  done
}

trap cleanup EXIT

# ── dependency check ──────────────────────────────────────────────────────────
for cmd in curl jq docker; do
  command -v "$cmd" >/dev/null 2>&1 || abort "'$cmd' is required but not found"
done

# Verify compose file exists before we get to the restart phase
if [[ "$NO_RESTART" != "1" ]] && [[ ! -f "$COMPOSE_FILE" ]]; then
  abort "Compose file not found: $COMPOSE_FILE"
fi

# ── banner ────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}Frollz Smoke Test${NC}"
echo -e "  target  : ${BASE_URL}"
echo -e "  compose : ${COMPOSE_FILE}"
echo -e "  restart : $( [[ "$NO_RESTART" == "1" ]] && echo "no (NO_RESTART=1)" || echo "yes" )"
echo -e "  cleanup : $( [[ "$NO_CLEANUP" == "1" ]] && echo "no (NO_CLEANUP=1)" || echo "yes" )"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 1 — Initial health check
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 1 — API health"

wait_for_api

FORMAT_COUNT=$(GET "/film-formats" | jq 'length')
pass "API is reachable (${FORMAT_COUNT} film format(s) already in DB)"

STOCK_COUNT=$(GET "/stocks" | jq 'length')
dim "${STOCK_COUNT} stock(s) already in DB"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 2 — Seed test data
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 2 — Seed test data"

# Use a timestamp suffix so repeated runs never collide with each other or
# with the default seeded data.
SUFFIX=$(date +%s)
TODAY=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# -- Film format ---------------------------------------------------------------
FORMAT=$(POST "/film-formats" \
  "{\"formFactor\":\"Roll\",\"format\":\"smoke-${SUFFIX}\"}")
FORMAT_KEY=$(echo "$FORMAT" | jq -r '._key')
require_key "film-format" "$FORMAT_KEY"
CLEANUP_KEYS+=("film-formats:${FORMAT_KEY}")
check_nonempty "Create film format (smoke-${SUFFIX})" "$FORMAT_KEY"

# -- Standard (C-41) stock -----------------------------------------------------
STD_STOCK=$(POST "/stocks" \
  "{\"formatKey\":\"${FORMAT_KEY}\",\"process\":\"C-41\",\
\"manufacturer\":\"Smoke Test Co\",\"brand\":\"Smoke C41 400\",\"speed\":400}")
STD_STOCK_KEY=$(echo "$STD_STOCK" | jq -r '._key')
require_key "std-stock" "$STD_STOCK_KEY"
CLEANUP_KEYS+=("stocks:${STD_STOCK_KEY}")
check_nonempty "Create C-41 stock" "$STD_STOCK_KEY"

# -- Instant stock -------------------------------------------------------------
INST_STOCK=$(POST "/stocks" \
  "{\"formatKey\":\"${FORMAT_KEY}\",\"process\":\"Instant\",\
\"manufacturer\":\"Smoke Test Co\",\"brand\":\"Smoke Instax\",\"speed\":800}")
INST_STOCK_KEY=$(echo "$INST_STOCK" | jq -r '._key')
require_key "inst-stock" "$INST_STOCK_KEY"
CLEANUP_KEYS+=("stocks:${INST_STOCK_KEY}")
check_nonempty "Create Instant stock" "$INST_STOCK_KEY"

# -- Standard roll (C-41) ------------------------------------------------------
STD_ROLL=$(POST "/rolls" \
  "{\"stockKey\":\"${STD_STOCK_KEY}\",\"dateObtained\":\"${TODAY}\",\
\"obtainmentMethod\":\"Purchase\",\"obtainedFrom\":\"Smoke Test Store\",\
\"timesExposedToXrays\":0}")
STD_ROLL_KEY=$(echo "$STD_ROLL" | jq -r '._key')
require_key "std-roll" "$STD_ROLL_KEY"
CLEANUP_KEYS+=("rolls:${STD_ROLL_KEY}")
check_nonempty "Create standard roll" "$STD_ROLL_KEY"
check "Standard roll gets 'standard' transition profile" \
  "standard" "$(echo "$STD_ROLL" | jq -r '.transitionProfile')"

# -- Instant roll --------------------------------------------------------------
INST_ROLL=$(POST "/rolls" \
  "{\"stockKey\":\"${INST_STOCK_KEY}\",\"dateObtained\":\"${TODAY}\",\
\"obtainmentMethod\":\"Purchase\",\"obtainedFrom\":\"Smoke Test Store\",\
\"timesExposedToXrays\":0}")
INST_ROLL_KEY=$(echo "$INST_ROLL" | jq -r '._key')
require_key "inst-roll" "$INST_ROLL_KEY"
CLEANUP_KEYS+=("rolls:${INST_ROLL_KEY}")
check_nonempty "Create instant roll" "$INST_ROLL_KEY"
check "Instant roll gets 'instant' transition profile" \
  "instant" "$(echo "$INST_ROLL" | jq -r '.transitionProfile')"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 3 — Transition graphs
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 3 — Transition graphs"

STD_GRAPH=$(GET "/transitions?profile=standard")
STD_EDGE_COUNT=$(echo "$STD_GRAPH" | jq '.transitions | length')
check "Standard graph has Finished → Sent For Development edge" "1" \
  "$(echo "$STD_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Finished" and .toState=="Sent For Development")] | length')"
check "Standard graph has Developed → Received edge" "1" \
  "$(echo "$STD_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Developed" and .toState=="Received")] | length')"
check "Standard graph has no direct Finished → Received edge" "0" \
  "$(echo "$STD_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Finished" and .toState=="Received")] | length')"
dim "Standard profile: ${STD_EDGE_COUNT} edges"

INST_GRAPH=$(GET "/transitions?profile=instant")
INST_EDGE_COUNT=$(echo "$INST_GRAPH" | jq '.transitions | length')
check "Instant graph has direct Finished → Received edge" "1" \
  "$(echo "$INST_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Finished" and .toState=="Received")] | length')"
check "Instant graph has Received → Finished backward edge" "1" \
  "$(echo "$INST_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Received" and .toState=="Finished")] | length')"
check "Instant graph has no Sent For Development edge" "0" \
  "$(echo "$INST_GRAPH" | jq \
    '[.transitions[] | select(.toState=="Sent For Development")] | length')"
check "Instant graph has no Developed edge" "0" \
  "$(echo "$INST_GRAPH" | jq \
    '[.transitions[] | select(.toState=="Developed" or .fromState=="Developed")] | length')"
# Instant graph should have the Finished→Received scans metadata
RECEIVED_META=$(echo "$INST_GRAPH" | jq \
  '[.transitions[] | select(.fromState=="Finished" and .toState=="Received")] | .[0].metadata | map(.field) | sort')
check "Instant Finished→Received edge has scans/negatives metadata" \
  '["negativesDate","negativesReceived","scansReceived","scansUrl"]' \
  "$RECEIVED_META"
dim "Instant profile: ${INST_EDGE_COUNT} edges"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 4 — Standard roll lifecycle  (C-41: lab workflow)
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 4 — Standard roll lifecycle (C-41 / lab workflow)"
dim "Path: Added → Shelved → Loaded → Finished → Sent For Development"

R=$(POST "/rolls/${STD_ROLL_KEY}/transition" \
  "{\"targetState\":\"Shelved\",\"date\":\"${TODAY}\"}")
check "Added → Shelved" "Shelved" "$(echo "$R" | jq -r '.state')"

R=$(POST "/rolls/${STD_ROLL_KEY}/transition" \
  "{\"targetState\":\"Loaded\",\"date\":\"${TODAY}\"}")
check "Shelved → Loaded" "Loaded" "$(echo "$R" | jq -r '.state')"

R=$(POST "/rolls/${STD_ROLL_KEY}/transition" \
  "{\"targetState\":\"Finished\",\"date\":\"${TODAY}\",\"metadata\":{\"shotISO\":400}}")
check "Loaded → Finished (shotISO=400)" "Finished" "$(echo "$R" | jq -r '.state')"

R=$(POST "/rolls/${STD_ROLL_KEY}/transition" \
  "{\"targetState\":\"Sent For Development\",\"date\":\"${TODAY}\",\
\"metadata\":{\"labName\":\"The Darkroom\",\"deliveryMethod\":\"Mail in\",\
\"processRequested\":\"C-41\"}}")
check "Finished → Sent For Development (lab details captured)" \
  "Sent For Development" "$(echo "$R" | jq -r '.state')"

STD_HIST=$(GET "/roll-states?rollKey=${STD_ROLL_KEY}")
check "State history has 5 entries (Added+Shelved+Loaded+Finished+SentForDev)" \
  "5" "$(echo "$STD_HIST" | jq 'length')"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — Instant roll lifecycle  (no lab step)
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 5 — Instant roll lifecycle (no lab step)"
dim "Path: Added → Shelved → Loaded → Finished → Received"

R=$(POST "/rolls/${INST_ROLL_KEY}/transition" \
  "{\"targetState\":\"Shelved\",\"date\":\"${TODAY}\"}")
check "Added → Shelved" "Shelved" "$(echo "$R" | jq -r '.state')"

R=$(POST "/rolls/${INST_ROLL_KEY}/transition" \
  "{\"targetState\":\"Loaded\",\"date\":\"${TODAY}\"}")
check "Shelved → Loaded" "Loaded" "$(echo "$R" | jq -r '.state')"

R=$(POST "/rolls/${INST_ROLL_KEY}/transition" \
  "{\"targetState\":\"Finished\",\"date\":\"${TODAY}\"}")
check "Loaded → Finished" "Finished" "$(echo "$R" | jq -r '.state')"

# Negative: instant roll must NOT be able to reach Sent For Development
HTTP=$(HTTP_STATUS "/rolls/${INST_ROLL_KEY}/transition" \
  '{"targetState":"Sent For Development"}')
check "Instant roll rejects Sent For Development (400)" "400" "$HTTP"

# Direct Finished → Received — no lab step
R=$(POST "/rolls/${INST_ROLL_KEY}/transition" \
  "{\"targetState\":\"Received\",\"metadata\":{\"scansReceived\":true}}")
check "Finished → Received (direct — no lab step)" \
  "Received" "$(echo "$R" | jq -r '.state')"

INST_HIST=$(GET "/roll-states?rollKey=${INST_ROLL_KEY}")
check "State history has 5 entries (Added+Shelved+Loaded+Finished+Received)" \
  "5" "$(echo "$INST_HIST" | jq 'length')"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 6 — Compose stack restart
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$NO_RESTART" == "1" ]]; then
  phase "Phase 6 — Compose restart (skipped — NO_RESTART=1)"
  info "Run without NO_RESTART=1 to include the full redeploy test"
else
  phase "Phase 6 — Compose stack restart"
  info "Stopping stack…"
  docker compose -f "$COMPOSE_FILE" down
  info "Starting stack…"
  docker compose -f "$COMPOSE_FILE" up -d
  wait_for_api "API after restart"
  pass "Stack restarted and API is healthy"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Phase 7 — Data persistence verification
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 7 — Data persistence"

# Standard roll
STD=$(GET "/rolls/${STD_ROLL_KEY}")
check "Standard roll still exists"          "${STD_ROLL_KEY}"          "$(echo "$STD" | jq -r '._key')"
check "Standard roll state persisted"       "Sent For Development"     "$(echo "$STD" | jq -r '.state')"
check "Standard roll profile persisted"     "standard"                 "$(echo "$STD" | jq -r '.transitionProfile')"
check "Standard roll stock name persisted"  "Smoke C41 400"            "$(echo "$STD" | jq -r '.stockName')"

# Instant roll
INST=$(GET "/rolls/${INST_ROLL_KEY}")
check "Instant roll still exists"           "${INST_ROLL_KEY}"         "$(echo "$INST" | jq -r '._key')"
check "Instant roll state persisted"        "Received"                 "$(echo "$INST" | jq -r '.state')"
check "Instant roll profile persisted"      "instant"                  "$(echo "$INST" | jq -r '.transitionProfile')"
check "Instant roll stock name persisted"   "Smoke Instax"             "$(echo "$INST" | jq -r '.stockName')"

# State histories
STD_HIST=$(GET "/roll-states?rollKey=${STD_ROLL_KEY}")
check "Standard roll history persisted (5 entries)" \
  "5" "$(echo "$STD_HIST" | jq 'length')"

INST_HIST=$(GET "/roll-states?rollKey=${INST_ROLL_KEY}")
check "Instant roll history persisted (5 entries)" \
  "5" "$(echo "$INST_HIST" | jq 'length')"

# Transition graphs still correct after migration re-run on startup
STD_G=$(GET "/transitions?profile=standard")
check "Standard graph intact after restart" "1" \
  "$(echo "$STD_G" | jq \
    '[.transitions[] | select(.fromState=="Finished" and .toState=="Sent For Development")] | length')"

INST_G=$(GET "/transitions?profile=instant")
check "Instant graph intact after restart" "1" \
  "$(echo "$INST_G" | jq \
    '[.transitions[] | select(.fromState=="Finished" and .toState=="Received")] | length')"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
TOTAL=$((PASS + FAIL))
echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if (( FAIL == 0 )); then
  echo -e "${GREEN}${BOLD}  ✓  ${PASS}/${TOTAL} checks passed${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}  ✗  ${FAIL}/${TOTAL} checks failed${NC}"
  exit 1
fi
