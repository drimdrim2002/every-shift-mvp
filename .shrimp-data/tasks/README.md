# Task Files - Development Phase Organization

## Current Pending Phase Files

The current canonical backlog is `.shrimp-data/tasks.json`.

Pending tasks can be regenerated into phase-scoped execution files with:

```bash
node .shrimp-data/generate_phase_task_files.mjs
```

Generated files:

- `.shrimp-data/tasks/phase1-pending-tasks.json`
- `.shrimp-data/tasks/phase2-pending-tasks.json`
- `.shrimp-data/tasks/phase3-pending-tasks.json`
- `.shrimp-data/tasks/phase4-pending-tasks.json`
- `.shrimp-data/tasks/phase5-pending-tasks.json`
- `.shrimp-data/tasks/phase6-pending-tasks.json`
- `.shrimp-data/tasks/phase7-pending-tasks.json`
- `.shrimp-data/tasks/phase8-pending-tasks.json`
- `.shrimp-data/tasks/phase9-pending-tasks.json`
- `.shrimp-data/tasks/phase10-pending-tasks.json`

Index file:

- `.shrimp-data/tasks/phase-pending-index.json`

Execution pattern:

```bash
cp .shrimp-data/tasks/phase3-pending-tasks.json .shrimp-data/tasks.json
```

Legacy split files were moved to `.shrimp-data/tasks/lazy/` and renamed with a `lazy-` prefix. They are historical artifacts and are not the current canonical pending backlog.

This directory contains 87 tasks from the EveryShift MVP project, organized into 9 development phases for better token efficiency when working with AI assistants.

## 📂 File Structure

```
.shrimp-data/tasks/
├── lazy/
│   ├── lazy-phase-0-infrastructure.json     (10 tasks)  ~8,000 tokens
│   ├── lazy-phase-1-database.json          (7 tasks)   ~5,500 tokens
│   ├── lazy-phase-2-foundation.json        (12 tasks)  ~9,500 tokens
│   ├── lazy-phase-3-authentication.json    (4 tasks)   ~3,000 tokens
│   ├── lazy-phase-4-step1-2.json          (6 tasks)   ~4,700 tokens
│   ├── lazy-phase-5-step3-grid.json       (18 tasks)  ~14,000 tokens
│   ├── lazy-phase-6-step4-results.json    (8 tasks)   ~6,300 tokens
│   ├── lazy-phase-7-integration.json      (12 tasks)  ~9,500 tokens
│   └── lazy-phase-8-polish.json           (10 tasks)  ~8,000 tokens
```

**Original file:** `.shrimp-data/tasks-original-backup.json` (294KB, ~75,000 tokens)

## 🎯 Token Efficiency

Using phase files instead of the original single file:
- **70-90% token reduction** when working on specific phases
- **Faster AI response times** (smaller files to process)
- **Better context window utilization** (more room for other files)

Example: Working on Phase 3 uses only ~3,000 tokens instead of ~75,000 tokens!

## 📋 Phase Descriptions

### Phase 0: Infrastructure (10 tasks)
**Focus:** Project setup, packages, build tools, linting

**Key tasks:**
- Vite + TypeScript setup
- Package installations (Naive UI, Tailwind, TanStack Table, Pinia, Supabase)
- Folder structure creation
- ESLint/Prettier configuration
- Basic config (favicon, title)

**Estimated time:** 2-3 hours

---

### Phase 1: Database (7 tasks)
**Focus:** Supabase setup, schema, RLS, seed data

**Key tasks:**
- Supabase project creation
- Database schema migration (6 tables)
- RLS policies configuration
- Seed data loading (organizations, shifts, employees)
- Database verification

**Estimated time:** 3-4 hours

---

### Phase 2: Foundation (12 tasks)
**Focus:** TypeScript types, utilities, API clients, layout components

**Key tasks:**
- TypeScript type definitions (Schedule, Employee, Shift, Organization)
- Utility functions (date, validation, Excel export)
- Supabase client setup
- Layout components (DefaultLayout, Header, Sidebar)
- Base styles (Tailwind CSS)

**Estimated time:** 4-6 hours

---

### Phase 3: Authentication (4 tasks)
**Focus:** Auth store, router guards, login page

**Key tasks:**
- Pinia auth store
- Vue Router configuration with guards
- Login page implementation
- Organization store setup

**Estimated time:** 2-3 hours

---

### Phase 4: Step 1-2 Pages (6 tasks)
**Focus:** Basic info and site requirements pages

**Key tasks:**
- Schedule store foundation
- Step indicator component
- Step 1: Basic Info page (month selection)
- Step 2: Site Requirements page (staffing grid)
- ShiftSelector component
- useSiteRequirements composable

**Estimated time:** 4-5 hours

---

### Phase 5: Step 3 Grid (18 tasks) 🔥
**Focus:** Core 30×36 grid component (80% of development effort)

