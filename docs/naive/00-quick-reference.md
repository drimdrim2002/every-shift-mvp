# Naive UI Quick Reference

> 빠른 참조용 치트시트 - 가장 자주 사용하는 타입, Composables, 옵션

## 자주 사용하는 Composables

```typescript
import { useMessage, useDialog, useNotification, useLoadingBar, useThemeVars } from 'naive-ui';
```

**⚠️ 본 프로젝트에서는 createDiscreteApi 사용**
- `useMessage()` 등은 setup context에서만 사용 가능
- 전역 사용을 위해 `window.$message` 패턴 사용
- 자세한 내용: `05-discrete-api.md` 참조

## 자주 사용하는 타입

```typescript
import type {
  FormInst,
  FormItemRule,
  FormRules,
  DataTableColumns,
  DataTableRowKey,
  SelectOption,
  GlobalThemeOverrides,
  MessageApi,
  DialogApi,
  NotificationApi,
} from 'naive-ui';
```

## 컴포넌트 Import 예시

```typescript
// Form 관련
import { NForm, NFormItem, NInput, NButton, NSelect } from 'naive-ui';

// 데이터 표시
import { NDataTable, NCard, NSpace } from 'naive-ui';

// 피드백
import { NModal, NSpin, NEmpty, NResult } from 'naive-ui';

// 레이아웃
import { NGrid, NGi } from 'naive-ui';

// 테마
import { NConfigProvider, darkTheme, type GlobalThemeOverrides } from 'naive-ui';
```

## 컴포넌트 크기 옵션

- `tiny` - 가장 작음
- `small` - 작음
- `medium` - 중간 (기본값)
- `large` - 큼

## 버튼 타입

- `default` - 기본 (회색)
- `primary` - 주요 (파란색)
- `info` - 정보 (하늘색)
- `success` - 성공 (초록색)
- `warning` - 경고 (주황색)
- `error` - 에러 (빨간색)

## Form Trigger 옵션

```typescript
const rules: FormRules = {
  username: {
    required: true,
    trigger: 'blur',        // 포커스 잃을 때
    // trigger: 'input',    // 입력할 때
    // trigger: 'change',   // 값 변경될 때
    // trigger: ['blur', 'input'], // 여러 이벤트
  },
};
```

## DataTable 컬럼 타입

```typescript
const columns: DataTableColumns<RowData> = [
  {
    type: 'selection',  // 체크박스 컬럼
  },
  {
    title: 'ID',
    key: 'id',
    width: 80,
    sorter: 'default',  // 기본 정렬
    // sorter: (a, b) => a.id - b.id,  // 커스텀 정렬
  },
  {
    title: '이름',
    key: 'name',
    filter: true,  // 필터 활성화
    filterOptions: [
      { label: '옵션1', value: 'value1' },
    ],
  },
];
```

## 본 프로젝트 핵심 패턴

### createDiscreteApi 사용 (window.$message)

```typescript
// ✅ 올바른 방법: 메서드로 래핑
const showSuccess = () => {
  window.$message?.success('성공!');
};

// ❌ 잘못된 방법: 템플릿에서 직접 호출
// <n-button @click="window.$message.success('메시지')">
```

**자세한 내용**: `05-discrete-api.md` 참조

### Form Validation 패턴

```typescript
const formRef = ref<FormInst | null>(null);

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    // 검증 성공
  } catch (errors) {
    // 검증 실패
  }
};
```

### DataTable 기본 패턴

```typescript
interface RowData {
  id: number;
  name: string;
}

const data = ref<RowData[]>([]);
const columns: DataTableColumns<RowData> = [
  { title: 'ID', key: 'id' },
  { title: '이름', key: 'name' },
];
```

## 추가 리소스

- **공식 문서**: https://www.naiveui.com
- **GitHub**: https://github.com/tusen-ai/naive-ui
- **아이콘**: https://www.xicons.org

---

**관련 문서**:
- 폼 구현: `02-forms.md`
- 테이블 구현: `03-data-tables.md`
- 전역 API: `05-discrete-api.md`
- 문제 해결: `07-troubleshooting.md`
