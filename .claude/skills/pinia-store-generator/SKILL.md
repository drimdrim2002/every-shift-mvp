---
name: pinia-store-generator
description: "Use when: Creating Pinia stores with Composition API style, TypeScript interfaces, and optional localStorage persistence"
version: "1.0.0"
author: "EveryShift Team"
tags: [pinia, store, state-management, typescript, vue]
---

# Pinia Store Generator

## Overview
Generate Pinia stores with Composition API style, TypeScript interfaces, state management, actions, getters, and optional localStorage persistence following EveryShift MVP conventions.

## When to Use
- Creating global state management
- Managing multi-step wizard state
- Sharing state across components
- Persisting application state

## Core Capabilities
- Generate store with Composition API (`defineStore`)
- Add state with `ref`
- Include actions and computed getters
- TypeScript interfaces for state
- Optional localStorage persistence
- Reset function

## Usage

### Basic Store
```bash
/store {{StoreName}}
```

### Store with Persistence
```bash
/store {{StoreName}} --persist
```

### Store with Getters
```bash
/store {{StoreName}} --getters="isReady,itemCount"
```

## Parameters
- `name` (required) - Store name in camelCase (without "Store" suffix)
- `--state` (optional) - State properties: "prop1:type1,prop2:type2"
- `--actions` (optional) - Action methods: "action1,action2"
- `--getters` (optional) - Computed getters: "getter1,getter2"
- `--persist` (flag) - Add localStorage persistence
- `--path` (optional) - Output path (default: src/stores/)

## Examples

### Example 1: Basic Store
```bash
/store auth
```

**Generates:**
```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Session } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const session = ref<Session | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  // Actions
  function setUser(userData: User | null) {
    user.value = userData;
  }

  function setSession(sessionData: Session | null) {
    session.value = sessionData;
  }

  function logout() {
    user.value = null;
    session.value = null;
  }

  return {
    // State
    user,
    session,
    // Getters
    isAuthenticated,
    // Actions
    setUser,
    setSession,
    logout,
  };
});
```

### Example 2: Store with Persistence
```bash
/store schedule --persist
```

**Generates:**
```typescript
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { ScheduleBasicInfo, AssignmentMap } from '@/types/schedule';

const STORAGE_KEY = 'everyshift_schedule';

export const useScheduleStore = defineStore('schedule', () => {
  // State
  const basicInfo = ref<ScheduleBasicInfo | null>(null);
  const assignments = ref<AssignmentMap>({});

  // Getters
  const scheduleId = computed(() => basicInfo.value?.scheduleId ?? null);

  // Actions
  function setBasicInfo(info: ScheduleBasicInfo) {
    basicInfo.value = info;
  }

  function setAssignments(data: AssignmentMap) {
    assignments.value = data;
  }

  function reset() {
    basicInfo.value = null;
    assignments.value = {};
  }

  // Persistence
  function loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        basicInfo.value = data.basicInfo;
        assignments.value = data.assignments || {};
      } catch (e) {
        console.error('[ScheduleStore] Failed to load from storage:', e);
      }
    }
  }

  function saveToStorage() {
    const data = {
      basicInfo: basicInfo.value,
      assignments: assignments.value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // Watch for changes and persist
  watch(
    [basicInfo, assignments],
    () => {
      saveToStorage();
    },
    { deep: true }
  );

  return {
    // State
    basicInfo,
    assignments,
    // Getters
    scheduleId,
    // Actions
    setBasicInfo,
    setAssignments,
    reset,
    loadFromStorage,
  };
});
```

### Example 3: Multi-Step Wizard Store
```bash
/store schedule --state="currentStep:basicInfo,siteRequirements,employees" --actions="nextStep,prevStep,canProceed"
```

**Generates:**
```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useScheduleStore = defineStore('schedule', () => {
  // Step 1: 기본 정보
  const basicInfo = ref<ScheduleBasicInfo | null>(null);

  // Step 2: 사이트 정보
  const siteRequirements = ref<SiteRequirementList>([]);

  // Step 3: 직원 정보
  const employees = ref<EmployeeInput[]>([]);

  // Current step
  const currentStep = ref<number>(1);

  // Getters
  const scheduleId = computed(() => basicInfo.value?.scheduleId ?? null);
  const isStep1Complete = computed(() => !!basicInfo.value);
  const isStep2Complete = computed(() => siteRequirements.value.length > 0);
  const isStep3Complete = computed(() => employees.value.length > 0);

  // Actions
  function setBasicInfo(info: ScheduleBasicInfo) {
    basicInfo.value = info;
  }

  function setSiteRequirements(reqs: SiteRequirementList) {
    siteRequirements.value = reqs;
  }

  function setEmployees(data: EmployeeInput[]) {
    employees.value = data;
  }

  function nextStep() {
    if (canProceed()) {
      currentStep.value++;
    }
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  }

  function canProceed(): boolean {
    switch (currentStep.value) {
      case 1:
        return isStep1Complete.value;
      case 2:
        return isStep2Complete.value;
      case 3:
        return isStep3Complete.value;
      default:
        return false;
    }
  }

  function reset() {
    basicInfo.value = null;
    siteRequirements.value = [];
    employees.value = [];
    currentStep.value = 1;
  }

  return {
    // State
    basicInfo,
    siteRequirements,
    employees,
    currentStep,
    // Getters
    scheduleId,
    isStep1Complete,
    isStep2Complete,
    isStep3Complete,
    // Actions
    setBasicInfo,
    setSiteRequirements,
    setEmployees,
    nextStep,
    prevStep,
    canProceed,
    reset,
  };
});
```

## Best Practices
- Always use **camelCase** for store name (e.g., `auth`, `schedule`)
- Store name becomes the `use{{StoreName}}Store` function name
- Use **`ref`** for state (not `reactive`)
- Use **`computed`** for getters
- Group returns by category (State, Getters, Actions)
- Include a **`reset()`** function for cleanup

## Reference Materials
- `reference/basic-store.ts.template` - Standard store structure
- `examples/auth-store.example.md` - Simple store example
- `examples/schedule-store.example.md` - Multi-step wizard store example

## Related Skills
- `/composable` - Generate composables for local state
- `/component` - Generate components that use stores
- `/type` - Generate TypeScript types for store state

## Project-Specific Patterns

### Store Naming
- Store name: `auth` → Function: `useAuthStore()`
- Store file: `src/stores/auth.ts`

### State Persistence Pattern
```typescript
// Watch for changes
watch(state, (newVal) => {
  localStorage.setItem(key, JSON.stringify(newVal));
}, { deep: true });

// Load on initialization
function loadFromStorage() {
  const stored = localStorage.getItem(key);
  if (stored) {
    state.value = JSON.parse(stored);
  }
}
```

### Multi-Step Wizard Pattern
Based on [src/stores/schedule.ts](../src/stores/schedule.ts):
- Separate state for each step
- Computed properties for completion checks
- `nextStep()`/`prevStep()` with validation
- Reset function to clear all state

## Limitations
- Complex derived state may need additional computed properties
- Persistence works only with JSON-serializable data
- Large datasets may impact performance with `deep: true` watchers
