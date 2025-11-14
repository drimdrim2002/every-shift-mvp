# Naive UI 완벽 가이드

> Vue 3 전용 컴포넌트 라이브러리
> 최신 버전: 2.43.1 | TypeScript 완벽 지원 | 90+ 컴포넌트

## 목차

1. [개요](#개요)
2. [설치](#설치)
3. [기본 설정](#기본-설정)
4. [TypeScript 설정](#typescript-설정)
5. [테마 커스터마이징](#테마-커스터마이징)
6. [주요 컴포넌트](#주요-컴포넌트)
7. [자동 Import 설정](#자동-import-설정)
8. [아이콘 사용](#아이콘-사용)
9. [일반적인 패턴](#일반적인-패턴)
10. [문제 해결](#문제-해결)

---

## 개요

### 특징

- **Vue 3 전용**: Vue 3.0.5 이상 필요
- **TypeScript 기반**: 완벽한 타입 안정성
- **90+ 컴포넌트**: 대부분의 UI 요구사항 충족
- **CSS 불필요**: CSS 파일 import 없이 사용 가능
- **Tree-shaking 지원**: 사용한 컴포넌트만 번들에 포함
- **테마 커스터마이징**: 고급 타입 안전 테마 시스템
- **빠른 성능**: Virtual list로 대용량 데이터 처리
- **다크 모드**: 기본 지원

### 언제 사용하면 좋은가?

- Vue 3 프로젝트
- TypeScript 프로젝트
- 관리자 대시보드, 백오피스 시스템
- 데이터 집약적 애플리케이션
- 빠른 프로토타이핑

---

## 설치

### npm/yarn/pnpm

```bash
# npm
npm install naive-ui

# yarn
yarn add naive-ui

# pnpm
pnpm install naive-ui
```

### 아이콘 라이브러리 (선택사항, 권장)

```bash
# xicons - Naive UI 권장 아이콘 라이브러리
npm install @vicons/fluent    # Fluent UI 아이콘
npm install @vicons/ionicons5 # IonIcons
npm install @vicons/antd      # Ant Design 아이콘
npm install @vicons/material  # Material Design 아이콘
npm install @vicons/tabler    # Tabler 아이콘
npm install @vicons/carbon    # Carbon 아이콘
```

---

## 기본 설정

### 방법 1: 전역 등록 (작은 프로젝트)

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import naive from 'naive-ui';

const app = createApp(App);
app.use(naive);
app.mount('#app');
```

### 방법 2: 개별 Import (권장)

```vue
<script setup lang="ts">
import { NButton, NInput, NCard } from 'naive-ui';
</script>

<template>
  <n-card title="카드 제목">
    <n-input placeholder="입력하세요" />
    <n-button type="primary">제출</n-button>
  </n-card>
</template>
```

### 방법 3: App.vue에서 Config Provider 설정

```vue
<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
} from 'naive-ui';
</script>

<template>
  <n-config-provider>
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <router-view />
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>
```

---

## TypeScript 설정

### tsconfig.json 설정

```json
{
  "compilerOptions": {
    "types": ["naive-ui/volar"]
  }
}
```

### Volar 플러그인 사용 시

자동 완성과 타입 체크가 완벽하게 작동합니다.

```typescript
// 타입 안전한 사용
import type { FormInst, FormItemRule, FormRules } from 'naive-ui';

const formRef = ref<FormInst | null>(null);

interface ModelType {
  username: string;
  password: string;
}

const model = ref<ModelType>({
  username: '',
  password: '',
});

const rules: FormRules = {
  username: {
    required: true,
    message: '사용자명을 입력하세요',
    trigger: 'blur',
  },
};
```

---

## 테마 커스터마이징

### 다크 모드 설정

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NConfigProvider, darkTheme } from 'naive-ui';

const isDark = ref(false);
</script>

<template>
  <n-config-provider :theme="isDark ? darkTheme : null">
    <n-button @click="isDark = !isDark"> 테마 전환 </n-button>
    <!-- 앱 컴포넌트들 -->
  </n-config-provider>
</template>
```

### 글로벌 테마 오버라이드

```vue
<script setup lang="ts">
import { NConfigProvider, type GlobalThemeOverrides } from 'naive-ui';

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#FF6B6B',
    primaryColorHover: '#FF8787',
    primaryColorPressed: '#FA5252',
    borderRadius: '8px',
    fontSize: '14px',
  },
  Button: {
    textColor: '#FFFFFF',
    fontWeight: '600',
  },
  Input: {
    borderRadius: '6px',
  },
};
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <!-- 앱 컴포넌트들 -->
  </n-config-provider>
</template>
```

### 라이트/다크 테마별 오버라이드

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { NConfigProvider, darkTheme, type GlobalThemeOverrides } from 'naive-ui';

const isDark = ref(false);
const theme = computed(() => (isDark.value ? darkTheme : null));

const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#18A058',
  },
};

const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#63E2B7',
  },
};

const themeOverrides = computed(() => (isDark.value ? darkThemeOverrides : lightThemeOverrides));
</script>

<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <!-- 앱 -->
  </n-config-provider>
</template>
```

### 컴포넌트별 테마 (Peers)

```typescript
const themeOverrides: GlobalThemeOverrides = {
  Select: {
    peers: {
      InternalSelection: {
        textColor: '#FF0000',
      },
      InternalSelectMenu: {
        borderRadius: '8px',
      },
    },
  },
};
```

---

## 주요 컴포넌트

### 1. Form & Validation

#### 기본 폼

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

#### 커스텀 Validator

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

#### 비동기 Validator (서버 검증)

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

### 2. Data Table

#### 기본 테이블

```vue
<script setup lang="ts">
import { ref, h } from 'vue';
import { NDataTable, NButton, type DataTableColumns } from 'naive-ui';

interface RowData {
  id: number;
  name: string;
  age: number;
  email: string;
}

const data = ref<RowData[]>([
  { id: 1, name: '홍길동', age: 25, email: 'hong@example.com' },
  { id: 2, name: '김철수', age: 30, email: 'kim@example.com' },
  { id: 3, name: '이영희', age: 28, email: 'lee@example.com' },
]);

const columns: DataTableColumns<RowData> = [
  {
    title: 'ID',
    key: 'id',
    width: 80,
    sorter: 'default',
  },
  {
    title: '이름',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
    filter: true,
    filterOptions: [
      { label: '홍길동', value: '홍길동' },
      { label: '김철수', value: '김철수' },
    ],
  },
  {
    title: '나이',
    key: 'age',
    sorter: 'default',
    defaultSortOrder: 'ascend',
  },
  {
    title: '이메일',
    key: 'email',
  },
  {
    title: '작업',
    key: 'actions',
    render(row) {
      return h(
        NButton,
        {
          size: 'small',
          onClick: () => handleEdit(row),
        },
        { default: () => '편집' }
      );
    },
  },
];

const handleEdit = (row: RowData) => {
  console.log('편집:', row);
};
</script>

<template>
  <n-data-table :columns="columns" :data="data" :pagination="{ pageSize: 10 }" :bordered="false" />
</template>
```

#### 선택 가능한 테이블

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NDataTable, type DataTableColumns, type DataTableRowKey } from 'naive-ui';

interface RowData {
  id: number;
  name: string;
}

const data = ref<RowData[]>([
  { id: 1, name: '항목 1' },
  { id: 2, name: '항목 2' },
  { id: 3, name: '항목 3' },
]);

const checkedRowKeys = ref<DataTableRowKey[]>([]);

const columns: DataTableColumns<RowData> = [
  {
    type: 'selection',
  },
  {
    title: 'ID',
    key: 'id',
  },
  {
    title: '이름',
    key: 'name',
  },
];

const rowKey = (row: RowData) => row.id;
</script>

<template>
  <n-data-table
    :columns="columns"
    :data="data"
    :row-key="rowKey"
    v-model:checked-row-keys="checkedRowKeys"
  />

  <div>선택된 항목: {{ checkedRowKeys }}</div>
</template>
```

#### 페이지네이션

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';
import { NDataTable } from 'naive-ui';

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    pagination.page = page;
    loadData();
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize;
    pagination.page = 1;
    loadData();
  },
});

const loadData = () => {
  // API 호출
  console.log(`페이지 ${pagination.page}, 크기 ${pagination.pageSize}`);
};
</script>

<template>
  <n-data-table :columns="columns" :data="data" :pagination="pagination" />
</template>
```

### 3. Button

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

### 4. Input

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

### 5. Select

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

### 6. Modal (Dialog)

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NModal, NButton, NCard } from 'naive-ui';
import { useMessage, useDialog } from 'naive-ui';

const showModal = ref(false);

// Message API
const message = useMessage();
const showSuccess = () => {
  message.success('성공 메시지');
};
const showError = () => {
  message.error('에러 메시지');
};

// Dialog API
const dialog = useDialog();
const showConfirm = () => {
  dialog.warning({
    title: '확인',
    content: '정말 삭제하시겠습니까?',
    positiveText: '확인',
    negativeText: '취소',
    onPositiveClick: () => {
      message.success('삭제되었습니다');
    },
  });
};
</script>

<template>
  <!-- Modal -->
  <n-button @click="showModal = true">모달 열기</n-button>

  <n-modal v-model:show="showModal">
    <n-card
      style="width: 600px"
      title="모달 제목"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <template #header-extra>
        <n-button text @click="showModal = false"> ✕ </n-button>
      </template>

      모달 내용

      <template #footer>
        <n-space justify="end">
          <n-button @click="showModal = false">취소</n-button>
          <n-button type="primary" @click="showModal = false">확인</n-button>
        </n-space>
      </template>
    </n-card>
  </n-modal>

  <!-- Message -->
  <n-button @click="showSuccess">성공 메시지</n-button>
  <n-button @click="showError">에러 메시지</n-button>

  <!-- Dialog -->
  <n-button @click="showConfirm">확인 다이얼로그</n-button>
</template>
```

### 7. Notification

```vue
<script setup lang="ts">
import { useNotification } from 'naive-ui';

const notification = useNotification();

const showNotification = () => {
  notification.create({
    title: '알림 제목',
    content: '알림 내용입니다.',
    meta: '방금 전',
    duration: 3000,
    keepAliveOnHover: true,
  });
};

const showSuccessNotification = () => {
  notification.success({
    title: '성공',
    content: '작업이 성공적으로 완료되었습니다.',
    duration: 2500,
  });
};
</script>

<template>
  <n-button @click="showNotification">알림 표시</n-button>
  <n-button @click="showSuccessNotification">성공 알림</n-button>
</template>
```

---

## 자동 Import 설정

### Vite 프로젝트

```bash
npm install -D unplugin-vue-components
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [NaiveUiResolver()],
    }),
  ],
});
```

이제 컴포넌트를 자동으로 import할 수 있습니다:

```vue
<template>
  <!-- import 없이 바로 사용 가능 -->
  <n-button>버튼</n-button>
  <n-input placeholder="입력" />
</template>

<!-- <script setup>에서 import 불필요 -->
```

### Webpack 프로젝트

```javascript
// webpack.config.js
const Components = require('unplugin-vue-components/webpack');
const { NaiveUiResolver } = require('unplugin-vue-components/resolvers');

module.exports = {
  plugins: [
    Components({
      resolvers: [NaiveUiResolver()],
    }),
  ],
};
```

---

## 아이콘 사용

Naive UI는 **xicons**를 권장합니다.

### 설치

```bash
# 원하는 아이콘 세트 선택
npm install @vicons/fluent
npm install @vicons/ionicons5
npm install @vicons/antd
npm install @vicons/material
```

### 사용법

```vue
<script setup lang="ts">
import { NIcon, NButton } from 'naive-ui';
import { SaveOutline, SearchOutline, DeleteOutline } from '@vicons/ionicons5';
</script>

<template>
  <!-- 단독 아이콘 -->
  <n-icon :size="24" color="#18A058">
    <SaveOutline />
  </n-icon>

  <!-- 버튼 내 아이콘 -->
  <n-button>
    <template #icon>
      <n-icon><SearchOutline /></n-icon>
    </template>
    검색
  </n-button>

  <!-- Input 내 아이콘 -->
  <n-input placeholder="검색">
    <template #prefix>
      <n-icon><SearchOutline /></n-icon>
    </template>
  </n-input>
</template>
```

---

## 일반적인 패턴

### 1. 반응형 레이아웃

```vue
<script setup lang="ts">
import { NGrid, NGi, NCard } from 'naive-ui'
</script>

<template>
  <n-grid :x-gap="12" :y-gap="12" :cols="24">
    <n-gi :span="24 :xs="24" :sm="12" :md="8" :lg="6">
      <n-card>카드 1</n-card>
    </n-gi>
    <n-gi :span="24" :xs="24" :sm="12" :md="8" :lg="6">
      <n-card>카드 2</n-card>
    </n-gi>
    <n-gi :span="24" :xs="24" :sm="12" :md="8" :lg="6">
      <n-card>카드 3</n-card>
    </n-gi>
  </n-grid>
</template>
```

### 2. 로딩 상태 관리

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { NSpin, NButton } from 'naive-ui';

const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    // API 호출
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <n-spin :show="loading">
    <div>
      <n-button @click="fetchData" :loading="loading"> 데이터 불러오기 </n-button>
      <!-- 콘텐츠 -->
    </div>
  </n-spin>
</template>
```

### 3. API와 통합된 Form

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

### 4. 조건부 렌더링

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { NEmpty, NResult } from 'naive-ui';

const data = ref([]);
const loading = ref(false);
const error = ref<string | null>(null);

const isEmpty = computed(() => !loading.value && data.value.length === 0);
const hasError = computed(() => !loading.value && error.value !== null);
</script>

<template>
  <n-spin :show="loading">
    <!-- 에러 상태 -->
    <n-result v-if="hasError" status="error" title="오류 발생" :description="error">
      <template #footer>
        <n-button @click="retry">다시 시도</n-button>
      </template>
    </n-result>

    <!-- 빈 상태 -->
    <n-empty v-else-if="isEmpty" description="데이터가 없습니다" />

    <!-- 데이터 표시 -->
    <n-data-table v-else :columns="columns" :data="data" />
  </n-spin>
</template>
```

---

## setup 외부에서 사용하기 (Discrete API)

### createDiscreteApi란?

`useMessage`, `useDialog`, `useNotification`, `useLoadingBar`는 일반적으로 Vue 컴포넌트의 `setup()` 내부에서만 사용 가능합니다. 하지만 다음과 같은 상황에서는 setup 외부에서 사용해야 할 수 있습니다:

- **유틸리티 함수**: API 호출 중 에러 메시지 표시
- **전역 에러 핸들러**: 앱 전체의 에러를 중앙에서 처리
- **라우터 가드**: 네비게이션 전/후 메시지 표시
- **비동기 함수**: Promise 체인에서 알림 표시

이런 경우 `createDiscreteApi`를 사용합니다.

### createDiscreteApi 사용법

#### 1. main.ts에서 설정

```typescript
// main.ts
import { createApp } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import App from './App.vue';

// Discrete API 생성 (Provider 불필요)
const { message, dialog, notification, loadingBar } = createDiscreteApi([
  'message',
  'dialog',
  'notification',
  'loadingBar',
]);

// window 객체에 전역 할당
window.$message = message;
window.$dialog = dialog;
window.$notification = notification;
window.$loadingBar = loadingBar;

const app = createApp(App);
app.mount('#app');
```

#### 2. 타입 정의 추가

```typescript
// src/types/global.d.ts
import type {
  DialogApi,
  LoadingBarApi,
  MessageApi,
  NotificationApi,
} from 'naive-ui';

declare global {
  interface Window {
    $message: MessageApi;
    $dialog: DialogApi;
    $notification: NotificationApi;
    $loadingBar: LoadingBarApi;
  }
}

export {};
```

#### 3. tsconfig에 타입 추가

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "types": ["vite/client", "naive-ui/volar"]
  }
}
```

#### 4. 컴포넌트에서 사용

```vue
<script setup lang="ts">
// ✅ 올바른 방법: 메서드로 래핑
const showSuccess = () => {
  window.$message?.success('성공 메시지!');
};

