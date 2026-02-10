---
name: vue-component-generator
description: "Use when: Creating Vue 3 components with Naive UI, Tailwind CSS, and TypeScript following project conventions"
version: "1.0.0"
author: "EveryShift Team"
tags: [vue, component, typescript, naive-ui, tailwind]
---

# Vue Component Generator

## Overview
Generate Vue 3 Single File Components with TypeScript, Naive UI integration, and Tailwind CSS utilities following EveryShift MVP conventions.

## When to Use
- Creating new UI components for the scheduling system
- Adding forms with Naive UI components (NForm, NInput, NButton)
- Building schedule-related components with grids
- Scaffolding components with proper TypeScript interfaces

## Core Capabilities
- Generate `<script setup lang="ts">` syntax
- Add TypeScript interfaces for Props and Emits
- Include Naive UI components integration
- Apply Tailwind CSS utility classes
- Follow project naming conventions

## Usage

### Basic Component
```bash
/component ComponentName --props="prop1:type1,prop2:type2" --emits="event1,event2"
```

### Form Component
```bash
/component ComponentName --type=form --props="data:DataType" --emits="submit,cancel"
```

### Grid Component
```bash
/component ComponentName --type=grid
```

## Parameters
- `name` (required) - Component name in PascalCase
- `--props` (optional) - Props definition: "prop1:type1,prop2:type2"
- `--emits` (optional) - Events definition: "event1,event2"
- `--type` (optional) - Component type: "basic" | "form" | "grid" (default: "basic")
- `--path` (optional) - Output path (default: src/components/)

## Examples

### Example 1: Simple Component
```bash
/component ShiftSelector --props="shifts:string[],selectedShift:string" --emits="select"
```

**Generates:**
```vue
<template>
  <div class="shift-selector">
    <!-- Component content -->
  </div>
</template>

<script setup lang="ts">
interface Props {
  shifts: string[];
  selectedShift: string;
}

interface Emits {
  (e: 'select', shiftCode: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
</script>

<style scoped>
/* Use Tailwind utilities preferentially */
</style>
```

### Example 2: Form Component
```bash
/component EmployeeForm --type=form --props="employee:Employee" --emits="submit,cancel"
```

**Generates:**
```vue
<template>
  <n-form
    ref="formRef"
    :model="formValue"
    :rules="rules"
    label-placement="left"
    label-width="120px"
    class="employee-form"
  >
    <n-form-item label="이름" path="name">
      <n-input v-model:value="formValue.name" placeholder="이름 입력" />
    </n-form-item>

    <n-form-item :show-label="false">
      <n-space>
        <n-button type="primary" @click="handleSubmit">저장</n-button>
        <n-button @click="handleCancel">취소</n-button>
      </n-space>
    </n-form-item>
  </n-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { NForm, NFormItem, NInput, NButton, NSpace } from 'naive-ui';
import type { FormInst, FormRules } from 'naive-ui';

interface Props {
  employee: Employee;
}

interface Emits {
  (e: 'submit', data: Employee): void;
  (e: 'cancel'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formRef = ref<FormInst | null>(null);
const formValue = reactive({ ...props.employee });

const rules: FormRules = {
  name: { required: true, message: '이름을 입력해주세요', trigger: 'blur' }
};

function handleSubmit() {
  formRef.value?.validate((errors) => {
    if (!errors) {
      emit('submit', formValue as Employee);
    }
  });
}

function handleCancel() {
  emit('cancel');
}
</script>
```

### Example 3: Grid Component
```bash
/component ScheduleGrid --type=grid
```

**Generates:**
```vue
<template>
  <div class="schedule-grid-wrapper text-sm">
    <div class="schedule-grid-container overflow-x-auto">
      <table class="schedule-grid w-full">
        <!-- Table structure with TanStack Table -->
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScheduleGrid } from '@/composables/useScheduleGrid';

// Grid implementation with TanStack Table
</script>

<style scoped>
/* Grid-specific styles */
</style>
```

## Best Practices
- Always use **PascalCase** for component names
- Define clear **TypeScript interfaces** for props/emits
- Leverage **Naive UI discrete API pattern** (window.$message via utility functions)
- Prefer **Tailwind utilities** over custom CSS
- Add **performance logging** in dev mode for complex components
- Use **optional chaining (?.)** for window.$ access
- Never call useMessage() directly in templates

## Reference Materials
- `reference/basic-component.vue.template` - Simple component structure
- `reference/form-component.vue.template` - Form with NForm and validation
- `reference/grid-component.vue.template` - TanStack Table integration
- `examples/shift-selector.example.md` - Real example from codebase

## Related Skills
- `/composable` - Generate composables for component logic
- `/store` - Generate Pinia stores for state management
- `/type` - Generate TypeScript type definitions

## Project-Specific Patterns

### Naive UI Integration
Use `src/utils/message.ts` for Naive UI global API:
```typescript
import { message } from '@/utils/message';

// Success
message.success('저장되었습니다');

// Error
message.error('오류가 발생했습니다');

// Warning
message.warning('확인이 필요합니다');
```

### Performance Logging
For complex components:
```typescript
if (import.meta.env.DEV) {
  console.log(`[ComponentName] Rendered in ${performance.now()}ms`);
}
```

## Limitations
- Grid components require TanStack Table setup (use `/type` first for grid data types)
- Complex forms may need additional validation rules
- Custom components may require manual refinement
