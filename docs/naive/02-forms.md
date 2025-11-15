# Naive UI Forms Guide

> Form, Input, Select, Button 컴포넌트

## Form & Validation

### 기본 폼

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NForm, NFormItem, NInput, NButton, type FormInst, type FormRules } from 'naive-ui';

const formRef = ref<FormInst | null>(null);

interface ModelType {
  username: string;
  email: string;
  password: string;
}

const model = ref<ModelType>({
  username: '',
  email: '',
  password: '',
});

const rules: FormRules = {
  username: [
    {
      required: true,
      message: '사용자명을 입력하세요',
      trigger: 'blur',
    },
    {
      min: 3,
      max: 20,
      message: '3-20자 사이로 입력하세요',
      trigger: 'blur',
    },
  ],
  email: [
    {
      required: true,
      message: '이메일을 입력하세요',
      trigger: ['blur', 'input'],
    },
    {
      type: 'email',
      message: '올바른 이메일 형식이 아닙니다',
      trigger: ['blur', 'input'],
    },
  ],
  password: [
    {
      required: true,
      message: '비밀번호를 입력하세요',
      trigger: 'blur',
    },
    {
      min: 6,
      message: '최소 6자 이상 입력하세요',
      trigger: 'blur',
    },
  ],
};

const handleSubmit = async (e: MouseEvent) => {
  e.preventDefault();

  try {
    await formRef.value?.validate();
    console.log('폼 유효성 검사 통과:', model.value);
    // API 호출 등
  } catch (errors) {
    console.error('유효성 검사 실패:', errors);
  }
};
</script>

<template>
  <n-form
    ref="formRef"
    :model="model"
    :rules="rules"
    label-placement="left"
    label-width="auto"
    require-mark-placement="right-hanging"
  >
    <n-form-item label="사용자명" path="username">
      <n-input v-model:value="model.username" placeholder="사용자명 입력" />
    </n-form-item>

    <n-form-item label="이메일" path="email">
      <n-input v-model:value="model.email" placeholder="이메일 입력" />
    </n-form-item>

    <n-form-item label="비밀번호" path="password">
      <n-input
        v-model:value="model.password"
        type="password"
        show-password-on="mousedown"
        placeholder="비밀번호 입력"
      />
    </n-form-item>

    <n-form-item>
      <n-button type="primary" @click="handleSubmit"> 제출 </n-button>
    </n-form-item>
  </n-form>
</template>
```

### 커스텀 Validator

```typescript
import type { FormItemRule } from 'naive-ui';

const rules: FormRules = {
  password: [
    {
      required: true,
      validator(rule: FormItemRule, value: string) {
        if (!value) {
          return new Error('비밀번호를 입력하세요');
        }
        if (value.length < 8) {
          return new Error('최소 8자 이상 입력하세요');
        }
        if (!/[A-Z]/.test(value)) {
          return new Error('대문자를 포함해야 합니다');
        }
        if (!/[a-z]/.test(value)) {
          return new Error('소문자를 포함해야 합니다');
        }
        if (!/[0-9]/.test(value)) {
          return new Error('숫자를 포함해야 합니다');
        }
        return true;
      },
      trigger: ['blur', 'input'],
    },
  ],
};
```

### 비동기 Validator (서버 검증)

```typescript
const rules: FormRules = {
  username: [
    {
      required: true,
      message: '사용자명을 입력하세요',
      trigger: 'blur',
    },
    {
      async validator(rule: FormItemRule, value: string) {
        if (!value) {
          return true; // required 규칙에서 처리됨
        }

        // 서버에 중복 체크
        const response = await fetch(`/api/check-username?username=${value}`);
        const data = await response.json();

        if (data.exists) {
          return new Error('이미 사용 중인 사용자명입니다');
        }
        return true;
      },
      trigger: 'blur',
    },
  ],
};
```

---

## Input

```vue
<script setup lang="ts">
import { ref } from 'vue';

const inputValue = ref('');
const passwordValue = ref('');
const textareaValue = ref('');
</script>

<template>
  <!-- 기본 Input -->
  <n-input v-model:value="inputValue" placeholder="입력하세요" clearable />

  <!-- Password Input -->
  <n-input
    v-model:value="passwordValue"
    type="password"
    show-password-on="mousedown"
    placeholder="비밀번호"
  />

  <!-- Textarea -->
  <n-input v-model:value="textareaValue" type="textarea" :rows="3" placeholder="여러 줄 입력" />

  <!-- 접두사/접미사 -->
  <n-input placeholder="검색">
    <template #prefix>
      <n-icon><SearchOutline /></n-icon>
    </template>
  </n-input>

  <n-input placeholder="가격">
    <template #suffix>원</template>
  </n-input>

  <!-- InputNumber -->
  <n-input-number v-model:value="numberValue" :min="0" :max="100" :step="5" />
