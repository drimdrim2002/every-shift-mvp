# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EveryShift MVP** - A nurse scheduling system focused on generating fair shift schedules for hospitals. This MVP implements only the core schedule generation workflow (7장: Chapter 7 of the full system), reducing manual Excel-based scheduling from 4-8 hours to automated generation in seconds.

**Goal**: 90% reduction in schedule creation time with guaranteed fairness constraints
**Timeline**: 8-week MVP development cycle
**Tech Stack**: Vue 3 + TypeScript + Vite + Supabase + TanStack Table

## Development Commands

### Setup & Installation
```bash
# Create project (if starting fresh)
npm create vite@latest everyshift-mvp -- --template vue-ts
cd everyshift-mvp
npm install

# Install all dependencies
npm install naive-ui @tanstack/vue-table pinia vue-router@4 @supabase/supabase-js dayjs @vueuse/core xlsx
npm install -D tailwindcss@3.4.17 postcss autoprefixer
npx tailwindcss init -p
```

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Database Setup
```bash
# Install Supabase CLI (optional)
npm install -g supabase

# Alternative: Use Supabase SQL Editor directly
# 1. Go to https://supabase.com
# 2. Open SQL Editor
# 3. Run migrations from supabase/migrations/001_initial_schema.sql
# 4. Run seed data from supabase/seed.sql
```

## Architecture Overview

### Core Workflow (4 Steps)

The application implements a wizard-style workflow for schedule generation:

1. **Step 1 (기본 정보)**: Select planning month and confirm organization info
2. **Step 2 (사이트 정보)**: Set required staff per shift per day-of-week
3. **Step 3 (초기 데이터)**: Input previous month's schedule in 30×36 grid (핵심 컴포넌트)
4. **Step 4 (결과 확인)**: Review AI-generated schedule, manual edits, export to Excel

### Key Technical Decisions

**Grid Implementation**: TanStack Table v8 is used instead of Vben Admin's BasicTable because:
- Better performance for large grids (30 employees × 36 days = 1080 cells)
- More flexibility for custom shift selector UI
- Simpler API for this specific use case

**Vben Admin Usage**: Partially adopted for reference only:
- ✅ Layout structure (DefaultLayout + Header + Sidebar)
- ✅ Routing patterns and auth guards
- ✅ Composable patterns and folder structure
- ❌ NOT using Vben's complex components (BasicTable, VbenForm, preference system)

**AI Solver Integration**: Google Cloud Run endpoint exists but MVP uses mock responses:
- Mock data generation in `api/solver.ts`
- Polling mechanism simulates async processing (status: created → running → complete)
- Real integration deferred post-MVP

### Data Model

**6 Core Tables** (simplified from 13 in full spec):
- `organizations` - Hospital/organization info (seed: 1 org)
- `employees` - Staff members (seed: 30 nurses)
- `shifts` - Shift definitions (D/E/N/O = Day/Evening/Night/Off)
- `schedules` - Monthly schedule metadata with AI scores
- `schedule_assignments` - Individual shift assignments (employee × date)
- `site_requirements` - Required staff count per shift per day-of-week

**Key Relationships**:
```
organizations
  ├─→ employees (30 per org)
  ├─→ shifts (D, E, N, O)
  └─→ schedules
        └─→ schedule_assignments (employee + date + shift)
```

### State Management

**Pinia Stores**:
- `auth.ts` - Supabase authentication (email/password only)
- `organization.ts` - Organization, employees, shifts (read-only from seed)
- `schedule.ts` - Schedule creation workflow state (steps 1-4)

**Store Responsibilities**:
- Auth store: Login/logout, session management, route guard integration
- Organization store: Load and cache org data (no CRUD operations in MVP)
- Schedule store: Wizard state, temporary data, AI solver status polling

### Component Architecture

**Critical Components**:

