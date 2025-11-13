#!/bin/bash
# scripts/health-check.sh

set -e

echo "🏥 PROJECT HEALTH CHECK STARTED"
echo "=================================="

# Check Node.js and pnpm versions
echo "📦 Checking environment..."
node --version
pnpm --version

# Install dependencies if needed
echo "📦 Ensuring dependencies are installed..."
pnpm install --frozen-lockfile

# Type checking
echo "🛡️ TypeScript validation..."
if ! pnpm check:type; then
    echo "❌ TypeScript errors detected!"
    exit 1
fi

# Lint checking  
echo "🔍 ESLint validation..."
if ! pnpm lint; then
    echo "❌ ESLint errors detected!"
    exit 1
fi

# Build test
echo "🏗️ Build test..."
if ! pnpm build; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ PROJECT HEALTH CHECK PASSED"
echo "Ready for development! 🎉"