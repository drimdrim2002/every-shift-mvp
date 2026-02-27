#!/usr/bin/env bash
# scripts/pre-commit-validation.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🚀 PRE-COMMIT VALIDATION"
echo "========================"

# Clean up debug code
echo "🧹 Cleaning debug statements..."
DEBUG_FILES=$( (rg -l "console\\.(log|table)\\(" src --glob "*.vue" --glob "*.ts" || true) | sort -u )

if [[ -n "$DEBUG_FILES" ]]; then
    echo "⚠️ Found debug statements in:"
    echo "$DEBUG_FILES"
    echo "❌ Remove debug statements before committing"
    exit 1
fi

# Format all code
echo "🎨 Formatting code..."
pnpm format

# Lint check
echo "🔍 Running ESLint..."
pnpm lint:check

# Type check
echo "🛡️ Type checking..."
pnpm exec vue-tsc -b

# Build test
echo "🏗️ Testing build..."
pnpm build > /dev/null

echo "✅ PRE-COMMIT VALIDATION PASSED"
echo "Code is ready for commit! 🎉"
