# Naive UI Practical Patterns

> 실전 개발에서 자주 사용하는 패턴 모음

## 반응형 레이아웃

```vue
<script setup lang="ts">
import { NGrid, NGi, NCard } from 'naive-ui'
</script>

<template>
  <n-grid :x-gap="12" :y-gap="12" :cols="24">
    <n-gi :span="24" :xs="24" :sm="12" :md="8" :lg="6">
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

**반응형 브레이크포인트**:
- `xs`: < 640px
- `sm`: ≥ 640px
- `md`: ≥ 1024px
- `lg`: ≥ 1280px
- `xl`: ≥ 1536px

---

## 로딩 상태 관리

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

---

## API와 통합된 Form

```vue
<script setup lang="ts">
import { ref } from 'vue';
import type { FormInst } from 'naive-ui';

const formRef = ref<FormInst | null>(null);
const loading = ref(false);

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
      window.$message?.success('저장되었습니다');
      // 폼 초기화
      formData.value = { username: '', email: '' };
    } else {
      const error = await response.json();
      window.$message?.error(error.message || '저장 실패');
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

---

## 조건부 렌더링

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

## 에러 핸들링 패턴

### API 에러 처리

```typescript
const handleApiError = (error: any) => {
  if (error.response) {
    // 서버 응답 에러 (4xx, 5xx)
    const status = error.response.status;
    const message = error.response.data?.message || '요청 실패';

    switch (status) {
      case 400:
        window.$message?.error(`잘못된 요청: ${message}`);
        break;
      case 401:
        window.$message?.warning('인증이 필요합니다');
        // 로그인 페이지로 리다이렉트
        break;
      case 403:
        window.$message?.error('권한이 없습니다');
        break;
      case 404:
        window.$message?.error('리소스를 찾을 수 없습니다');
        break;
      case 500:
        window.$message?.error('서버 오류가 발생했습니다');
        break;
      default:
        window.$message?.error(message);
    }
  } else if (error.request) {
    // 네트워크 에러
    window.$message?.error('네트워크 오류가 발생했습니다');
  } else {
    // 기타 에러
    window.$message?.error('알 수 없는 오류가 발생했습니다');
  }
};

// 사용
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) throw response;
} catch (error) {
  handleApiError(error);
}
```

---

## Form Validation 패턴

### 동적 규칙

```typescript
const rules = computed<FormRules>(() => ({
  password: [
    { required: true, message: '비밀번호를 입력하세요' },
    {
      validator: (_rule, value) => {
        if (requireStrong.value && value.length < 8) {
          return new Error('최소 8자 이상 입력하세요');
        }
        return true;
      },
    },
  ],
}));
```

### 필드 간 검증

```typescript
const rules: FormRules = {
  password: [
    { required: true, message: '비밀번호를 입력하세요' },
  ],
  confirmPassword: [
    { required: true, message: '비밀번호 확인을 입력하세요' },
    {
      validator: (_rule, value) => {
        if (value !== formData.value.password) {
          return new Error('비밀번호가 일치하지 않습니다');
        }
        return true;
      },
      trigger: ['blur', 'input'],
    },
  ],
};
```

---

## 테이블 CRUD 패턴

```vue
<script setup lang="ts">
import { ref, h } from 'vue';
import { NDataTable, NButton, NSpace, type DataTableColumns } from 'naive-ui';

interface Item {
  id: string;
  name: string;
}

const data = ref<Item[]>([]);
const loading = ref(false);

const columns: DataTableColumns<Item> = [
  { title: 'ID', key: 'id' },
  { title: '이름', key: 'name' },
  {
    title: '작업',
    key: 'actions',
    render(row) {
      return h(NSpace, null, {
        default: () => [
          h(
            NButton,
            { size: 'small', onClick: () => handleEdit(row) },
            { default: () => '편집' }
          ),
          h(
            NButton,
            { size: 'small', type: 'error', onClick: () => handleDelete(row) },
            { default: () => '삭제' }
          ),
        ],
      });
    },
  },
];

const handleEdit = (row: Item) => {
  // 편집 모달 열기
};

const handleDelete = (row: Item) => {
  window.$dialog?.warning({
    title: '삭제 확인',
    content: `"${row.name}"을(를) 삭제하시겠습니까?`,
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        await deleteItem(row.id);
        window.$message?.success('삭제되었습니다');
        loadData();
      } catch (error) {
        window.$message?.error('삭제 실패');
      }
    },
  });
};

const loadData = async () => {
  loading.value = true;
  try {
    const response = await fetch('/api/items');
    data.value = await response.json();
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <n-data-table :columns="columns" :data="data" :loading="loading" />
</template>
```

---

## 성능 최적화 패턴

### v-memo 사용

```vue
<template>
  <div v-for="item in items" :key="item.id" v-memo="[item.name, item.status]">
    <n-card>{{ item.name }} - {{ item.status }}</n-card>
  </div>
</template>
```

### Computed 캐싱

```typescript
const filteredData = computed(() => {
  return data.value.filter(item => item.status === 'active');
});

// ❌ 피해야 할 패턴
// const filteredData = () => data.value.filter(item => item.status === 'active');
```

---

## 본 프로젝트 특화 패턴

### Supabase + Naive UI

```typescript
import { supabase } from '@/lib/supabase';

const loadEmployees = async () => {
  loading.value = true;
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name');

    if (error) throw error;

    employees.value = data;
  } catch (error) {
    window.$message?.error('데이터 로드 실패');
  } finally {
    loading.value = false;
  }
};
```

### TanStack Table + Naive UI

```vue
<script setup lang="ts">
// TanStack Table은 데이터 그리드용
import { useReactTable, getCoreRowModel } from '@tanstack/vue-table';

// Naive UI는 폼, 버튼, 모달용
import { NButton, NModal, NForm } from 'naive-ui';

const table = useReactTable({
  data: data.value,
  columns: columns.value,
  getCoreRowModel: getCoreRowModel(),
});
</script>

<template>
  <!-- TanStack Table 그리드 -->
  <table>
    <!-- ... -->
  </table>

  <!-- Naive UI 모달 -->
  <n-modal v-model:show="showModal">
    <n-form>
      <!-- ... -->
    </n-form>
  </n-modal>
</template>
```

---

**관련 문서**:
- 빠른 참조: `00-quick-reference.md`
- 폼 구현: `02-forms.md`
- 테이블 구현: `03-data-tables.md`
- 전역 API: `05-discrete-api.md`
