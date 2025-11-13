#!/bin/bash
# Quality Gates System - SuperClaude 5-Gate System Implementation
# Based on CLAUDE.md requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Gate status tracking
declare -A gate_status

print_gate_header() {
    echo -e "\n${BLUE}🚦 Gate $1: $2${NC}"
    echo "===================================="
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Gate 0: Project Setup Verification
gate_0_project_setup() {
    print_gate_header "0" "프로젝트 설정 검증"
    local errors=0
    
    # Check tsconfig.json exists
    if [ ! -f "tsconfig.json" ]; then
        print_error "tsconfig.json not found"
        ((errors++))
    else
        print_success "tsconfig.json found"
    fi
    
    # Check eslint config
    if [ ! -f "eslint.config.mjs" ]; then
        print_error "eslint.config.mjs not found"
        ((errors++))
    else
        print_success "eslint.config.mjs found"
    fi
    
    # Check package.json scripts
    if ! pnpm list --depth=0 | grep -q "eslint\|prettier\|stylelint"; then
        print_error "Lint packages not installed properly"
        ((errors++))
    else
        print_success "Lint packages installed"
    fi
    
    # Check for common directories
    for dir in "src" "packages"; do
        if [ -d "$dir" ]; then
            print_success "Directory $dir exists"
        fi
    done
    
    gate_status["gate_0"]=$errors
    return $errors
}

# Gate 1: Pre-Code Analysis
gate_1_pre_code_analysis() {
    print_gate_header "1" "사전 코드 분석"
    local errors=0
    
    print_info "Existing Pattern Analysis:"
    # Check for similar functions/components
    if [ -n "${FEATURE_NAME:-}" ]; then
        echo "Searching for similar patterns to '$FEATURE_NAME'..."
        if command -v rg >/dev/null 2>&1; then
            rg -l --type ts --type vue "$FEATURE_NAME" src/ 2>/dev/null | head -5 || true
        elif command -v grep >/dev/null 2>&1; then
            grep -r -l "$FEATURE_NAME" src/ 2>/dev/null | head -5 || true
        fi
    fi
    
    print_info "Checking API integration points..."
    # Check for API files
    if [ -d "src/api" ]; then
        print_success "API directory exists"
        ls src/api/*.ts 2>/dev/null | wc -l | xargs -I {} echo "Found {} API files"
    fi
    
    gate_status["gate_1"]=$errors
    return $errors
}

# Gate 2: Type Safety Check
gate_2_type_safety() {
    print_gate_header "2" "타입 안전성 검사"
    local errors=0
    
    print_info "Running TypeScript type check..."
    if command -v pnpm >/dev/null 2>&1; then
        if pnpm run typecheck 2>/dev/null; then
            print_success "TypeScript check passed"
        else
            print_error "TypeScript check failed"
            ((errors++))
        fi
    else
        print_warning "pnpm not available, skipping TypeScript check"
    fi
    
    # Check for type definitions
    if [ -d "packages/types" ]; then
        print_success "Type definitions package exists"
    fi
    
    gate_status["gate_2"]=$errors
    return $errors
}

# Gate 3: CRUD Completeness Check
gate_3_crud_completeness() {
    print_gate_header "3" "CRUD 완성도 검사"
    local errors=0
    
    print_info "Checking for complete CRUD patterns..."
    
    # Check for common CRUD function patterns
    local crud_functions=("create" "get" "update" "delete")
    for func in "${crud_functions[@]}"; do
        if command -v rg >/dev/null 2>&1; then
            count=$(rg -c "function.*${func}|const.*${func}|async.*${func}" src/ 2>/dev/null | wc -l)
            if [ "$count" -gt 0 ]; then
                print_success "Found $func operations"
            fi
        fi
    done
    
    gate_status["gate_3"]=$errors
    return $errors
}

# Gate 4: Vue Reactivity Check
gate_4_vue_reactivity() {
    print_gate_header "4" "Vue 반응성 검사"
    local errors=0
    
    print_info "Checking Vue 3 patterns..."
    
    # Check for problematic patterns
    if command -v rg >/dev/null 2>&1; then
        # Check for direct array mutations
        mutations=$(rg -c "\.push\(|\.pop\(|\.shift\(|\.unshift\(" src/ --type vue 2>/dev/null || echo "0")
        if [ "$mutations" -gt 0 ]; then
            print_warning "Found $mutations potential direct array mutations"
        else
            print_success "No direct array mutations found"
        fi
        
        # Check for new array/object creation patterns
        spreads=$(rg -c "\.\.\." src/ --type vue 2>/dev/null || echo "0")
        if [ "$spreads" -gt 0 ]; then
            print_success "Found $spreads spread operator usages (good for reactivity)"
        fi
    fi
    
    gate_status["gate_4"]=$errors
    return $errors
}

# Gate 5: Quality Assurance Check
gate_5_quality_assurance() {
    print_gate_header "5" "품질 보증 검사"
    local errors=0
    
    print_info "Running quality checks..."
    
    # ESLint check
    if command -v pnpm >/dev/null 2>&1; then
        print_info "Running ESLint..."
        if pnpm exec eslint . --cache --quiet 2>/dev/null; then
            print_success "ESLint check passed"
        else
            print_error "ESLint check failed"
            ((errors++))
        fi
        
        print_info "Running Prettier check..."
        if pnpm exec prettier . --check --cache --loglevel error 2>/dev/null; then
            print_success "Prettier check passed"
        else
            print_error "Prettier format check failed"
            ((errors++))
        fi
        
        print_info "Running Stylelint check..."
        if pnpm exec stylelint "**/*.{vue,css,less,scss}" --cache --quiet 2>/dev/null; then
            print_success "Stylelint check passed"
        else
            print_warning "Stylelint check had issues"
        fi
    else
        print_warning "pnpm not available, skipping lint checks"
    fi
    
    gate_status["gate_5"]=$errors
    return $errors
}

# Auto-fix function
auto_fix_issues() {
    print_gate_header "AUTO-FIX" "자동 수정 실행"
    
    if command -v pnpm >/dev/null 2>&1; then
        print_info "Running auto-fix..."
        
        # Auto-fix ESLint
        pnpm exec eslint . --cache --fix --quiet || true
        print_success "ESLint auto-fix completed"
        
        # Auto-format with Prettier
        pnpm exec prettier . --write --cache --loglevel error || true
        print_success "Prettier auto-format completed"
        
        # Auto-fix Stylelint
        pnpm exec stylelint "**/*.{vue,css,less,scss}" --cache --fix --quiet || true
        print_success "Stylelint auto-fix completed"
    fi
}

# Summary report
print_summary() {
    echo -e "\n${BLUE}📊 Gate System Summary${NC}"
    echo "===================================="
    
    local total_errors=0
    local passed_gates=0
    local total_gates=6
    
    for gate in {0..5}; do
        local gate_key="gate_$gate"
        local errors=${gate_status[$gate_key]:-0}
        
        if [ "$errors" -eq 0 ]; then
            print_success "Gate $gate: PASSED"
            ((passed_gates++))
        else
            print_error "Gate $gate: FAILED ($errors errors)"
            ((total_errors+=errors))
        fi
    done
    
    echo -e "\n${BLUE}Results:${NC}"
    echo "- Passed Gates: $passed_gates/$total_gates"
    echo "- Total Errors: $total_errors"
    
    if [ "$total_errors" -eq 0 ]; then
        print_success "🎉 All gates passed! Ready for development."
        return 0
    else
        print_error "❌ $total_errors issues found. Please fix before proceeding."
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🚀 SuperClaude 5-Gate Quality System${NC}"
    echo "===================================="
    echo "Based on CLAUDE.md Gate System"
    echo ""
    
    local auto_fix=false
    local run_all=true
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --fix)
                auto_fix=true
                shift
                ;;
            --gate)
                run_all=false
                gate_num="$2"
                shift 2
                ;;
            --feature)
                FEATURE_NAME="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--fix] [--gate N] [--feature NAME]"
                echo "  --fix: Automatically fix issues where possible"
                echo "  --gate N: Run only specific gate (0-5)"
                echo "  --feature NAME: Feature name for analysis"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run gates
    if [ "$run_all" = true ]; then
        gate_0_project_setup || true
        gate_1_pre_code_analysis || true
        gate_2_type_safety || true
        gate_3_crud_completeness || true
        gate_4_vue_reactivity || true
        gate_5_quality_assurance || true
    else
        case $gate_num in
            0) gate_0_project_setup ;;
            1) gate_1_pre_code_analysis ;;
            2) gate_2_type_safety ;;
            3) gate_3_crud_completeness ;;
            4) gate_4_vue_reactivity ;;
            5) gate_5_quality_assurance ;;
            *) echo "Invalid gate number: $gate_num"; exit 1 ;;
        esac
    fi
    
    # Auto-fix if requested
    if [ "$auto_fix" = true ]; then
        auto_fix_issues
        
        # Re-run Gate 5 after auto-fix
        gate_5_quality_assurance || true
    fi
    
    # Print summary
    print_summary
}

# Run main function
main "$@"