</template>
```

---

## Select

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { type SelectOption } from 'naive-ui';

const value = ref<string | null>(null);
const multipleValue = ref<string[]>([]);

const options: SelectOption[] = [
  { label: '옵션 1', value: 'option1' },
  { label: '옵션 2', value: 'option2' },
  { label: '옵션 3', value: 'option3', disabled: true },
  { label: '옵션 4', value: 'option4' },
];

const groupOptions: SelectOption[] = [
  {
    type: 'group',
    label: '그룹 1',
    key: 'group1',
    children: [
      { label: '항목 1', value: 'item1' },
      { label: '항목 2', value: 'item2' },
    ],
  },
  {
    type: 'group',
    label: '그룹 2',
    key: 'group2',
    children: [
      { label: '항목 3', value: 'item3' },
      { label: '항목 4', value: 'item4' },
    ],
  },
];
</script>

<template>
  <!-- 기본 Select -->
  <n-select v-model:value="value" :options="options" placeholder="선택하세요" />

  <!-- Multiple Select -->
  <n-select v-model:value="multipleValue" :options="options" multiple placeholder="여러 개 선택" />

  <!-- Grouped Select -->
  <n-select v-model:value="value" :options="groupOptions" placeholder="그룹 선택" />

  <!-- Filterable Select -->
  <n-select v-model:value="value" :options="options" filterable placeholder="검색 가능" />
</template>
```

---

## Button

```vue
<template>
  <!-- 타입 -->
  <n-button>기본</n-button>
  <n-button type="primary">Primary</n-button>
  <n-button type="info">Info</n-button>
  <n-button type="success">Success</n-button>
  <n-button type="warning">Warning</n-button>
  <n-button type="error">Error</n-button>

  <!-- 크기 -->
  <n-button size="tiny">Tiny</n-button>
  <n-button size="small">Small</n-button>
  <n-button size="medium">Medium</n-button>
  <n-button size="large">Large</n-button>

  <!-- 스타일 -->
  <n-button>기본</n-button>
  <n-button ghost>Ghost</n-button>
  <n-button text>Text</n-button>
  <n-button dashed>Dashed</n-button>
  <n-button quaternary>Quaternary</n-button>

  <!-- 상태 -->
  <n-button disabled>Disabled</n-button>
  <n-button loading>Loading</n-button>

  <!-- 아이콘 -->
  <n-button>
    <template #icon>
      <n-icon><SaveOutline /></n-icon>
    </template>
    저장
  </n-button>

  <!-- 블록 -->
  <n-button block>Block Button</n-button>
</template>
```

---

## API와 통합된 Form 패턴

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import type { FormInst } from 'naive-ui';

const formRef = ref<FormInst | null>(null);
const loading = ref(false);
const message = useMessage();

interface FormData {
  username: string;
  email: string;
}

const formData = ref<FormData>({
  username: '',
  email: '',
});

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();

    loading.value = true;
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData.value),
    });

    if (response.ok) {
      message.success('저장되었습니다');
      // 폼 초기화
      formData.value = { username: '', email: '' };
    } else {
      const error = await response.json();
      message.error(error.message || '저장 실패');
    }
  } catch (errors) {
    console.error('유효성 검사 실패:', errors);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <n-form ref="formRef" :model="formData" :rules="rules">
    <n-form-item label="사용자명" path="username">
      <n-input v-model:value="formData.username" />
    </n-form-item>
    <n-form-item label="이메일" path="email">
      <n-input v-model:value="formData.email" />
    </n-form-item>
    <n-button type="primary" :loading="loading" @click="handleSubmit"> 저장 </n-button>
  </n-form>
</template>
```

**⚠️ 본 프로젝트에서는 window.$message 사용**
- `useMessage()` 대신 `window.$message?.success()` 패턴
- 자세한 내용: `05-discrete-api.md` 참조

---

## 문제 해결

### Form Validation이 작동하지 않음

**해결책**:

1. `ref` 제대로 연결 확인:
```vue
<n-form ref="formRef" :model="model" :rules="rules"></n-form>
```

2. `path` 속성 확인:
```vue
<n-form-item path="username">
  <n-input v-model:value="model.username" />
</n-form-item>
```

3. `validate()` 호출 방법:
```typescript
await formRef.value?.validate();
```

---

**관련 문서**:
- 빠른 참조: `00-quick-reference.md`
- 데이터 테이블: `03-data-tables.md`
- 실전 패턴: `06-patterns.md`
