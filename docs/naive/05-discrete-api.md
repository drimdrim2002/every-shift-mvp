# Naive UI Discrete API Guide

> **본 프로젝트의 핵심 패턴**: setup 외부에서 전역 API 사용하기

## createDiscreteApi란?

`useMessage`, `useDialog`, `useNotification`, `useLoadingBar`는 일반적으로 Vue 컴포넌트의 `setup()` 내부에서만 사용 가능합니다.

하지만 다음과 같은 상황에서는 setup 외부에서 사용해야 할 수 있습니다:

- **유틸리티 함수**: API 호출 중 에러 메시지 표시
- **전역 에러 핸들러**: 앱 전체의 에러를 중앙에서 처리
- **라우터 가드**: 네비게이션 전/후 메시지 표시
- **비동기 함수**: Promise 체인에서 알림 표시

이런 경우 `createDiscreteApi`를 사용합니다.

---

## 본 프로젝트 설정

### 1. main.ts에서 설정

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

### 2. 타입 정의 (이미 설정됨)

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

### 3. tsconfig 설정 (이미 설정됨)

```json
// tsconfig.app.json
{
  "compilerOptions": {
    "types": ["vite/client", "naive-ui/volar"]
  }
}
```

---

## 컴포넌트에서 사용

### ✅ 올바른 방법: 메서드로 래핑

```vue
<script setup lang="ts">
// ✅ 올바른 방법
const showSuccess = () => {
  window.$message?.success('성공 메시지!');
};

const showError = () => {
  window.$message?.error('에러 메시지!');
};

const handleDelete = () => {
  window.$dialog?.warning({
    title: '확인',
    content: '정말 삭제하시겠습니까?',
    positiveText: '확인',
    negativeText: '취소',
    onPositiveClick: () => {
      window.$message?.success('삭제되었습니다');
    },
  });
};
</script>

<template>
  <n-space>
    <n-button @click="showSuccess">Success</n-button>
    <n-button @click="showError">Error</n-button>
    <n-button @click="handleDelete">Delete</n-button>
  </n-space>
</template>
```

### ❌ 잘못된 방법: 템플릿에서 직접 호출

```vue
<template>
  <!-- ❌ 절대 하지 마세요! -->
  <n-button @click="window.$message.success('메시지')">Success</n-button>
</template>
```

**왜 이 방법이 안전한가?**
- 메서드는 **클릭 시점(런타임)**에 실행되므로 `window.$message`가 이미 할당됨
- Optional chaining (`?.`)으로 undefined 에러 방지
- 디버깅 및 에러 처리 추가 가능

---

## 유틸리티 함수에서 사용

### API 호출 예시

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

### 라우터 가드 예시

```typescript
// src/router/guards.ts
import router from './index';

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    window.$message?.warning('로그인이 필요합니다');
    next('/login');
  } else {
    next();
  }
});
```

---

## 안전한 사용 패턴

### 패턴 1: 유틸리티 함수로 래핑

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

### 패턴 2: Composable로 사용

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

<template>
  <n-button @click="showSuccess('성공!')">Success</n-button>
</template>
```

---

## 주의사항

### ⚠️ 중요한 제약사항

#### 1. setup 내부에서 호출 금지

```typescript
// ❌ 절대 하지 마세요!
export default defineComponent({
  setup() {
    const { message } = createDiscreteApi(['message']); // 에러 발생!
  }
});
```

#### 2. Provider와 혼용 금지

```vue
<!-- ❌ 같은 앱에서 혼용하지 마세요 -->
<n-message-provider> <!-- Provider 방식 -->
  <MyComponent /> <!-- createDiscreteApi 사용 시 충돌 -->
</n-message-provider>
```

#### 3. Config 동기화 필요

createDiscreteApi는 `n-config-provider`의 설정을 자동으로 받지 않습니다.
테마나 설정을 공유하려면 수동으로 동기화해야 합니다:

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

---

## Provider 방식 vs Discrete API 방식

| 특징 | Provider 방식 | Discrete API 방식 |
|------|--------------|------------------|
| **사용 위치** | setup 내부만 | setup 외부 가능 |
| **Provider 필요** | 필요 (`<n-message-provider>`) | 불필요 |
| **Config 동기화** | 자동 | 수동 |
| **권장 사용처** | 컴포넌트 내부 | 유틸리티 함수, 전역 사용 |
| **타이밍 이슈** | 있음 (Provider 마운트 후) | 없음 (즉시 사용 가능) |

---

## 권장 사용 시나리오

### ✅ Discrete API 방식을 사용하세요 (본 프로젝트)

- setup 외부에서 사용 (유틸리티, 라우터 가드 등)
- 전역 에러 핸들러
- 앱 전체에서 일관된 방식으로 사용
- **본 프로젝트처럼 전역 window 객체로 사용하는 경우**

### Provider 방식을 사용하는 경우 (참고용)

- 컴포넌트 내부에서만 사용
- Config Provider 설정을 공유해야 할 때
- 테마 변경에 자동으로 반응해야 할 때

---

## 문제 해결

### window.$message undefined 에러

**증상**:
- 템플릿에서 `window.$message.success()` 호출 시 에러
- 버튼 클릭 시 undefined 접근 에러 발생

**원인**:
1. **타이밍 이슈**: Vue 템플릿 컴파일 시점에 `window.$message`가 아직 할당되지 않음
2. **HMR 캐시**: Vite 개발 서버의 Hot Module Reload가 main.ts를 완전히 재실행하지 않음

**해결책**:

#### 방법 1: 메서드로 래핑 (✅ 권장)

```vue
<script setup lang="ts">
const showSuccess = () => {
  window.$message?.success('성공 메시지!');
};
</script>

<template>
  <n-button @click="showSuccess">Success</n-button>
</template>
```

#### 방법 2: 개발 서버 완전 재시작

```bash
# 1. 개발 서버 중지 (Ctrl+C)
# 2. 브라우저에서 Hard Refresh
#    - Windows/Linux: Ctrl + Shift + R
#    - Mac: Cmd + Shift + R
# 3. 개발 서버 재시작
pnpm run dev
```

### useMessage() Provider context 에러

**증상**:
- `useMessage()`를 호출하면 Provider를 찾을 수 없다는 에러

**해결책**:
본 프로젝트에서는 `useMessage()` 사용 금지. `window.$message` 사용.

```typescript
// ❌ 사용 금지
const message = useMessage();

// ✅ 올바른 방법
window.$message?.success('메시지');
```

---

**관련 문서**:
- 빠른 참조: `00-quick-reference.md`
- 피드백 컴포넌트: `04-feedback.md`
- 문제 해결: `07-troubleshooting.md`
