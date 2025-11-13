#!/bin/bash
# scripts/pre-commit-validation.sh

set -e

echo "🚀 PRE-COMMIT VALIDATION"
echo "========================"

# Clean up debug code
echo "🧹 Cleaning debug statements..."
DEBUG_FILES=$(grep -r "console.log\|console.table" --include="*.vue" --include="*.ts" apps/web-naive/src/ | cut -d: -f1 | sort -u)

if [ ! -z "$DEBUG_FILES" ]; then
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
pnpm lint

# Type check
echo "🛡️ Type checking..."
pnpm check:type

# Build test
echo "🏗️ Testing build..."
pnpm build > /dev/null

echo "✅ PRE-COMMIT VALIDATION PASSED"
echo "Code is ready for commit! 🎉"