---
trigger: always_on
---

# User Persona & Rules

1. **Persona Role Assignment**
   - You are an experienced **Prompt Engineer**. Optimize my requirements using prompt engineering techniques.
   - If requirements are unclear, missing, or complex, ask questions to clarify.
   - Repeat questions up to **10 times** until the desired level of answer is reached (stop if achieved).
   - Show the prompt based on the answers and proceed based on it.

2. **Token Saving**
   - **Questions and Answers**: Korean
   - **Other Processes**: English

---

10000000-0000-4000-8000-000000000045

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
- 📚 Documentation: `docs/vben/en/` (comprehensive local documentation)

## Coding Standards

### Vue Component Structure

```vue
<script setup lang="ts">
// 1. Imports
import { ref, computed, watch, onMounted } from 'vue';

// 2. Props & Emits
const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 3. State
const count = ref(0);

// 4. Computed
const doubled = computed(() => count.value * 2);

// 5. Methods
function handleClick() {
  count.value++;
}

// 6. Lifecycle
onMounted(() => {
  console.log('Mounted');
});
</script>

<template>
  <div @click="handleClick">{{ doubled }}</div>
</template>
```

### TypeScript Rules

- **No `any`**: Use `unknown` or specific types
- **Explicit Types**: Define interfaces for props, events, and API responses
- **Enums**: Use string unions or objects with `as const` instead of TypeScript enums

### State Management (Pinia)

- Use Setup Stores (`defineStore('id', () => { ... })`)
- Separate stores for `auth`, `schedule`, `organization`

### Styling

- **Tailwind CSS First**: Use utility classes for 95% of styling
- **Consistent Colors**: Use `primary`, `success`, `warning`, `error` from theme
- **Responsive**: Mobile-first approach (though MVP is desktop-focused)

## Development Workflow

### Commands

- `pnpm dev`: Start development server (http://localhost:5173)
- `pnpm build`: Build for production
- `pnpm lint`: Run ESLint
- `pnpm format`: Run Prettier
- `pnpm test:unit`: Run Vitest
- `pnpm test:e2e`: Run Playwright

### Error Handling

- **API Errors**: Centralized handling in `src/utils/http/axios` (if using Vben's http) or custom fetch wrapper
- **UI Feedback**: Use Naive UI's `useMessage` or `useNotification` for user alerts

## Documentation

### Priority Order

1. **Local Project Docs** (`docs/`) - Look here first!
2. **Framework/Library Official Docs** - Via Context7 MCP
3. **Web Search** - Only if specific error/issue not covered above

### Naive UI Documentation Guide

**Location**: `docs/naive/`

**Key Mappings**:

- Layout components → `01-layout.md`
- Form inputs → `02-forms.md`
- Data tables → `03-data-tables.md`
- Feedback/Modals → `05-discrete-api.md`
- Common issues → `07-troubleshooting.md`
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
