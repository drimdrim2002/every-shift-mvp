# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EveryShift MVP** - A nurse scheduling system focused on generating fair shift schedules for hospitals. This MVP implements only the core schedule generation workflow (7장: Chapter 7 of the full system), reducing manual Excel-based scheduling from 4-8 hours to automated generation in seconds.

**Goal**: 90% reduction in schedule creation time with guaranteed fairness constraints
**Tech Stack**: Vue 3 + TypeScript + Vite + Supabase + TanStack Table

## Tech Stack

### Frontend

- **Framework**: Vue 3 (3.5.17) - Composition API
- **Language**: TypeScript (5.8.3)
- **Build**: Vite (6.3.5)
- **Styling**: Tailwind CSS (3.4.17)
- **Grid**: TanStack Table v8 (30×36 cells, 1080 cells)
- **State**: Pinia 2.x
- **UI**: Naive UI (2.42.0)
- **Utils**: Day.js, @vueuse/core, xlsx

### Backend

- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth (email/password)
- **RLS**: Admin-only access in MVP

### AI Solver (External)

- **Platform**: Google Cloud Run
- **Engine**: OptaPlanner (Java)
- **Status**: Mock responses in MVP

## Architecture Overview

### Core Workflow (4 Steps)

1. **Step 1 (기본 정보)**: Select planning month and confirm organization info
2. **Step 2 (사이트 정보)**: Set required staff per shift per day-of-week
3. **Step 3 (초기 데이터)**: Input previous month's schedule in 30×36 grid (핵심 컴포넌트)
4. **Step 4 (결과 확인)**: Review AI-generated schedule, manual edits, export to Excel

### Key Technical Decisions

**Grid Implementation**: TanStack Table v8 instead of Vben Admin's BasicTable

- Better performance for large grids (30 employees × 36 days)
- More flexibility for custom shift selector UI

**Vben Admin Usage**: Reference only

- ✅ Layout structure, routing patterns, composable patterns
- ❌ NOT using complex components (BasicTable, VbenForm, preference system)
- 📚 Documentation: `docs/vben/en/` (comprehensive Vben Admin reference)

**AI Solver Integration**: Mock responses in MVP

- Mock data in `api/solver.ts`
- Polling: status created → running → complete
- Real integration deferred post-MVP

### Data Model

**6 Core Tables**:

- `organizations` - Hospital info (seed: 1 org)
- `employees` - Staff (seed: 30 nurses)
- `shifts` - D/E/N/O definitions
- `schedules` - Monthly schedule metadata
- `schedule_assignments` - Individual assignments (employee × date)
- `site_requirements` - Required staff per shift per day-of-week

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

- `auth.ts` - Supabase authentication
- `organization.ts` - Org/employees/shifts (read-only from seed)
- `schedule.ts` - Wizard state, temporary data, AI solver polling

### Routing Structure

**Routes**:

- `/login` - Login page (public)
- `/schedule/step1` - Step1BasicInfo.vue (기본 정보)
- `/schedule/step2` - Step2SiteInfo.vue (사이트 정보)
- `/schedule/step3` - Step3InitialData.vue (초기 데이터)
- `/schedule/step4` - Step4Result.vue (결과 확인)

**Route Guards**:

- Authentication check → redirect to `/login`
- Step progression validation
- Data validation before navigation

### Component Architecture

**Critical Components**:

- **ScheduleGrid.vue** - TanStack Table (30×36 grid, 1080 cells)
- **ShiftSelector.vue** - D/E/N/O button group with color coding
- **StatisticsSummary.vue** - Real-time shift statistics
- **StepIndicator.vue** - Wizard progress indicator

**Layout Components**:

- DefaultLayout.vue, Header.vue, Sidebar.vue

**View Components**:

- Step1BasicInfo.vue, Step2SiteInfo.vue, Step3InitialData.vue, Step4Result.vue

### Key Technical Constraints

**Grid Simplification** (vs. Enhanced PRD):

- Max 30 employees (no virtual scrolling)
- 36 days total (5 previous + 31 current)
- Only name column is sticky
- Basic statistics only

