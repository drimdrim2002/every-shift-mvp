#!/bin/bash
# scripts/verify-crud-apis.sh

echo "🔍 CRUD API VERIFICATION"
echo "========================"

API_DIR="apps/web-naive/src/api"
MISSING_FUNCTIONS=()

# Function to check if CRUD functions exist
check_crud_operations() {
    local entity=$1
    echo "Checking $entity operations..."
    
    if ! grep -r "export.*create${entity}" --include="*.ts" "$API_DIR" > /dev/null; then
        MISSING_FUNCTIONS+=("create${entity}")
    fi
    
    if ! grep -r "export.*update${entity}" --include="*.ts" "$API_DIR" > /dev/null; then
        MISSING_FUNCTIONS+=("update${entity}")
    fi
    
    if ! grep -r "export.*delete${entity}" --include="*.ts" "$API_DIR" > /dev/null; then
        MISSING_FUNCTIONS+=("delete${entity}")
    fi
    
    if ! grep -r "export.*get${entity}" --include="*.ts" "$API_DIR" > /dev/null; then
        MISSING_FUNCTIONS+=("get${entity}")
    fi
}

# Check all organization entities
check_crud_operations "OrganizationSite"
check_crud_operations "OrganizationShiftType"
check_crud_operations "OrganizationSkill"
check_crud_operations "OrganizationRank"
check_crud_operations "OrganizationWorkConstraints"

if [ ${#MISSING_FUNCTIONS[@]} -gt 0 ]; then
    echo "❌ MISSING CRUD FUNCTIONS:"
    printf '%s\n' "${MISSING_FUNCTIONS[@]}"
    echo "⛔ Development blocked - implement missing functions"
    exit 1
else
    echo "✅ All CRUD functions present"
fi

echo "✅ CRUD API VERIFICATION PASSED"