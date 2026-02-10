---
name: vue-composable-generator
description: "Use when: Creating Vue 3 composables with reactive state, TypeScript types, and proper cleanup patterns"
version: "1.0.0"
author: "EveryShift Team"
tags: [vue, composable, typescript, reactive, state-management]
---

# Vue Composable Generator

## Overview
Generate Vue 3 composables with reactive state management, TypeScript types, error handling, and proper cleanup patterns following EveryShift MVP conventions.

## When to Use
- Creating reusable business logic
- Encapsulating complex state management
- Implementing polling/async operations
- Sharing logic between components

## Core Capabilities
- Generate composable with `ref` for reactive state
- Add `computed` for derived state
- Include functions with error handling
- Add `onUnmounted` cleanup (if needed)
- TypeScript return types

## Usage

### Basic Composable
```bash
/composable use{{ComposableName}} --refs="status,error,data" --computed="isLoading"
```

### Polling Composable
```bash
/composable use{{ComposableName}} --refs="status,progress" --polling
```

### With Functions
```bash
/composable use{{ComposableName}} --functions="fetchData,submitData,reset"
```

## Parameters
- `name` (required) - Composable name with "use" prefix (camelCase)
- `--refs` (optional) - Reactive state: "ref1,ref2,ref3"
- `--computed` (optional) - Computed properties: "comp1,comp2"
- `--functions` (optional) - Functions to generate: "func1,func2"
- `--polling` (flag) - Add polling logic with cleanup
- `--persist` (flag) - Add localStorage persistence
- `--path` (optional) - Output path (default: src/composables/)

## Examples

### Example 1: Basic Composable
```bash
/composable useScheduleData --refs="status,error,data" --computed="isLoading"
```

**Generates:**
```typescript
import { ref, computed } from 'vue';

export function useScheduleData() {
  // Reactive state
  const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
  const error = ref<string | null>(null);
  const data = ref<ScheduleData | null>(null);

  // Computed
  const isLoading = computed(() => status.value === 'loading');

  // Functions
  async function fetchData() {
    status.value = 'loading';
    error.value = null;

    try {
      // Implementation
      status.value = 'success';
    } catch (e: any) {
      error.value = e.message;
      status.value = 'error';
    }
  }

  function reset() {
    status.value = 'idle';
    error.value = null;
    data.value = null;
  }

  return {
    status,
    error,
    data,
    isLoading,
    fetchData,
    reset,
  };
}
```

### Example 2: Polling Composable
```bash
/composable useAISolver --refs="status,progress" --polling
```

**Generates:**
```typescript
import { ref, onUnmounted } from 'vue';

export function useAISolver() {
  const status = ref<'created' | 'running' | 'complete' | 'error'>('created');
  const progress = ref<number>(0);
  const error = ref<string | null>(null);

  const maxPollingAttempts = 120; // 10 minutes
  let pollingAttempts = 0;
  let pollingInterval: number | null = null;

  function startPolling(scheduleId: string) {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingAttempts = 0;

    pollingInterval = window.setInterval(async () => {
      pollingAttempts++;

      if (pollingAttempts > maxPollingAttempts) {
        stopPolling();
        error.value = 'Timeout: Operation exceeded 10 minutes';
        status.value = 'error';
        return;
      }

      try {
        // Polling logic
        const response = await checkStatus(scheduleId);
        status.value = response.status;

        if (response.status === 'complete') {
          stopPolling();
          progress.value = 100;
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 5000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  onUnmounted(() => {
    stopPolling();
  });

  return {
    status,
    progress,
    error,
    startPolling,
    stopPolling,
  };
}
```

### Example 3: Composable with Persistence
```bash
/composable useScheduleGrid --persist
```

**Generates:**
```typescript
import { ref, watch } from 'vue';

export function useScheduleGrid() {
  const assignments = ref<AssignmentMap>({});

  // Load from localStorage
  function loadFromStorage() {
    const stored = localStorage.getItem('everyshift_assignments');
    if (stored) {
      assignments.value = JSON.parse(stored);
    }
  }

  // Save to localStorage
  function saveToStorage() {
    localStorage.setItem('everyshift_assignments', JSON.stringify(assignments.value));
  }

  // Watch for changes and persist
  watch(
    assignments,
    (newVal) => {
      localStorage.setItem('everyshift_assignments', JSON.stringify(newVal));
    },
    { deep: true }
  );

  // Functions
  function setAssignment(employeeId: string, date: string, shiftCode: string) {
    if (!assignments.value[employeeId]) {
      assignments.value[employeeId] = {};
    }
    assignments.value[employeeId][date] = shiftCode;
  }

  function reset() {
    assignments.value = {};
    localStorage.removeItem('everyshift_assignments');
  }

  return {
    assignments,
    loadFromStorage,
    setAssignment,
    reset,
  };
}
```

## Best Practices
- Always use **camelCase** with "use" prefix (e.g., `useScheduleData`)
- Use **`ref`** for primitive values
- Use **`computed`** for derived state
- Add **`onUnmounted`** cleanup for intervals/event listeners
- Include **error handling** with try-catch
- Return **consistent object** with state, methods, and computed properties

## Reference Materials
- `reference/basic-composable.ts.template` - Standard composable structure
- `reference/polling-composable.ts.template` - With polling + cleanup
- `examples/use-ai-solver.example.md` - Real example from codebase

## Related Skills
- `/component` - Generate components that use composables
- `/store` - Generate Pinia stores for global state
- `/type` - Generate TypeScript types

## Project-Specific Patterns

### Error Handling Pattern
```typescript
try {
  // Operation
  status.value = 'success';
} catch (e: any) {
  error.value = e.message || 'Unknown error occurred';
  status.value = 'error';
  throw e; // Re-throw if caller needs to handle
}
```

### Polling Pattern
Based on [src/composables/useAISolver.ts](../src/composables/useAISolver.ts):
- 5-second intervals
- 120 attempt limit (10 minutes)
- Automatic cleanup on unmount

### Persistence Pattern
```typescript
// Watch with deep: true for nested objects
watch(data, (newVal) => {
  localStorage.setItem(key, JSON.stringify(newVal));
}, { deep: true });
```

## Limitations
- Complex async logic may need additional refinement
- Polling intervals should be tuned to use case
- Persistence requires JSON-serializable data