1. **ScheduleGrid.vue** (가장 중요)
   - TanStack Table implementation for 30×36 grid
   - Renders 1080 cells with ShiftSelector in each cell
   - Props: `data`, `readonly`, `showPreviousMonth`
   - Events: `@update:data` for bidirectional binding
   - Features: Sticky name column, 3-level headers, row/column statistics

2. **ShiftSelector.vue**
   - Button group for D/E/N/O shift selection
   - Props: `modelValue`, `availableShifts`, `disabled`
   - Color coding: D=#92D050, E=#FFC000, N=#4472C4, O=#D9D9D9
   - Keyboard accessible (Space/Enter to toggle)

3. **StepIndicator.vue**
   - Progress indicator for 4-step wizard
   - Props: `currentStep`, `steps`
   - Visual: ● (active) ○ (inactive)

**Layout Components**:
- DefaultLayout.vue - Main application shell (Naive UI n-layout)
- Header.vue - Top navigation with user info
- Sidebar.vue - Navigation menu (minimal in MVP)

### Key Technical Constraints

**Grid Simplification** (vs. Enhanced PRD):
- Max 30 employees (no virtual scrolling needed)
- 36 days total (5 previous + 31 current month)
- 3-level headers included
- Only name column is sticky (not multiple columns)
- Basic statistics only (no real-time constraint validation)
- No keyboard shortcuts or pattern copy features

**MVP Exclusions**:
- User registration/approval flow (simplified to email/password)
- Organization/employee CRUD (seed data only)
- Dashboard and analytics
- Notification system
- Internationalization (Korean only)
- Mobile responsiveness
- Complex RLS policies (admin-only access)

## Important Patterns

### Composables Strategy

**useScheduleGrid.ts** - Grid data management:
```typescript
// Manages grid data structure
// Handles cell updates with reactivity
// Integrates with TanStack Table
// Provides utility functions for date calculations
```

**useAISolver.ts** - AI Solver integration:
```typescript
// Polling mechanism (5-second intervals)
// Status state machine: created → running → complete/error
// Mock data generation for MVP
// Error handling and retry logic
```

**useAuth.ts** - Authentication wrapper:
```typescript
// Supabase auth abstraction
// Session persistence
// Route guard integration
```

### Data Flow Patterns

**Step 3 → AI Solver → Step 4**:
1. User inputs data in Step 3 grid
2. Data saved to Pinia store + localStorage (temporary)
3. "생성" button creates schedule record (status='created')
4. AI Solver API called (mock in MVP)
5. Status polling every 5s checks schedule.status
6. When complete, navigate to Step 4
7. Step 4 loads schedule_assignments and displays in grid

**Temporary Storage**:
- LocalStorage key: `everyshift_temp_schedule_{month}`
- Debounced saves (500ms) to avoid excessive writes
- Auto-restore on page refresh
- Cleared on successful AI generation

### Validation Rules

**Step 3 Previous Month Validation** (전월 데이터 검증):
- Previous month's last 5 days MUST be filled (required for AI solver)
- Current month data is optional (AI can generate from scratch)
- Validation triggers on "생성" button click
- Missing cells highlighted with red border
- Validation error modal blocks progression

**Shift Availability Check**:
- Each employee has `available_shifts` JSONB array (e.g., ["D","E","N","O"])
- ShiftSelector only shows available shifts
- UI disables unavailable shift buttons (grayed out)

## Database Conventions

### UUID Usage
- All primary keys use `gen_random_uuid()`
- Fixed seed UUID for testing: `'00000000-0000-0000-0000-000000000001'`

### Timestamps
- `created_at` - Insertion timestamp (DEFAULT NOW())
- `updated_at` - Last modification timestamp (updated via trigger or manually)

### Enums as VARCHAR
- `shifts.code` - 'D', 'E', 'N', 'O', 'H'
- `schedules.status` - 'created', 'running', 'complete', 'changed', 'error'
- `organizations.type` - 'hospital', 'fire', 'police'

### JSONB Fields
- `employees.available_shifts` - Array of shift codes: ["D","E","N","O"]
- Future-proof for adding more metadata without schema changes

