# Naive UI Troubleshooting Guide

> 실제 프로젝트에서 겪은 Naive UI 문제와 해결 방법

## 목차

1. [Error 1: Provider Context Missing](#error-1-provider-context-missing)
2. [Error 2: window.$message Undefined](#error-2-windowmessage-undefined)
3. [Error 3: Template Timing Issues](#error-3-template-timing-issues)
4. [일반적인 함정 (Common Pitfalls)](#일반적인-함정-common-pitfalls)
5. [빠른 진단 체크리스트](#빠른-진단-체크리스트)

---

## Error 1: Provider Context Missing

### 증상

```bash
[naive/use-message]: No outer <n-message-provider /> founded
```

### 발생 시나리오

**❌ 잘못된 패턴 1: onMounted에서 useMessage() 호출**

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useMessage } from 'naive-ui';

onMounted(() => {
  const message = useMessage(); // ❌ Provider context 없음!
  window.$message = message;
});
</script>
```

**왜 안 되는가?**
- `useMessage()`는 Vue의 `inject()`를 사용하여 부모의 Provider를 찾음
- `onMounted()`는 이미 컴포넌트가 마운트된 후 실행되므로, setup 컨텍스트가 다름
- Provider의 `provide()` 값에 접근할 수 없음

**❌ 잘못된 패턴 2: Provider 바깥에서 useMessage() 호출**

```vue
<!-- App.vue -->
<template>
  <div id="app">
    <HelloWorld /> <!-- ❌ Provider 외부! -->
  </div>

  <n-message-provider>
    <router-view />
  </n-message-provider>
</template>
```

**왜 안 되는가?**
- `<HelloWorld />`가 `<n-message-provider>` 바깥에 있음
- Vue의 provide/inject는 부모-자식 관계에서만 작동
- 형제 컴포넌트 간에는 작동하지 않음

### 해결 방법

**✅ 방법 1: Provider 내부로 이동**

```vue
<template>
  <n-message-provider>
    <div id="app">
      <HelloWorld /> <!-- ✅ Provider 내부 -->
      <router-view />
    </div>
  </n-message-provider>
</template>
```

**✅ 방법 2: createDiscreteApi 사용 (권장)**

```typescript
// main.ts
import { createDiscreteApi } from 'naive-ui';

const { message, dialog, notification, loadingBar } = createDiscreteApi([
  'message',
  'dialog',
  'notification',
  'loadingBar',
]);

window.$message = message;
window.$dialog = dialog;
window.$notification = notification;
window.$loadingBar = loadingBar;
```

**장점**:
- Provider 불필요
- 어디서든 사용 가능
- setup 외부에서도 사용 가능

### 예방 방법

1. **전역 사용이 필요하면 createDiscreteApi를 사용**
2. **useMessage()는 항상 setup() 직접 호출 영역에서만 사용**
3. **Provider 계층 구조를 명확히 설계**

---

## Error 2: window.$message Undefined

### 증상

```bash
Uncaught TypeError: Cannot read properties of undefined (reading 'success')
```

또는

```bash
Uncaught TypeError: window.$message is undefined
```

### 발생 시나리오

**❌ 잘못된 패턴 1: 템플릿에서 직접 접근**

```vue
<template>
  <!-- ❌ 템플릿 컴파일 시점에 window.$message가 undefined일 수 있음 -->
  <n-button @click="window.$message.success('성공!')">
    클릭
  </n-button>
</template>
```

**왜 안 되는가?**
- Vue 템플릿은 컴파일 시점에 표현식을 평가
- `window.$message`가 main.ts에서 할당되기 전에 템플릿이 평가될 수 있음
- HMR(Hot Module Reload) 중에는 타이밍 문제가 더 심각

**❌ 잘못된 패턴 2: setup에서 즉시 접근**

```vue
<script setup lang="ts">
// ❌ main.ts가 실행되기 전일 수 있음
const message = window.$message;

const showSuccess = () => {
  message.success('성공!'); // undefined.success() 에러!
};
</script>
```

**왜 안 되는가?**
- 컴포넌트 setup이 main.ts의 `app.mount()` 전에 실행될 수 있음
- 특히 HMR 중에는 main.ts가 재실행되지 않을 수 있음

### 해결 방법

**✅ 방법 1: 메서드 내부에서 접근 + Optional Chaining (권장)**

```vue
<script setup lang="ts">
// ✅ 메서드 내부에서 접근하므로 실행 시점에 평가됨
const showSuccess = () => {
  window.$message?.success('성공!'); // Optional chaining으로 안전
};
</script>

<template>
  <n-button @click="showSuccess">클릭</n-button>
</template>
```

**✅ 방법 2: Computed 사용**

```vue
<script setup lang="ts">
import { computed } from 'vue';

const $message = computed(() => window.$message);

const showSuccess = () => {
  $message.value?.success('성공!');
};
</script>
```

**✅ 방법 3: 유틸리티 함수 사용**

```typescript
// src/utils/message.ts
export function showSuccess(content: string) {
  if (!window.$message) {
    console.warn('Naive UI message API not initialized');
    return;
  }
  window.$message.success(content);
}
```

```vue
<script setup lang="ts">
import { showSuccess } from '@/utils/message';

const handleClick = () => {
  showSuccess('성공!');
};
</script>
```

### 예방 방법

1. **절대로 템플릿에서 직접 window.$ 접근 금지**
2. **항상 Optional Chaining (`?.`) 사용**
3. **유틸리티 함수로 감싸서 안전성 보장**
4. **TypeScript 타입 정의로 컴파일 타임 체크**

---

## Error 3: Template Timing Issues

### 증상

- 간헐적으로 `window.$message is undefined` 에러 발생
- 새로고침하면 작동하지만 HMR 후에는 에러
- 프로덕션에서는 작동하지만 개발 환경에서 에러

### 발생 시나리오

**❌ Race Condition: 초기화 순서 문제**

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#app'); // ← 이 시점에 App.vue가 즉시 평가됨

// ❌ mount 후에 할당하면 너무 늦음!
const { message } = createDiscreteApi(['message']);
window.$message = message;
```

**왜 안 되는가?**
- `app.mount('#app')`가 실행되면 App.vue의 템플릿이 즉시 컴파일됨
- 템플릿 내 `window.$message` 표현식이 평가되지만 아직 undefined
- 이후에 할당해도 이미 늦음

### 해결 방법

**✅ 방법 1: mount 전에 할당 (권장)**

```typescript
// main.ts
import { createApp } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import App from './App.vue';

// ✅ 1단계: 앱 생성 전에 전역 API 초기화
const { message, dialog, notification, loadingBar } = createDiscreteApi([
  'message',
  'dialog',
  'notification',
  'loadingBar',
]);

// ✅ 2단계: window 객체에 할당
window.$message = message;
window.$dialog = dialog;
window.$notification = notification;
window.$loadingBar = loadingBar;

// ✅ 3단계: 앱 생성 및 마운트
const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
```

**✅ 방법 2: 템플릿에서 메서드 사용**

```vue
<script setup lang="ts">
// 메서드 내부에서 접근하므로 클릭 시점에 평가됨
const showSuccess = () => {
  window.$message?.success('성공!');
};
</script>

<template>
  <!-- ✅ 직접 접근 대신 메서드 호출 -->
  <n-button @click="showSuccess">클릭</n-button>
</template>
```

**✅ 방법 3: v-if로 초기화 확인**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isReady = ref(false);

onMounted(() => {
  isReady.value = !!window.$message;
});
</script>

<template>
  <div v-if="isReady">
    <n-button @click="window.$message?.success('성공!')">
      클릭
    </n-button>
  </div>
</template>
```

### HMR 관련 주의사항

**문제**: Vite HMR은 main.ts를 재실행하지 않음

```typescript
// main.ts
// HMR 중에는 이 코드가 재실행되지 않을 수 있음!
window.$message = message;
```

**해결책**:

1. **브라우저 완전 새로고침** (Ctrl+Shift+R)
2. **Vite 서버 재시작**
3. **유틸리티 함수에 폴백 로직 추가**

```typescript
// src/utils/message.ts
import { createDiscreteApi } from 'naive-ui';

let messageApi: MessageApi | null = null;

export function getMessageApi() {
  if (!messageApi) {
    if (window.$message) {
      messageApi = window.$message;
    } else {
      // Fallback: 동적으로 생성
      const { message } = createDiscreteApi(['message']);
      messageApi = message;
      window.$message = message;
    }
  }
  return messageApi;
}

export function showSuccess(content: string) {
  getMessageApi().success(content);
}
```

### 예방 방법

1. **main.ts에서 mount 전에 모든 전역 객체 초기화**
2. **템플릿에서 직접 접근 금지, 항상 메서드 사용**
3. **HMR 테스트 시 완전 새로고침으로 확인**
4. **유틸리티 함수에 폴백 로직 추가**

---

## 일반적인 함정 (Common Pitfalls)

### 1. Provider와 Discrete API 혼용

**❌ 잘못된 패턴**

```vue
<!-- App.vue -->
<template>
  <n-message-provider>
    <Content />
  </n-message-provider>
</template>
```

```typescript
// main.ts
const { message } = createDiscreteApi(['message']);
window.$message = message; // ❌ Provider와 별개의 인스턴스!
```

**문제점**:
- Provider의 메시지와 Discrete API의 메시지가 별개로 작동
- 설정(테마, 위치 등)이 공유되지 않음
- 혼란스러운 동작

**✅ 해결책**: 둘 중 하나만 선택
- **전역 사용**: createDiscreteApi만 사용
- **컴포넌트 내 사용**: Provider만 사용

### 2. TypeScript 타입 누락

**❌ 잘못된 패턴**

```typescript
// window.$message 사용하지만 타입 정의 없음
window.$message.success('성공!'); // TypeScript 에러!
```

**✅ 해결책**

```typescript
// src/types/global.d.ts
import type { MessageApi } from 'naive-ui';

declare global {
  interface Window {
    $message: MessageApi;
  }
}

export {};
```

### 3. 비동기 초기화 문제

**❌ 잘못된 패턴**

```typescript
// main.ts
async function init() {
  await someAsyncOperation();

  const { message } = createDiscreteApi(['message']);
  window.$message = message;

  app.mount('#app'); // 너무 늦음!
}

init();
```

**✅ 해결책**: 동기적 초기화

```typescript
// main.ts
const { message } = createDiscreteApi(['message']);
window.$message = message;

const app = createApp(App);
app.mount('#app');

// 비동기 작업은 mount 후에
app.mount('#app').then(() => {
  initializeAsyncFeatures();
});
```

### 4. 메모리 누수

**❌ 잘못된 패턴**

```vue
<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  // 10초마다 메시지 표시
  setInterval(() => {
    window.$message?.info('주기적 알림');
  }, 10000);
  // ❌ 컴포넌트 언마운트 후에도 계속 실행됨!
});
</script>
```

**✅ 해결책**: cleanup 처리

```vue
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue';

let intervalId: number;

onMounted(() => {
  intervalId = setInterval(() => {
    window.$message?.info('주기적 알림');
  }, 10000);
});

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});
</script>
```

---

## 빠른 진단 체크리스트

### window.$message undefined 에러 발생 시

- [ ] main.ts에서 `createDiscreteApi` 호출했는가?
- [ ] `app.mount()` **전에** window 객체에 할당했는가?
- [ ] 템플릿에서 직접 접근하지 않고 메서드로 감쌌는가?
- [ ] Optional chaining (`?.`) 사용했는가?
- [ ] TypeScript 타입 정의(`global.d.ts`)가 있는가?

### Provider context 에러 발생 시

- [ ] `useMessage()`를 setup 직접 영역에서 호출했는가?
- [ ] 컴포넌트가 `<n-message-provider>` 내부에 있는가?
- [ ] Provider와 Discrete API를 혼용하지 않았는가?

### HMR 후 에러 발생 시

- [ ] 브라우저 완전 새로고침 (Ctrl+Shift+R) 했는가?
- [ ] Vite 개발 서버를 재시작했는가?
- [ ] 유틸리티 함수에 폴백 로직이 있는가?

### 프로덕션 배포 전 체크

- [ ] `pnpm build` 성공하는가?
- [ ] TypeScript 에러 없는가?
- [ ] 프로덕션 빌드에서 테스트했는가?
- [ ] 에러 핸들링이 적절한가?

---

## 추가 리소스

- [Naive UI 공식 문서](https://www.naiveui.com) (온라인 환경)
- [GitHub - naive-ui](https://github.com/tusen-ai/naive-ui)
- [본 프로젝트 문서](./README.md)
- [createDiscreteApi 가이드](./createDiscreteApi.md)
- [Best Practices](./best-practices.md)

---

## 문서 히스토리

| 날짜 | 변경 사항 |
|------|----------|
| 2024-11-15 | 초기 문서 작성 - 실제 프로젝트에서 겪은 3가지 주요 에러 기록 |