const showError = () => {
  window.$message?.error('에러 메시지!');
};

// ❌ 잘못된 방법: 템플릿에서 직접 호출 금지!
// <NButton @click="window.$message.success('메시지')">
</script>

<template>
  <n-space>
    <n-button @click="showSuccess">Success</n-button>
    <n-button @click="showError">Error</n-button>
  </n-space>
</template>
```

#### 5. 유틸리티 함수에서 사용

```typescript
// src/utils/api.ts
export async function fetchUserData(id: string) {
  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();

    window.$message?.success('데이터 로드 완료!');
    return data;
  } catch (error) {
    window.$message?.error('데이터 로드 실패!');
    throw error;
  }
}
```

### createDiscreteApi 주의사항

⚠️ **중요한 제약사항:**

1. **setup 내부에서 호출 금지**
   ```typescript
   // ❌ 절대 하지 마세요!
   export default defineComponent({
     setup() {
       const { message } = createDiscreteApi(['message']); // 에러 발생!
     }
   });
   ```

2. **Provider와 혼용 금지**
   ```vue
   <!-- ❌ 같은 앱에서 혼용하지 마세요 -->
   <n-message-provider> <!-- Provider 방식 -->
     <MyComponent /> <!-- createDiscreteApi 사용 시 충돌 -->
   </n-message-provider>
   ```

3. **Config 동기화 필요**
   - createDiscreteApi는 `n-config-provider`의 설정을 자동으로 받지 않습니다
   - 테마나 설정을 공유하려면 수동으로 동기화해야 합니다:

   ```typescript
   const { message } = createDiscreteApi(
     ['message'],
     {
       configProviderProps: {
         theme: darkTheme,
         locale: zhCN,
       },
     }
   );
   ```

### 안전한 사용 패턴

#### 패턴 1: 유틸리티 함수로 래핑

```typescript
// src/utils/message.ts
export const message = {
  success: (content: string) => {
    if (!window.$message) {
      console.error('[ERROR] window.$message not initialized');
      return;
    }
    window.$message.success(content);
  },
  error: (content: string) => {
    window.$message?.error(content);
  },
  warning: (content: string) => {
    window.$message?.warning(content);
  },
  info: (content: string) => {
    window.$message?.info(content);
  },
};