**Key tasks:**
- TanStack Table grid implementation (30 employees × 36 days = 1,080 cells)
- useScheduleGrid composable (data management)
- useScheduleGridStatistics composable (real-time statistics)
- useScheduleGridInit composable (initialization logic)
- useScheduleGridPersistence composable (LocalStorage)
- ScheduleGrid component (3-level header, cell rendering, shift assignment)
- Step 3 page integration
- Previous month validation
- StatisticsSummary component
- LoadingModal component
- AI Solver polling UI

**Estimated time:** 16-20 hours ⚠️ (Largest phase)

---

### Phase 6: Step 4 Results (8 tasks)
**Focus:** Results page, AI solver, Excel export

**Key tasks:**
- AI Solver Mock API
- useAISolver composable (polling mechanism)
- Schedule API
- Step 4: Results page
- Results grid integration
- Excel download functionality
- Manual editing capabilities

**Estimated time:** 5-6 hours

---

### Phase 7: Integration (12 tasks)
**Focus:** Connecting steps, validation, E2E testing

**Key tasks:**
- App.vue root component
- main.ts entry point
- Step-to-step connections
- Router guards for step progression
- Data saving and navigation between steps
- AI Solver error handling
- E2E integration tests
- Mock solver verification
- Environment variable templates

**Estimated time:** 6-8 hours

---

### Phase 8: Polish (10 tasks)
**Focus:** Performance, UI refinement, documentation

**Key tasks:**
- Grid performance optimization (v-memo, computed caching)
- Statistics calculation verification
- UI polishing (spacing, colors, fonts, consistency)
- README.md documentation
- Developer guide (DEVELOPMENT.md)
- Seed data documentation
- API documentation
- Demo scenario guide
- Test data preparation
- Screenshot capture

**Estimated time:** 4-6 hours

---

## 🔧 Usage with shrimp-task-manager

The shrimp-task-manager MCP server reads from `.shrimp-data/tasks.json`. To work on a specific phase:

### Option 1: Copy to tasks.json (Recommended)
```bash
# Work on current pending Phase 3 backlog
cp .shrimp-data/tasks/phase3-pending-tasks.json .shrimp-data/tasks.json

# Use shrimp-task-manager (reads from .shrimp-data/tasks.json)
# ... work on tasks ...

# Save changes back to phase file
cp .shrimp-data/tasks.json .shrimp-data/tasks/phase3-pending-tasks.json
```

### Option 2: Symbolic link
```bash
# Create symlink to current pending phase
ln -sf "$PWD/.shrimp-data/tasks/phase3-pending-tasks.json" "$PWD/.shrimp-data/tasks.json"

# Work normally, changes will be saved to the phase file
```

### Option 3: Rename temporarily
```bash
# Rename current pending phase to tasks.json
mv .shrimp-data/tasks/phase3-pending-tasks.json .shrimp-data/tasks.json

# Work on tasks...

# Rename back when done
mv .shrimp-data/tasks.json .shrimp-data/tasks/phase3-pending-tasks.json
```

## 📊 Statistics

| Phase | Tasks | Token Estimate | % of Total |
|-------|-------|----------------|------------|
| Phase 0 | 10 | ~8,000 | 11% |
| Phase 1 | 7 | ~5,500 | 8% |
| Phase 2 | 12 | ~9,500 | 14% |
| Phase 3 | 4 | ~3,000 | 5% |
| Phase 4 | 6 | ~4,700 | 7% |
| **Phase 5** | **18** | **~14,000** | **21%** ⭐ |
| Phase 6 | 8 | ~6,300 | 9% |
| Phase 7 | 12 | ~9,500 | 14% |
| Phase 8 | 10 | ~8,000 | 11% |
| **Total** | **87** | **~68,500** | **100%** |

## 🚀 Development Workflow