**MVP Exclusions**:

- User registration/approval flow
- Organization/employee CRUD (seed data only)
- Dashboard and analytics
- Internationalization (Korean only)
- Mobile responsiveness

## Important Patterns

### Composables Strategy

**useScheduleGrid.ts** - Grid data management

- Grid data structure and cell updates with reactivity
- TanStack Table integration
- Date calculation utilities

**useAISolver.ts** - AI Solver integration

- Polling mechanism (5-second intervals)
- Status: created → running → complete/error
- Mock data generation for MVP

**useAuth.ts** - Authentication wrapper

- Supabase auth abstraction
- Session persistence
- Route guard integration

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
- Debounced saves (500ms)
- Auto-restore on page refresh
- Cleared on successful AI generation

### Validation Rules

**Step 3 Previous Month Validation**:

- Previous month's last 5 days MUST be filled (required for AI solver)
- Current month data is optional
- Validation triggers on "생성" button click
- Missing cells highlighted with red border

**Shift Availability Check**:

- Each employee has `available_shifts` JSONB array (e.g., ["D","E","N","O"])
- ShiftSelector only shows available shifts
- UI disables unavailable shift buttons

## Database Conventions

### UUID Usage

- All primary keys use `gen_random_uuid()`
- Fixed seed UUID: `'00000000-0000-0000-0000-000000000001'`

### Timestamps

- `created_at` - Insertion timestamp (DEFAULT NOW())
- `updated_at` - Last modification timestamp

### Enums as VARCHAR

- `shifts.code` - 'D', 'E', 'N', 'O', 'H'
- `schedules.status` - 'created', 'running', 'complete', 'changed', 'error'
- `organizations.type` - 'hospital', 'fire', 'police'

### JSONB Fields

- `employees.available_shifts` - Array of shift codes: ["D","E","N","O"]

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

**Key Directories**:

- `src/components/schedule/` - Core scheduling components (80% of complexity)
- `src/views/schedule/` - 4-step wizard pages
- `src/composables/` - Reusable logic (grid, solver, auth)
- `src/stores/` - Pinia state management
- `src/api/` - Backend communication layer
- `src/types/` - TypeScript definitions

**Key Files**:

- `src/components/schedule/ScheduleGrid.vue` - [CRITICAL] TanStack Table grid
- `src/composables/useScheduleGrid.ts` - Grid data management
- `src/composables/useAISolver.ts` - AI Solver integration
- `src/stores/schedule.ts` - Schedule workflow state

## Important Notes for AI Development

1. **Simplified MVP Scope**: Do not implement features marked as "Out-of-Scope"
2. **No CRUD for Seed Data**: Organizations, employees, and shifts are read-only
3. **Mock AI Solver**: Always use mock responses
4. **Grid is Critical**: 80% of development effort focuses on Step 3 ScheduleGrid component
5. **Korean UI**: All user-facing text is in Korean; comments can be English
6. **Tailwind Only**: Use Tailwind CSS utilities; avoid custom CSS unless absolutely necessary
7. **Naive UI Components**: Leverage Naive UI for forms, modals, buttons (not grid/table)
8. **External Library Usage**: When a task can be significantly simplified by installing external tools or libraries (e.g., ImageMagick for image processing, Pillow for Python image manipulation, sharp for Node.js image processing), ALWAYS prefer installing and using the appropriate tool rather than implementing complex manual solutions. Check for tool availability first with `which <tool>` or try importing the library, then install if needed using the appropriate package manager (apt-get, pip, npm, etc.)

## Documentation Lookup Strategy

**Priority Order** (ALWAYS follow this sequence):

1. **Local Documentation First** (Primary Source)
   - Naive UI: `docs/naive/*.md`
   - Vben Admin: `docs/vben/en/guide/`
   - Project PRD: `docs/prd/*.md`

2. **Context7 MCP** (When local docs insufficient)
   - Trigger: Missing implementation details, API changes, advanced patterns
   - Use for: Official documentation, framework updates, best practices
   - Example: "Local docs don't cover X, checking Context7 for Naive UI X documentation"

