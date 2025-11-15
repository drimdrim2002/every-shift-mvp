# Naive UI Data Tables Guide

> DataTable 컴포넌트 완벽 가이드

## 기본 테이블

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

---

## 선택 가능한 테이블

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

---

## 페이지네이션

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

---

## Virtual Scroll (대용량 데이터)

```vue
<template>
  <n-data-table
    :columns="columns"
    :data="largeData"
    :virtual-scroll="true"
    :max-height="600"
    :min-height="400"
  />
</template>
```

**성능 최적화**:
- 1000개 이상의 데이터에서 권장
- `max-height` 필수 지정
- `v-memo` 활용 시 추가 성능 향상

---

## 조건부 렌더링 패턴

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

## 컬럼 옵션 상세

### Sorter (정렬)

```typescript
const columns: DataTableColumns<RowData> = [
  {
    title: 'ID',
    key: 'id',
    sorter: 'default',  // 기본 정렬 (숫자, 문자열)
  },
  {
    title: '이름',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),  // 커스텀 정렬
    defaultSortOrder: 'ascend',  // 기본 정렬 순서
  },
];
```

### Filter (필터)

```typescript
const columns: DataTableColumns<RowData> = [
  {
    title: '상태',
    key: 'status',
    filter: true,
    filterOptions: [
      { label: '활성', value: 'active' },
      { label: '비활성', value: 'inactive' },
    ],
    filter(value, row) {
      return row.status === value;
    },
  },
];
```

### Render (커스텀 렌더링)

```typescript
import { h } from 'vue';
import { NButton, NTag } from 'naive-ui';

const columns: DataTableColumns<RowData> = [
  {
    title: '상태',
    key: 'status',
    render(row) {
      return h(
        NTag,
        { type: row.status === 'active' ? 'success' : 'default' },
        { default: () => row.status }
      );
    },
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
```

---

## 실전 패턴: TanStack Table과 비교

**본 프로젝트에서는 TanStack Table 사용**
- Naive UI의 NDataTable은 참고용
- 실제 그리드 구현은 TanStack Table v8 사용
- 30×36 그리드 (1080 cells)에서 더 나은 성능

**NDataTable 사용 시기**:
- 간단한 테이블 (< 100 rows)
- CRUD 목록 화면
- 관리자 페이지

**TanStack Table 사용 시기** (본 프로젝트):
- 대용량 그리드 (> 500 cells)
- 복잡한 셀 렌더링
- 커스텀 편집 UI

---

## 문제 해결

### Virtual Scroll이 느림

**해결책**:
```vue
<n-data-table
  :columns="columns"
  :data="largeData"
  :virtual-scroll="true"
  :max-height="600"
  :min-height="400"
/>
```

### 페이지네이션이 작동하지 않음

**확인 사항**:
1. `pagination` 객체에 `onChange` 핸들러 정의
2. `page`와 `pageSize` 상태 업데이트
3. API 호출 시 pagination 파라미터 전달

---

**관련 문서**:
- 빠른 참조: `00-quick-reference.md`
- 실전 패턴: `06-patterns.md`
- 문제 해결: `07-troubleshooting.md`