### Sequential Development (Recommended)
Follow phases in order for logical progression:
```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

### Parallel Development (Advanced)
Some phases can be developed in parallel:
- **Track A:** Phase 0 → Phase 1 → Phase 2 → Phase 5 (Grid focus)
- **Track B:** Phase 3 → Phase 4 (Pages) → Phase 6 (Results)
- **Final:** Phase 7 (Integration) → Phase 8 (Polish)

## ⚠️ Important Notes

1. **Dependencies:** Some phases depend on previous phases. Check task dependencies before starting.
2. **Phase 5 is critical:** 18 tasks, ~20 hours of work. The core 30×36 grid component.
3. **Backup:** Original file is at `.shrimp-data/tasks-original-backup.json`
4. **Task IDs:** Task IDs are preserved across all phase files for dependency tracking.
5. **JSON Structure:** Each phase file includes metadata (phase name, description, task count).

## 📝 File Format

Each phase file has this structure:
```json
{
  "metadata": {
    "phase": "phase-X-name",
    "label": "Human-readable label",
    "description": "What this phase covers",
    "taskCount": 10
  },
  "tasks": [
    {
      "id": "uuid",
      "name": "Task name",
      "description": "Task description",
      "status": "pending",
      "dependencies": [],
      "relatedFiles": [],
      "implementationGuide": "...",
      "verificationCriteria": [],
      "analysisResult": {},
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

## 🔍 Finding Tasks

To find a specific task across all phases:
```bash
# Search all phase files
grep -r "task-name-pattern" .shrimp-data/tasks/*.json

# Search with context
grep -C 3 "task-name-pattern" .shrimp-data/tasks/*.json
```

## 🔗 Parent-Child Dependency Policy

For hierarchical task names, parent tasks are completion gates:

- Parent pattern: `^P\d+-\d+\.\d+$` (example: `P0-2.3`)
- Child pattern: `^P\d+-\d+\.\d+\.\d+$` (example: `P0-2.3.1`)
- Rule: parent must include all children in `dependencies`
- Rule: do not add child -> parent dependencies

Quick validation for canonical `.shrimp-data/tasks.json`:
```bash
python - <<'PY'
import json,re,sys
with open('.shrimp-data/tasks.json', encoding='utf-8') as f:
    tasks = json.load(f)['tasks']
by_id = {t['id']: t for t in tasks}
by_code = {}
for t in tasks:
    m = re.match(r'^(P\d+-\d+\.\d+(?:\.\d+)?)\s+', t.get('name', ''))
    if m:
        by_code[m.group(1)] = t['id']
missing = []
for code, parent_id in by_code.items():
    if not re.match(r'^P\d+-\d+\.\d+$', code):
        continue
    child_ids = [tid for c, tid in by_code.items() if c.startswith(code + '.')]
    if not child_ids:
        continue
    deps = []
    for d in by_id[parent_id].get('dependencies', []):
        if isinstance(d, dict) and 'taskId' in d:
            deps.append(d['taskId'])
        elif isinstance(d, str):
            deps.append(d)
    for child_id in child_ids:
        if child_id not in deps:
            missing.append((parent_id, child_id))
print('missing_parent_child_edges=', len(missing))
for p, c in missing:
    print(p, 'missing', c)
sys.exit(1 if missing else 0)
PY
```

## 🔍 Task Quality Validation

### Automated Quality Check

Run the quality check script to validate tasks against taskTemplate standards:

```bash
./scripts/task-quality-check.sh
```

This script validates 4 core metrics:

| Metric | Description | Pass Condition |
|--------|-------------|----------------|
| **Required Fields** | All 8 required fields present | 0 missing |
| **Estimated Minutes** | Values in [60, 90, 120, 180] | All valid |
| **Name Pattern** | Matches `^P\d+-\d+\.\d+(?:\.\d+)?\s+.+$` | 0 violations |
| **RelatedFiles Types** | Types in [TO_MODIFY, REFERENCE, CREATE, DEPENDENCY, OTHER] | All valid |

### Sample Output (All Checks Passed)

```
======================================
Task Quality Check for EveryShift MVP
======================================

Total tasks: 146

1️⃣  Required Fields Validation
   Checking: name, description, implementationGuide, verificationCriteria, phase, estimatedMinutes, dependencies, relatedFiles
   ✓ All required fields present

2️⃣  Estimated Minutes Validation
   Allowed values: [60, 90, 120, 180]
   ✓ All estimatedMinutes valid

3️⃣  Name Pattern Validation
   Pattern: ^P\d+-\d+\.\d+(?:\.\d+)?\s+.+$
   ✓ All task names match pattern

4️⃣  RelatedFiles Type Validation
   Allowed types: [TO_MODIFY, REFERENCE, CREATE, DEPENDENCY, OTHER]
   ✓ All relatedFiles.types valid

======================================
Summary
======================================
Total tasks: 146
1. Required fields: 0 issues
2. Estimated minutes: 0 issues
3. Name pattern: 0 violations
4. RelatedFiles types: 0 issues

✅ All checks passed! (0 issues)
```

### Quick jq Commands

For individual validation, use these jq commands:

```bash
# Check required fields
jq '[.tasks[] | select(.name == null or .name == "") | .id] | length' .shrimp-data/tasks.json

# Check estimatedMinutes
jq '[.tasks[] | select(.estimatedMinutes != 60 and .estimatedMinutes != 90 and .estimatedMinutes != 120 and .estimatedMinutes != 180) | .id] | length' .shrimp-data/tasks.json

# Check namePattern
jq '[.tasks[] | select(.name | test("^P[0-9]+-[0-9]+\\.[0-9]+(\\.[0-9]+)?\\s+.+") | not) | .id] | length' .shrimp-data/tasks.json

# Check relatedFiles.types
jq '[.tasks[] | .relatedFiles[]? | select(.type != "TO_MODIFY" and .type != "REFERENCE" and .type != "CREATE" and .type != "DEPENDENCY" and .type != "OTHER")] | length' .shrimp-data/tasks.json
```

## 🤝 Contributing

When adding new tasks:
1. Determine the appropriate phase
2. Add to the corresponding phase-X-*.json file
3. Update taskCount in metadata
4. Ensure task ID is unique
5. Run `./scripts/task-quality-check.sh` to validate
6. Update this README if needed

---

**Last Updated:** 2026-02-28
**Total Tasks:** 146
**Total Phases:** 9
**Quality Check:** ✅ All 4 metrics passing