3. **WebSearch/Official Sites** (Last Resort)
   - Only when Context7 unavailable or insufficient
   - Use official sites: naiveui.com, vben.pro

**Integration Rule**: When using Context7 or WebSearch, **always cross-reference with local documentation** to ensure consistency with project patterns.

## Naive UI Global API Usage

### CRITICAL Pattern

This project uses **createDiscreteApi** (configured in `main.ts`).
**Core Rule**: Never access `window.$message` directly in templates. Always wrap in methods.

### Mandatory Rules

1. NEVER access window.$ directly in templates
2. ALWAYS use optional chaining (?.)
3. NEVER use Provider pattern with createDiscreteApi
4. NEVER call useMessage() outside setup context

### Common Errors

See `docs/naive/troubleshooting.md` for detailed solutions:

- Provider context errors → Use createDiscreteApi pattern
- Undefined errors → Wrap in methods with optional chaining
- HMR errors → Full browser refresh or use utility functions

### Documentation

Naive UI documentation organized by purpose (7 files):
- **`00-quick-reference.md`** - Types, imports, frequently used patterns (⚡ read first)
- **`01-setup.md`** - Installation, configuration, theme customization
- **`02-forms.md`** - Form, Input, Select, Button components
- **`03-data-tables.md`** - DataTable implementation guide
- **`04-feedback.md`** - Modal, Dialog, Message, Notification
- **`05-discrete-api.md`** - createDiscreteApi (window.$message) **⭐ PROJECT CORE**
- **`06-patterns.md`** - Practical development patterns
- **`07-troubleshooting.md`** - Problem solving & resources

**Reading Strategy**:
- Form implementation → Read `00-quick-reference.md` + `02-forms.md`
- Table implementation → Read `00-quick-reference.md` + `03-data-tables.md`
- Global message/dialog → Read `00-quick-reference.md` + `05-discrete-api.md`
- Error fixing → Read `07-troubleshooting.md`
- **If insufficient** → Use Context7 MCP for Naive UI official docs

### Utility Functions

Use `src/utils/message.ts` for cleaner code. Global types already configured in `src/types/global.d.ts`.

## Troubleshooting Quick Reference

### Grid Performance

- Use `v-memo` on table rows
- Cache computed statistics
- Check for unnecessary `watch` with `deep: true`

### AI Solver Polling

- Ensure cleanup on component unmount with `onUnmounted()`

### Supabase Connection

- Check `.env.local` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart Vite after .env changes

### Statistics Calculation

- Use `watch` with `deep: true` for nested object changes
- Ensure assignments array is properly reactive (`ref` or `reactive`)

## Reference Documentation

### Internal

- `docs/prd/01-overview-architecture.md` - Project overview, tech stack, architecture

### Vben Admin Documentation

**Location**: `docs/vben/en/`

**Reading Strategy**:
- Layout/routing work → Read `guide/introduction/` + `guide/essentials/route.md`
- Component patterns → Read `guide/essentials/` + `guide/in-depth/`
- Build/configuration → Read `guide/project/` (vite, tailwindcss, standard)
- Authentication → Read `guide/in-depth/login.md` + `guide/in-depth/access.md`
- **If insufficient** → Use Context7 MCP for Vben Admin official docs

**Key Documents**:
- **Introduction**: `guide/introduction/vben.md`, `guide/introduction/quick-start.md`
- **Essentials**: `guide/essentials/concept.md`, `guide/essentials/route.md`, `guide/essentials/development.md`
- **Project Setup**: `guide/project/dir.md`, `guide/project/vite.md`, `guide/project/tailwindcss.md`
- **In-Depth**: `guide/in-depth/layout.md`, `guide/in-depth/theme.md`, `guide/in-depth/access.md`

### External

- Supabase: https://supabase.com/docs
- TanStack Table: https://tanstack.com/table/v8/docs/guide/introduction
- Naive UI: https://www.naiveui.com/en-US/os-theme
- Vue 3: https://vuejs.org/guide/introduction.html
- Tailwind CSS: https://tailwindcss.com/docs
