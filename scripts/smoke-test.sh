#!/usr/bin/env bash
# scripts/smoke-test.sh — Frollz compose stack smoke test
#
# Exercises the full API lifecycle (formats, emulsions, films, transitions)
# then optionally restarts the entire compose stack and verifies all data
# survived on the postgres volume. Intended to catch regressions introduced
# by redeployment.
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
# "endpoint-prefix:id" pairs — processed in reverse order during cleanup
CLEANUP_IDS=()

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

require_id() {
  local label="$1" value="$2"
  if [[ -z "$value" || "$value" == "null" ]]; then
    abort "Could not get id for '$label' — cannot continue"
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
  until curl -sf "${BASE_URL}/formats" >/dev/null 2>&1; do
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
  # Process in reverse so films are deleted before emulsions before formats
  for (( i=${#CLEANUP_IDS[@]}-1; i>=0; i-- )); do
    IFS=: read -r endpoint id <<< "${CLEANUP_IDS[$i]}"
    DELETE "/${endpoint}/${id}"
    dim "Deleted /${endpoint}/${id}"
  done
}

trap cleanup EXIT

# ── dependency check ──────────────────────────────────────────────────────────
for cmd in curl jq docker; do
  command -v "$cmd" >/dev/null 2>&1 || abort "'$cmd' is required but not found"
done

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
# Phase 1 — API health
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 1 — API health"

wait_for_api

FORMAT_COUNT=$(GET "/formats" | jq 'length')
pass "API is reachable (${FORMAT_COUNT} format(s) already in DB)"

EMULSION_COUNT=$(GET "/emulsions" | jq 'length')
dim "${EMULSION_COUNT} emulsion(s) already in DB"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 2 — Seed test data
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 2 — Seed test data"

SUFFIX=$(date +%s)
TODAY=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
OBTAINED_DATE=$(date -u +"%Y-%m-%d")

# -- Format -------------------------------------------------------------------
FORMAT=$(POST "/formats" \
  "{\"name\":\"smoke-${SUFFIX}\",\"packageId\":1}")
FORMAT_ID=$(echo "$FORMAT" | jq -r '.id')
require_id "format" "$FORMAT_ID"
CLEANUP_IDS+=("formats:${FORMAT_ID}")
check_nonempty "Create format (smoke-${SUFFIX})" "$FORMAT_ID"

# -- Standard (C-41) emulsion -------------------------------------------------
STD_EMULSION=$(POST "/emulsions" \
  "{\"formatId\":${FORMAT_ID},\"process\":\"C-41\",\
\"manufacturer\":\"Smoke Test Co\",\"brand\":\"Smoke C41 400\",\"speed\":400}")
STD_EMULSION_ID=$(echo "$STD_EMULSION" | jq -r '.id')
require_id "std-emulsion" "$STD_EMULSION_ID"
CLEANUP_IDS+=("emulsions:${STD_EMULSION_ID}")
check_nonempty "Create C-41 emulsion" "$STD_EMULSION_ID"

# -- Instant emulsion ---------------------------------------------------------
INST_EMULSION=$(POST "/emulsions" \
  "{\"formatId\":${FORMAT_ID},\"process\":\"Instant\",\
\"manufacturer\":\"Smoke Test Co\",\"brand\":\"Smoke Instax\",\"speed\":800}")
INST_EMULSION_ID=$(echo "$INST_EMULSION" | jq -r '.id')
require_id "inst-emulsion" "$INST_EMULSION_ID"
CLEANUP_IDS+=("emulsions:${INST_EMULSION_ID}")
check_nonempty "Create Instant emulsion" "$INST_EMULSION_ID"

# -- Transition profiles -------------------------------------------------------
PROFILES=$(GET "/transitions/profiles")
STD_PROFILE_ID=$(echo "$PROFILES" | jq -r '[.[] | select(.name=="standard")] | .[0].id')
INST_PROFILE_ID=$(echo "$PROFILES" | jq -r '[.[] | select(.name=="instant")] | .[0].id')
require_id "standard-profile" "$STD_PROFILE_ID"
require_id "instant-profile"  "$INST_PROFILE_ID"
check_nonempty "Standard transition profile exists" "$STD_PROFILE_ID"
check_nonempty "Instant transition profile exists"  "$INST_PROFILE_ID"

# -- Standard film (C-41) -----------------------------------------------------
STD_FILM=$(POST "/films" \
  "{\"name\":\"Smoke C41 Roll ${SUFFIX}\",\"emulsionId\":${STD_EMULSION_ID},\
\"expirationDate\":\"2028-01-01\",\"transitionProfileId\":${STD_PROFILE_ID},\
\"metadata\":{\"dateObtained\":\"${OBTAINED_DATE}\",\
\"obtainmentMethod\":\"Purchase\",\"obtainedFrom\":\"Smoke Test Store\"}}")
STD_FILM_ID=$(echo "$STD_FILM" | jq -r '.id')
require_id "std-film" "$STD_FILM_ID"
CLEANUP_IDS+=("films:${STD_FILM_ID}")
check_nonempty "Create standard film" "$STD_FILM_ID"

# -- Instant film -------------------------------------------------------------
INST_FILM=$(POST "/films" \
  "{\"name\":\"Smoke Instax Roll ${SUFFIX}\",\"emulsionId\":${INST_EMULSION_ID},\
\"expirationDate\":\"2028-01-01\",\"transitionProfileId\":${INST_PROFILE_ID}}")
INST_FILM_ID=$(echo "$INST_FILM" | jq -r '.id')
require_id "inst-film" "$INST_FILM_ID"
CLEANUP_IDS+=("films:${INST_FILM_ID}")
check_nonempty "Create instant film" "$INST_FILM_ID"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 3 — Transition graphs
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 3 — Transition graphs"

STD_GRAPH=$(GET "/transitions?profile=standard")
check "Standard graph has Finished → Sent For Development edge" "1" \
  "$(echo "$STD_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Finished" and .toState=="Sent For Development")] | length')"
check "Standard graph has Developed → Received edge" "1" \
  "$(echo "$STD_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Developed" and .toState=="Received")] | length')"
check "Standard graph has no direct Finished → Received edge" "0" \
  "$(echo "$STD_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Finished" and .toState=="Received")] | length')"

INST_GRAPH=$(GET "/transitions?profile=instant")
check "Instant graph has direct Finished → Received edge" "1" \
  "$(echo "$INST_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Finished" and .toState=="Received")] | length')"
check "Instant graph has Received → Finished backward edge" "1" \
  "$(echo "$INST_GRAPH" | jq \
    '[.transitions[] | select(.fromState=="Received" and .toState=="Finished")] | length')"
check "Instant graph has no Sent For Development edge" "0" \
  "$(echo "$INST_GRAPH" | jq \
    '[.transitions[] | select(.toState=="Sent For Development")] | length')"

RECEIVED_META=$(echo "$INST_GRAPH" | jq \
  '[.transitions[] | select(.fromState=="Finished" and .toState=="Received")] | .[0].metadata | map(.field) | sort')
check "Instant Finished→Received edge has scans/negatives metadata" \
  '["negativesDate","negativesReceived","scansReceived","scansUrl"]' \
  "$RECEIVED_META"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 4 — Standard film lifecycle (C-41 / lab workflow)
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 4 — Standard film lifecycle (C-41 / lab workflow)"
dim "Path: Added → Shelved → Loaded → Finished → Sent For Development"

R=$(POST "/films/${STD_FILM_ID}/transition" \
  "{\"targetStateName\":\"Shelved\",\"date\":\"${TODAY}\"}")
check "Added → Shelved" "Shelved" "$(echo "$R" | jq -r '.currentState.stateName')"

R=$(POST "/films/${STD_FILM_ID}/transition" \
  "{\"targetStateName\":\"Loaded\",\"date\":\"${TODAY}\"}")
check "Shelved → Loaded" "Loaded" "$(echo "$R" | jq -r '.currentState.stateName')"

R=$(POST "/films/${STD_FILM_ID}/transition" \
  "{\"targetStateName\":\"Finished\",\"date\":\"${TODAY}\",\"metadata\":{\"shotISO\":\"400\"}}")
check "Loaded → Finished (shotISO=400)" "Finished" "$(echo "$R" | jq -r '.currentState.stateName')"

R=$(POST "/films/${STD_FILM_ID}/transition" \
  "{\"targetStateName\":\"Sent For Development\",\"date\":\"${TODAY}\",\
\"metadata\":{\"labName\":\"The Darkroom\",\"deliveryMethod\":\"Mail in\",\
\"processRequested\":\"C-41\"}}")
check "Finished → Sent For Development" \
  "Sent For Development" "$(echo "$R" | jq -r '.currentState.stateName')"

STD_HIST=$(GET "/film-states?filmId=${STD_FILM_ID}")
check "State history has 5 entries (Added+Shelved+Loaded+Finished+SentForDev)" \
  "5" "$(echo "$STD_HIST" | jq 'length')"

# ─────────────────────────────────────────────────────────────────────────────
# Phase 5 — Instant film lifecycle (no lab step)
# ─────────────────────────────────────────────────────────────────────────────
phase "Phase 5 — Instant film lifecycle (no lab step)"
dim "Path: Added → Shelved → Loaded → Finished → Received"

R=$(POST "/films/${INST_FILM_ID}/transition" \
  "{\"targetStateName\":\"Shelved\",\"date\":\"${TODAY}\"}")
check "Added → Shelved" "Shelved" "$(echo "$R" | jq -r '.currentState.stateName')"

R=$(POST "/films/${INST_FILM_ID}/transition" \
  "{\"targetStateName\":\"Loaded\",\"date\":\"${TODAY}\"}")
check "Shelved → Loaded" "Loaded" "$(echo "$R" | jq -r '.currentState.stateName')"

R=$(POST "/films/${INST_FILM_ID}/transition" \
  "{\"targetStateName\":\"Finished\",\"date\":\"${TODAY}\"}")
check "Loaded → Finished" "Finished" "$(echo "$R" | jq -r '.currentState.stateName')"

# Negative: instant film must NOT be able to reach Sent For Development
HTTP=$(HTTP_STATUS "/films/${INST_FILM_ID}/transition" \
  '{"targetStateName":"Sent For Development"}')
check "Instant film rejects Sent For Development (400)" "400" "$HTTP"

R=$(POST "/films/${INST_FILM_ID}/transition" \
  "{\"targetStateName\":\"Received\",\"metadata\":{\"scansReceived\":\"true\"}}")
check "Finished → Received (direct — no lab step)" \
  "Received" "$(echo "$R" | jq -r '.currentState.stateName')"

INST_HIST=$(GET "/film-states?filmId=${INST_FILM_ID}")
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

STD=$(GET "/films/${STD_FILM_ID}")
check "Standard film still exists"        "${STD_FILM_ID}"           "$(echo "$STD" | jq -r '.id')"
check "Standard film state persisted"     "Sent For Development"     "$(echo "$STD" | jq -r '.currentState.stateName')"

INST=$(GET "/films/${INST_FILM_ID}")
check "Instant film still exists"         "${INST_FILM_ID}"          "$(echo "$INST" | jq -r '.id')"
check "Instant film state persisted"      "Received"                 "$(echo "$INST" | jq -r '.currentState.stateName')"

STD_HIST=$(GET "/film-states?filmId=${STD_FILM_ID}")
check "Standard film history persisted (5 entries)" \
  "5" "$(echo "$STD_HIST" | jq 'length')"

INST_HIST=$(GET "/film-states?filmId=${INST_FILM_ID}")
check "Instant film history persisted (5 entries)" \
  "5" "$(echo "$INST_HIST" | jq 'length')"

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
