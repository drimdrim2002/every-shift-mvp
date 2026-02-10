---
name: supabase-api-generator
description: "Use when: Creating Supabase API functions with CRUD operations, TypeScript types, error handling, and Korean error messages"
version: "1.0.0"
author: "EveryShift Team"
tags: [supabase, api, typescript, crud, database]
---

# Supabase API Generator

## Overview
Generate Supabase API functions with CRUD operations, TypeScript types, error handling with Korean messages, optional pagination, and data transformation following EveryShift MVP conventions.

## When to Use
- Creating API modules for new database tables
- Adding CRUD operations for existing entities
- Implementing paginated queries for large datasets
- Setting up data transformation between snake_case and camelCase

## Core Capabilities
- Generate CRUD functions (get*, create*, update*, delete*, upsert*)
- TypeScript interfaces for request/response
- Error handling with Korean messages
- Optional pagination support
- Data transformation (snake_case ↔ camelCase)

## Usage

### Basic CRUD
```bash
/api {{TableName}} --operations="getAll,getById,create,update,delete"
```

### With Pagination
```bash
/api {{TableName}} --paginate
```

### With Data Transformation
```bash
/api {{TableName}} --transform
```

## Parameters
- `table` (required) - Table name in PascalCase (e.g., "Schedule", "Employee")
- `--operations` (optional) - CRUD operations: "getAll,getById,create,update,delete,upsert" (default: all)
- `--paginate` (flag) - Add pagination support for getAll
- `--transform` (flag) - Add data transformation logic
- `--path` (optional) - Output path (default: src/api/)

## Examples

### Example 1: Basic CRUD
```bash
/api Schedule
```

**Generates:**
```typescript
import { supabase } from './supabase';
import type { Schedule, ScheduleCreate, ScheduleUpdate } from '@/types/schedule';

// Get all schedules
export async function getSchedules(orgId: string): Promise<Schedule[]> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`근무표 조회 실패: ${error.message}`);
  return data as Schedule[];
}

// Get schedule by ID
export async function getScheduleById(scheduleId: string): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (error) throw new Error(`근무표 조회 실패: ${error.message}`);
  if (!data) throw new Error('근무표를 찾을 수 없습니다');
  return data as Schedule;
}

// Create schedule
export async function createSchedule(schedule: ScheduleCreate): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert(schedule)
    .select()
    .single();

  if (error) throw new Error(`근무표 생성 실패: ${error.message}`);
  return data as Schedule;
}

// Update schedule
export async function updateSchedule(scheduleId: string, updates: ScheduleUpdate): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw new Error(`근무표 수정 실패: ${error.message}`);
  return data as Schedule;
}

// Delete schedule
export async function deleteSchedule(scheduleId: string): Promise<void> {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) throw new Error(`근무표 삭제 실패: ${error.message}`);
}

// Upsert (create or update)
export async function upsertSchedule(schedule: ScheduleCreate & { id?: string }): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .upsert(schedule)
    .select()
    .single();

  if (error) throw new Error(`근무표 저장 실패: ${error.message}`);
  return data as Schedule;
}
```

### Example 2: Paginated Query
```bash
/api Assignment --paginate
```

**Generates:**
```typescript
import { supabase } from './supabase';
import type { Assignment } from '@/types/assignment';

// Get assignments with pagination
export async function getAssignments(
  scheduleId: string,
  page = 1,
  pageSize = 100
): Promise<Assignment[]> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('schedule_assignments')
    .select('*')
    .eq('schedule_id', scheduleId)
    .range(from, to)
    .order('employee_id');

  if (error) throw new Error(`근무표 배정 조회 실패: ${error.message}`);
  return data as Assignment[];
}

// Get total count for pagination
export async function getAssignmentsCount(scheduleId: string): Promise<number> {
  const { count, error } = await supabase
    .from('schedule_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('schedule_id', scheduleId);

  if (error) throw new Error(`배정 수 조회 실패: ${error.message}`);
  return count || 0;
}
```

### Example 3: With Data Transformation
```bash
/api Schedule --transform
```

**Generates:**
```typescript
import { supabase } from './supabase';
import type { Schedule, ScheduleCreate, ScheduleUpdate } from '@/types/schedule';

// Database response type (snake_case)
interface ScheduleDB {
  id: string;
  organization_id: string;
  month: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Transform to app type (camelCase)
function transformSchedule(db: ScheduleDB): Schedule {
  return {
    id: db.id,
    organizationId: db.organization_id,
    month: db.month,
    status: db.status,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// Transform to DB type (snake_case)
function transformToDB(schedule: ScheduleCreate): Record<string, any> {
  return {
    organization_id: schedule.organizationId,
    month: schedule.month,
    status: schedule.status,
  };
}

// Get with transformation
export async function getScheduleById(scheduleId: string): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single();

  if (error) throw new Error(`근무표 조회 실패: ${error.message}`);
  if (!data) throw new Error('근무표를 찾을 수 없습니다');

  return transformSchedule(data as ScheduleDB);
}

// Create with transformation
export async function createSchedule(schedule: ScheduleCreate): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .insert(transformToDB(schedule))
    .select()
    .single();

  if (error) throw new Error(`근무표 생성 실패: ${error.message}`);
  return transformSchedule(data as ScheduleDB);
}
```

## Best Practices
- Always use **PascalCase** for table names (e.g., `Schedule`, `Employee`)
- Function names should be **camelCase** with entity prefix (e.g., `getScheduleById`, `createEmployee`)
- Use **Korean error messages** for user-facing errors
- Throw errors with descriptive messages (don't swallow errors)
- Use **`maybeSingle()`** for optional queries (may return null)
- Use **`.single()`** for required queries (throws if not found)

## Reference Materials
- `reference/basic-api.ts.template` - Standard CRUD operations
- `reference/paginated-api.ts.template` - With pagination
- `examples/schedule-api.example.md` - Real example from codebase

## Related Skills
- `/type` - Generate TypeScript types for API request/response
- `/store` - Generate Pinia stores that use API functions
- `/composable` - Generate composables with API integration

## Project-Specific Patterns

### Error Handling Pattern
```typescript
if (error) throw new Error(`한글 에러 메시지: ${error.message}`);
```

### Pagination Pattern
```typescript
const from = (page - 1) * pageSize;
const to = from + pageSize - 1;

const { data } = await supabase
  .from('table')
  .select('*')
  .range(from, to);
```

### Status Update Pattern
```typescript
export async function updateScheduleStatus(
  scheduleId: string,
  status: 'created' | 'running' | 'complete' | 'error'
): Promise<Schedule> {
  const { data, error } = await supabase
    .from('schedules')
    .update({ status })
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) throw new Error(`상태 업데이트 실패: ${error.message}`);
  return data as Schedule;
}
```

## Limitations
- Complex joins require manual implementation
- Real-time subscriptions not included
- Row Level Security (RLS) policies must be configured separately