## Common Issues & Solutions

### Supabase Connection Issues
```bash
# Check environment variables
cat .env.local

# Ensure format:
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx...

# Restart Vite after .env changes
npm run dev
```

### Grid Performance Issues
If 30×36 grid renders slowly (>2 seconds):
- Use `v-memo` on table rows for Vue optimization
- Ensure ShiftSelector component uses `defineProps` with proper TypeScript
- Cache computed statistics to avoid recalculation on every render
- Check for unnecessary watchers with `deep: true`

### AI Solver Polling Stops
Ensure cleanup on component unmount:
```typescript
onUnmounted(() => {
  stopPolling(); // Clear interval
});
```

### Statistics Calculation Errors
Common reactivity issues:
- Use `watch` with `deep: true` for nested object changes
- Ensure assignments array is properly reactive (use `ref` or `reactive`)
- Debug with: `console.log(toRaw(assignments.value))`

## Testing Strategy

### Manual Testing Checklist
1. **Auth Flow**: Login → Dashboard → Logout
2. **Step 1**: Month selection, org info display
3. **Step 2**: Site requirements grid (7 days × 3 shifts)
4. **Step 3**:
   - Previous month data input (5 days)
   - ShiftSelector interaction
   - Statistics auto-calculation
   - Validation on empty previous month
   - Temporary save/restore
5. **Step 4**:
   - AI status polling display
   - Result grid display
   - Manual editing
   - Excel download
6. **Full Flow**: Step 1 → 2 → 3 → AI Generation → Step 4 → Save

### Seed Data Testing
- Organization: 세브란스병원 (1 org)
- Employees: 30 nurses with Korean names
- Shifts: D (08:00-16:00), E (16:00-00:00), N (00:00-08:00), O (Off)
- Test account: admin@everyshift.com / password

## Code Style Conventions

### Vue 3 Composition API
- Use `<script setup>` syntax
- Prefer `ref` over `reactive` for primitive values
- Use `computed` for derived state
- Use `watch` for side effects only

### TypeScript
- Define interfaces in `types/` directory
- Use strict mode
- Avoid `any` type (use `unknown` if needed)
- Export types alongside implementation

### Naming Conventions
- Components: PascalCase (ScheduleGrid.vue)
- Composables: camelCase with "use" prefix (useScheduleGrid.ts)
- Stores: camelCase (scheduleStore)
- API functions: camelCase (loadSchedule)
- Types/Interfaces: PascalCase (Schedule, Employee)

### File Organization
```
src/
├── components/       # UI components
│   ├── layout/      # Layout shells
│   ├── schedule/    # Domain-specific components
│   └── ui/          # Generic UI components
├── composables/     # Reusable composition functions
├── stores/          # Pinia stores
├── views/           # Page-level components
├── api/             # API client functions
├── types/           # TypeScript definitions
└── utils/           # Pure utility functions
```

## Important Notes for AI Development

1. **Simplified MVP Scope**: Do not implement features marked as "Out-of-Scope" in PRD section 1.2
2. **No CRUD for Seed Data**: Organizations, employees, and shifts are read-only (loaded from seed)
3. **Mock AI Solver**: Always use mock responses; do not attempt real Google Cloud Run integration
4. **Grid is Critical**: 80% of development effort focuses on Step 3 ScheduleGrid component
5. **Korean UI**: All user-facing text is in Korean; comments can be English
6. **Tailwind Only**: Use Tailwind CSS utilities; avoid custom CSS unless absolutely necessary
7. **Naive UI Components**: Leverage Naive UI for forms, modals, buttons (not grid/table)

## Reference Documentation

- **PRD.md**: Complete product requirements (read sections 4.3, 5.1 for grid details)
- Supabase Docs: https://supabase.com/docs
- TanStack Table: https://tanstack.com/table/v8/docs/guide/introduction
- Naive UI: https://www.naiveui.com/en-US/os-theme
- Vue 3: https://vuejs.org/guide/introduction.html