// 사용
import { message } from '@/utils/message';
message.success('저장되었습니다!');
```

#### 패턴 2: Composable로 사용

```typescript
// src/composables/useGlobalMessage.ts
export function useGlobalMessage() {
  const showSuccess = (content: string) => {
    window.$message?.success(content);
  };

  const showError = (content: string) => {
    window.$message?.error(content);
  };

  const showWarning = (content: string) => {
    window.$message?.warning(content);
  };

  const showInfo = (content: string) => {
    window.$message?.info(content);
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

// 컴포넌트에서 사용
<script setup lang="ts">
import { useGlobalMessage } from '@/composables/useGlobalMessage';

const { showSuccess, showError } = useGlobalMessage();
</script>
```

### Provider 방식 vs Discrete API 방식

| 특징 | Provider 방식 | Discrete API 방식 |
|------|--------------|------------------|
| **사용 위치** | setup 내부만 | setup 외부 가능 |
| **Provider 필요** | 필요 (`<n-message-provider>`) | 불필요 |
| **Config 동기화** | 자동 | 수동 |
| **권장 사용처** | 컴포넌트 내부 | 유틸리티 함수, 전역 사용 |
| **타이밍 이슈** | 있음 (Provider 마운트 후) | 없음 (즉시 사용 가능) |

### 권장 사용 시나리오

**Provider 방식을 사용하세요:**
- 컴포넌트 내부에서만 사용
- Config Provider 설정을 공유해야 할 때
- 테마 변경에 자동으로 반응해야 할 때

**Discrete API 방식을 사용하세요:**
- setup 외부에서 사용 (유틸리티, 라우터 가드 등)
- 전역 에러 핸들러
- 앱 전체에서 일관된 방식으로 사용
- **본 프로젝트처럼 전역 window 객체로 사용하는 경우** ✅

---

## 문제 해결

### 1. CSS 스타일 충돌 (Tailwind CSS와 함께 사용 시)

Naive UI는 인라인 스타일을 사용하므로 대부분 문제없지만, Tailwind의 base 스타일이 충돌할 수 있습니다.

**해결책:**

```css
/* tailwind.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Naive UI 우선순위 높이기 */
.n-button,
.n-input,
.n-select {
  all: revert;
}
```

또는 Tailwind preflight 비활성화:

```javascript
// tailwind.config.js
module.exports = {
  corePlugins: {
    preflight: false, // Tailwind base 스타일 비활성화
  },
};
```

### 2. TypeScript 타입 에러

**문제:** `Cannot find module 'naive-ui' or its corresponding type declarations`

**해결책:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["naive-ui/volar"],
    "moduleResolution": "bundler"
  }
}
```

### 3. 다크 모드에서 깜빡임

**문제:** 페이지 로드 시 라이트 모드가 잠깐 보임

**해결책:**

```vue
<script setup lang="ts">
import { onBeforeMount } from 'vue';
import { darkTheme } from 'naive-ui';

const isDark = ref(false);

onBeforeMount(() => {
  // localStorage에서 테마 설정 불러오기
  const savedTheme = localStorage.getItem('theme');
  isDark.value = savedTheme === 'dark';
});
</script>

<template>
  <n-config-provider :theme="isDark ? darkTheme : null">
    <!-- 앱 -->
  </n-config-provider>
</template>
```

### 4. Message/Dialog API가 작동하지 않음

**문제:** `useMessage()` 또는 `useDialog()`를 호출하면 에러 발생

**해결책:**

App.vue에 Provider 추가:

```vue
<template>
  <n-message-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <router-view />
      </n-notification-provider>
    </n-dialog-provider>
  </n-message-provider>
</template>
```

### 4-1. window.$message undefined 에러 (createDiscreteApi 사용 시)

**문제:** `Cannot read properties of undefined (reading '$message')`

**증상:**
- 템플릿에서 `window.$message.success()` 호출 시 에러
- 버튼 클릭 시 undefined 접근 에러 발생

**원인:**
1. **타이밍 이슈**: Vue 템플릿 컴파일 시점에 `window.$message`가 아직 할당되지 않음
2. **HMR 캐시**: Vite 개발 서버의 Hot Module Reload가 main.ts를 완전히 재실행하지 않음

**해결책:**

#### 방법 1: 메서드로 래핑 (✅ 권장)

```vue
<script setup lang="ts">
// ❌ 잘못된 방법
// <NButton @click="window.$message.success('메시지')">

// ✅ 올바른 방법
const showSuccess = () => {
  window.$message?.success('성공 메시지!');
};

const showError = () => {
  window.$message?.error('에러 메시지!');
};
</script>

<template>
  <n-space>
    <n-button @click="showSuccess">Success</n-button>
    <n-button @click="showError">Error</n-button>
  </n-space>
</template>
```

**왜 이 방법이 안전한가?**
- 메서드는 **클릭 시점(런타임)**에 실행되므로 `window.$message`가 이미 할당됨
- Optional chaining (`?.`)으로 undefined 에러 방지
- 디버깅 및 에러 처리 추가 가능

#### 방법 2: Composable 사용

```typescript
// src/composables/useGlobalMessage.ts
export function useGlobalMessage() {
  const showSuccess = (content: string) => {
    window.$message?.success(content);
  };

  const showError = (content: string) => {
    window.$message?.error(content);
  };

  return { showSuccess, showError };
}

// 컴포넌트에서 사용
<script setup lang="ts">
import { useGlobalMessage } from '@/composables/useGlobalMessage';

const { showSuccess, showError } = useGlobalMessage();
</script>

<template>
  <n-button @click="showSuccess('성공!')">Success</n-button>
</template>
```

#### 방법 3: 유틸리티 함수 사용

```typescript
// src/utils/message.ts
export const message = {
  success: (content: string) => window.$message?.success(content),
  error: (content: string) => window.$message?.error(content),
  warning: (content: string) => window.$message?.warning(content),
  info: (content: string) => window.$message?.info(content),
};

// 사용
import { message } from '@/utils/message';
message.success('저장되었습니다!');
```

#### 방법 4: 개발 서버 완전 재시작 (HMR 캐시 문제 해결)

```bash
# 1. 개발 서버 중지 (Ctrl+C)
# 2. 브라우저에서 Hard Refresh
#    - Windows/Linux: Ctrl + Shift + R
#    - Mac: Cmd + Shift + R
# 3. 개발 서버 재시작
npm run dev
```

### 4-2. useMessage() Provider context 에러

**문제:** `[naive/use-message]: No outer <n-message-provider /> founded`

**증상:**
- `useMessage()`를 호출하면 Provider를 찾을 수 없다는 에러
- `onMounted` 내부에서 호출 시 에러 발생

**잘못된 코드 예시:**

```vue
<!-- ❌ 잘못된 방법 1: Provider 없이 useMessage 호출 -->
<script setup lang="ts">
import { useMessage } from 'naive-ui';

const message = useMessage(); // 에러!
</script>

<!-- ❌ 잘못된 방법 2: onMounted에서 호출 -->
<script setup lang="ts">
import { useMessage } from 'naive-ui';
import { onMounted } from 'vue';

onMounted(() => {
  const message = useMessage(); // 에러!
  window.$message = message;
});
</script>

<!-- ❌ 잘못된 방법 3: Provider 외부 컴포넌트에서 호출 -->
<template>
  <App /> <!-- Provider 없음 -->
</template>

<script setup lang="ts">
// App 컴포넌트 내부
const message = useMessage(); // 에러!
</script>
```

**올바른 해결 방법:**

#### Provider 방식 사용 시:

```vue
<!-- App.vue -->
<template>
  <n-message-provider>
    <n-dialog-provider>
      <n-notification-provider>
        <AppContent />
      </n-notification-provider>
    </n-dialog-provider>
  </n-message-provider>
</template>

<!-- AppContent.vue 또는 하위 컴포넌트 -->
<script setup lang="ts">
import { useMessage } from 'naive-ui';

// ✅ Provider 내부에서 setup context에서 직접 호출
const message = useMessage();

const showMessage = () => {
  message.success('메시지!');
};
</script>
```

#### createDiscreteApi 방식 사용 시 (✅ 권장):

```typescript
// main.ts
import { createDiscreteApi } from 'naive-ui';

const { message, dialog } = createDiscreteApi(['message', 'dialog']);

window.$message = message;
window.$dialog = dialog;

// Provider 불필요!
```

### 4-3. 두 방식을 혼용할 때의 문제

**문제:** Provider 방식과 createDiscreteApi 방식을 같은 앱에서 혼용

**증상:**
- 일부 메시지는 표시되고 일부는 표시되지 않음
- 스타일이나 위치가 불일치

**해결책:**
- **한 가지 방식만 선택**하여 일관되게 사용
- 본 프로젝트에서는 **createDiscreteApi 방식** 사용 ✅

### 5. 자동 Import가 작동하지 않음

**문제:** `unplugin-vue-components` 설정 후에도 컴포넌트가 인식되지 않음

**해결책:**

1. 서버 재시작
2. `node_modules/.cache` 삭제
3. `components.d.ts` 파일 확인 (자동 생성되어야 함)

```typescript
// components.d.ts (자동 생성됨)
declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    NButton: (typeof import('naive-ui'))['NButton'];
    NInput: (typeof import('naive-ui'))['NInput'];
    // ...
  }
}
```

### 6. Form Validation이 제대로 작동하지 않음

**문제:** 폼 제출 시 유효성 검사가 실행되지 않음

**해결책:**

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

### 7. Virtual Scroll이 느림

**문제:** 대용량 데이터에서 스크롤이 부드럽지 않음

**해결책:**

```vue
<n-data-table
  :columns="columns"
  :data="largeData"
  :virtual-scroll="true"
  :max-height="600"
  :min-height="400"
/>
```

### 8. SSR (Server-Side Rendering) 이슈

**문제:** Nuxt나 SSR 환경에서 hydration mismatch

**해결책:**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
});
</script>

