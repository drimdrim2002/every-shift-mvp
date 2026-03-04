#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[ERROR] .env.local 파일이 없습니다: $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

SUPABASE_URL="${VITE_SUPABASE_URL:-}"
ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"

if [[ -z "$SUPABASE_URL" || -z "$ANON_KEY" ]]; then
  echo "[ERROR] .env.local에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY가 필요합니다."
  exit 1
fi

ENDPOINT="${SUPABASE_URL%/}/functions/v1/signup-submit"
ORIGIN="http://localhost:5174"

pass_count=0
fail_count=0

print_title() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

mark_result() {
  local ok="$1"
  local name="$2"
  local detail="$3"

  if [[ "$ok" == "1" ]]; then
    pass_count=$((pass_count + 1))
    echo "[PASS] $name - $detail"
  else
    fail_count=$((fail_count + 1))
    echo "[FAIL] $name - $detail"
  fi
}

run_preflight() {
  print_title "Preflight CORS Test"

  local headers_file
  headers_file="$(mktemp)"

  local status
  status="$(curl -sS -X OPTIONS "$ENDPOINT" \
    -o /dev/null \
    -D "$headers_file" \
    -w "%{http_code}" \
    -H "Origin: $ORIGIN" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: content-type,apikey,authorization")"

  echo "HTTP Status: $status"
  echo "Response Headers:"
  cat "$headers_file"
  rm -f "$headers_file"

  if [[ "$status" == "200" || "$status" == "204" ]]; then
    mark_result 1 "Preflight" "OPTIONS 응답 성공($status)"
  else
    mark_result 0 "Preflight" "OPTIONS 응답 실패($status)"
  fi
}

extract_json_field() {
  local json="$1"
  local jq_expr="$2"
  echo "$json" | jq -r "($jq_expr) as \$v | if \$v == null then empty else \$v end"
}

run_case() {
  local name="$1"
  local payload="$2"
  local expected_http="$3"
  local expected_success="$4"
  local expected_code="$5"
  local expected_reason="$6"
  local expected_next_state="$7"

  local body_file
  body_file="$(mktemp)"

  local http_status
  http_status="$(curl -sS "$ENDPOINT" \
    -o "$body_file" \
    -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    --data "$payload")"

  local body
  body="$(cat "$body_file")"
  rm -f "$body_file"

  echo
  echo "[$name]"
  echo "HTTP: $http_status"
  echo "BODY: $body"

  if ! echo "$body" | jq -e . >/dev/null 2>&1; then
    mark_result 0 "$name" "응답 JSON 파싱 실패"
    return
  fi

  local success code reason next_state
  success="$(extract_json_field "$body" '.success')"
  code="$(extract_json_field "$body" '.error.code')"
  reason="$(extract_json_field "$body" '.error.details.reason')"
  next_state="$(extract_json_field "$body" '.data.nextState')"

  local ok=1

  if [[ "$expected_http" != "*" && "$http_status" != "$expected_http" ]]; then
    ok=0
  fi

  if [[ "$expected_success" != "*" && "$success" != "$expected_success" ]]; then
    ok=0
  fi

  if [[ "$expected_code" != "*" && "$code" != "$expected_code" ]]; then
    ok=0
  fi

  if [[ "$expected_reason" != "*" && "$reason" != "$expected_reason" ]]; then
    ok=0
  fi

  if [[ "$expected_next_state" != "*" && "$next_state" != "$expected_next_state" ]]; then
    ok=0
  fi

  mark_result "$ok" "$name" "expect(http=$expected_http, success=$expected_success, code=$expected_code, reason=$expected_reason, nextState=$expected_next_state) / got(http=$http_status, success=$success, code=$code, reason=$reason, nextState=$next_state)"
}

print_title "signup-submit v2 Contract Test"
echo "Endpoint: $ENDPOINT"

echo "Env: .env.local loaded"

echo "Note: 이 스크립트는 Edge Function 최신 배포 및 SIGNUP_SUBMIT_CONTRACT_MOCK_SUCCESS 설정 여부에 따라 성공 케이스 결과가 달라질 수 있습니다."

run_preflight

ADMIN_BASE='{"email":"admin-test@example.com","password":"12345678","name":"관리자","role":"admin","hospitalId":"00000000-0000-0000-0000-000000000001","hospitalName":"세브란스병원","hospitalSource":"data.go.kr","organizationSelectionMode":"existing"}'

run_case "admin-success" "$ADMIN_BASE" "200" "true" "*" "*" "pending_approval"
run_case "admin-missing-hospital-id" '{"email":"admin-test@example.com","password":"12345678","name":"관리자","role":"admin","hospitalName":"세브란스병원","hospitalSource":"data.go.kr"}' "400" "false" "HOSPITAL_REQUIRED" "*" "*"
run_case "admin-missing-hospital-name" '{"email":"admin-test@example.com","password":"12345678","name":"관리자","role":"admin","hospitalId":"00000000-0000-0000-0000-000000000001","hospitalSource":"data.go.kr"}' "400" "false" "VALIDATION_ERROR" "HOSPITAL_NAME_REQUIRED" "*"
run_case "admin-invalid-hospital-source" '{"email":"admin-test@example.com","password":"12345678","name":"관리자","role":"admin","hospitalId":"00000000-0000-0000-0000-000000000001","hospitalName":"세브란스병원","hospitalSource":"local"}' "400" "false" "VALIDATION_ERROR" "HOSPITAL_SOURCE_INVALID" "*"

run_case "user-missing-invite" '{"email":"user-test@example.com","password":"12345678","name":"사용자","role":"user"}' "400" "false" "INVALID_INVITE_CODE" "INVITE_NOT_FOUND" "*"
run_case "user-invite-expired" '{"email":"user-test@example.com","password":"12345678","name":"사용자","role":"user","inviteCode":"expired-demo"}' "400" "false" "INVALID_INVITE_CODE" "INVITE_EXPIRED" "*"
run_case "user-invite-used" '{"email":"user-test@example.com","password":"12345678","name":"사용자","role":"user","inviteCode":"used-demo"}' "400" "false" "INVALID_INVITE_CODE" "INVITE_ALREADY_USED" "*"
run_case "user-invite-revoked" '{"email":"user-test@example.com","password":"12345678","name":"사용자","role":"user","inviteCode":"revoked-demo"}' "400" "false" "INVALID_INVITE_CODE" "INVITE_REVOKED" "*"
run_case "user-invite-mismatch" '{"email":"user-test@example.com","password":"12345678","name":"사용자","role":"user","inviteCode":"mismatch-demo"}' "400" "false" "INVALID_INVITE_CODE" "INVITE_ROLE_MISMATCH" "*"
run_case "user-success" '{"email":"user-test@example.com","password":"12345678","name":"사용자","role":"user","inviteCode":"valid-demo"}' "200" "true" "*" "*" "active"

print_title "Summary"
echo "PASS: $pass_count"
echo "FAIL: $fail_count"

if [[ "$fail_count" -gt 0 ]]; then
  exit 1
fi

echo "All checks passed."
