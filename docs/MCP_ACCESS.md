# MCP Access Rules for EveryShift MVP

## Supabase MCP Status

**Current Configuration**: Read-Only Mode

- Global config uses `--read-only` flag
- Disabled in `.claude/settings.local.json`
- Only SELECT queries allowed via MCP (when enabled)

## Read vs Write Operations

### READ Operations (Allowed via MCP or API)

**MCP Tools** (when enabled):
- `mcp__supabase__list_projects`
- `mcp__supabase__get_project`
- `mcp__supabase__list_tables`
- `mcp__supabase__list_migrations`
- `mcp__supabase__execute_sql` with SELECT queries only
- `mcp__supabase__search_docs`

**API Layer**:
- `src/api/*.ts` functions with SELECT queries

### WRITE Operations (API Layer ONLY)

All INSERT/UPDATE/DELETE operations MUST use API layer functions:

**Schedule API** (`src/api/schedule.ts`):
- `createSchedule(orgId, month, year)` - Create new schedule
- `updateScheduleStatus(scheduleId, status)` - Update schedule status
- `createAssignments(assignments)` - Bulk insert assignments
- `updateAssignment(assignmentId, data)` - Update single assignment
- `deleteAssignment(assignmentId)` - Delete assignment

**Employee API** (`src/api/employee.ts`):
- Employee CRUD operations

**Organization API** (`src/api/organization.ts`):
- Organization CRUD operations

## API Layer Pattern

Always use existing API functions for write operations:

```typescript
// Correct: Use API layer
import { createSchedule } from '@/api/schedule';
await createSchedule(orgId, month);

// Incorrect: Do NOT use MCP for writes
// mcp__supabase__execute_sql "INSERT INTO schedules ..."
```

## For Agents

Before any database operation:

1. **Check if operation is READ or WRITE**
2. **READ**: May use MCP tools (if available) or API layer
3. **WRITE**: MUST use API layer functions in `src/api/`

## Error Handling

When MCP write operations fail:

1. Recognize the error indicates MCP read-only mode
2. Switch to using API layer functions
3. Do NOT attempt to reconfigure MCP settings

## Reference Documentation

- CLAUDE.md - Main project documentation
- AGENTS.md - Agent-specific guidelines
- GEMINI.md - Gemini/coding agent guidelines
- `.claude/skills/*/SKILL.md` - Skill-specific MCP constraints