<template>
  <n-config-provider v-if="isClient">
    <!-- 클라이언트에서만 렌더링 -->
  </n-config-provider>
</template>
```

---

## 추가 리소스

### 공식 문서

- 공식 웹사이트: https://www.naiveui.com
- GitHub: https://github.com/tusen-ai/naive-ui
- NPM: https://www.npmjs.com/package/naive-ui

### 관련 프로젝트

- **Soybean Admin**: https://github.com/soybeanjs/soybean-admin
- **Naive UI Admin**: https://github.com/jekip/naive-ui-admin
- **Vue Naive Admin**: https://github.com/zclzone/vue-naive-admin

### 아이콘

- xicons: https://www.xicons.org

### 커뮤니티

- GitHub Discussions: https://github.com/tusen-ai/naive-ui/discussions
- Stack Overflow: `[naiveui]` 태그

---

## 빠른 참조

### 자주 사용하는 Composables

```typescript
import { useMessage, useDialog, useNotification, useLoadingBar, useThemeVars } from 'naive-ui';
```

### 자주 사용하는 타입

```typescript
import type {
  FormInst,
  FormItemRule,
  FormRules,
  DataTableColumns,
  SelectOption,
  GlobalThemeOverrides,
} from 'naive-ui';
```

### 컴포넌트 크기 옵션

- `tiny`
- `small`
- `medium` (기본값)
- `large`

### 버튼 타입

- `default`
- `primary`
- `info`
- `success`
- `warning`
- `error`

### Form Trigger 옵션

- `'blur'` - 포커스 잃을 때
- `'input'` - 입력할 때
- `'change'` - 값 변경될 때
- `['blur', 'input']` - 여러 이벤트

---

## 마무리

이 가이드는 Naive UI의 핵심 기능과 일반적인 사용 패턴을 다룹니다. 더 자세한 내용은 공식 문서를 참조하세요.

### 주요 포인트

✅ Vue 3 전용, TypeScript 완벽 지원
✅ 90+ 컴포넌트, Tree-shaking 지원
✅ CSS import 불필요
✅ 고급 테마 커스터마이징
✅ 빠른 성능 (Virtual List)
✅ 자동 import 가능
✅ xicons 권장

**Happy Coding! 🎉**
