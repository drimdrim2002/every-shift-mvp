#!/bin/bash
# scripts/quality-gate.sh

echo "🎯 QUALITY GATE ENFORCEMENT"
echo "==========================="

GATE_PASSED=0
GATE_FAILED=0

# Gate 1: TypeScript compliance
echo "Gate 1: TypeScript Compliance"
if pnpm check:type > /dev/null 2>&1; then
    echo "✅ PASSED"
    GATE_PASSED=$((GATE_PASSED + 1))
else
    echo "❌ FAILED"
    GATE_FAILED=$((GATE_FAILED + 1))
fi

# Gate 2: ESLint compliance
echo "Gate 2: ESLint Compliance"
if pnpm lint > /dev/null 2>&1; then
    echo "✅ PASSED"
    GATE_PASSED=$((GATE_PASSED + 1))
else
    echo "❌ FAILED"
    GATE_FAILED=$((GATE_FAILED + 1))
fi

# Gate 3: Build success
echo "Gate 3: Build Success"
if pnpm build > /dev/null 2>&1; then
    echo "✅ PASSED"
    GATE_PASSED=$((GATE_PASSED + 1))
else
    echo "❌ FAILED"
    GATE_FAILED=$((GATE_FAILED + 1))
fi

# Gate 4: No debug code
echo "Gate 4: No Debug Code"
DEBUG_COUNT=$(grep -r "console.log\|console.table" --include="*.vue" --include="*.ts" apps/web-naive/src/ | wc -l)
if [ $DEBUG_COUNT -eq 0 ]; then
    echo "✅ PASSED"
    GATE_PASSED=$((GATE_PASSED + 1))
else
    echo "❌ FAILED ($DEBUG_COUNT debug statements found)"
    GATE_FAILED=$((GATE_FAILED + 1))
fi

# Gate 5: CRUD completeness
echo "Gate 5: CRUD Completeness"
if bash scripts/verify-crud-apis.sh > /dev/null 2>&1; then
    echo "✅ PASSED"
    GATE_PASSED=$((GATE_PASSED + 1))
else
    echo "❌ FAILED"
    GATE_FAILED=$((GATE_FAILED + 1))
fi

# Final result
echo "========================="
echo "📊 QUALITY GATE RESULTS:"
echo "Passed: $GATE_PASSED"
echo "Failed: $GATE_FAILED"

if [ $GATE_FAILED -eq 0 ]; then
    echo "🎉 ALL QUALITY GATES PASSED!"
    exit 0
else
    echo "⛔ QUALITY GATES FAILED!"
    echo "Fix the failed gates before proceeding."
    exit 1
fi