#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

EXIT_CODE=0

log_err() {
  echo "[ERROR] $*" >&2
  EXIT_CODE=1
}

check_frontmatter() {
  local skill_file="$1"
  local frontmatter
  frontmatter="$(sed -n '1,/^---$/p' "$skill_file")"

  if [[ "$(head -n1 "$skill_file")" != "---" ]]; then
    log_err "$skill_file: missing frontmatter start"; return
  fi

  if ! grep -q '^name:' <<<"$frontmatter"; then
    log_err "$skill_file: missing required frontmatter field 'name'"
  fi

  if ! grep -q '^description:' <<<"$frontmatter"; then
    log_err "$skill_file: missing required frontmatter field 'description'"
  fi
}

check_forbidden_any() {
  local file="$1"
  if rg -n '\bany\b' "$file" >/dev/null 2>&1; then
    log_err "$file: contains forbidden token 'any'"
  fi
}

check_unresolved_placeholders() {
  local file="$1"
  # Detect Handlebars-style unresolved placeholders while allowing Vue interpolations.
  if rg -n '\{\{[#/]|(\{\{[A-Z][^}]*\}\})|(\{\{[^}]*-[^}]*\}\})' "$file" >/dev/null 2>&1; then
    log_err "$file: contains unresolved Handlebars-style placeholder like {{...}}"
  fi
}

check_markdown_links_exist() {
  local skill_file="$1"
  local dir
  dir="$(dirname "$skill_file")"

  while IFS= read -r link; do
    [[ -z "$link" ]] && continue
    [[ "$link" =~ ^https?:// ]] && continue
    [[ "$link" =~ ^# ]] && continue

    local path="$dir/$link"
    if [[ ! -e "$path" ]]; then
      log_err "$skill_file: broken relative link -> $link"
    fi
  done < <(rg -o '\[[^]]+\]\(([^)]+)\)' "$skill_file" -r '$1')
}

echo "[INFO] Validating Claude skills..."
while IFS= read -r skill; do
  check_frontmatter "$skill"
  check_markdown_links_exist "$skill"
done < <(find .claude/skills -type f -name 'SKILL.md' | sort)

echo "[INFO] Checking templates for forbidden patterns..."
while IFS= read -r template; do
  check_forbidden_any "$template"
  check_unresolved_placeholders "$template"
done < <(find .claude/skills -type f -path '*/reference/*.template' | sort)

echo "[INFO] Validating Codex mirror skills..."
while IFS= read -r skill; do
  check_frontmatter "$skill"
  check_markdown_links_exist "$skill"
done < <(find tools/skills/codex-mirror -type f -name 'SKILL.md' | sort)

if [[ $EXIT_CODE -ne 0 ]]; then
  echo "[FAIL] Skill validation failed." >&2
  exit "$EXIT_CODE"
fi

echo "[OK] Skill validation passed."
