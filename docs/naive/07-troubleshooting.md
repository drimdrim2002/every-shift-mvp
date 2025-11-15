# Naive UI Troubleshooting Guide

> 문제 해결 가이드 & 추가 리소스

## 일반 문제 해결

### 1. CSS 스타일 충돌 (Tailwind CSS와 함께 사용 시)

Naive UI는 인라인 스타일을 사용하므로 대부분 문제없지만, Tailwind의 base 스타일이 충돌할 수 있습니다.

**해결책 1: Naive UI 우선순위 높이기**

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

**해결책 2: Tailwind preflight 비활성화**

```javascript
// tailwind.config.js
module.exports = {
  corePlugins: {
    preflight: false, // Tailwind base 스타일 비활성화
  },
};
```

---

### 2. TypeScript 타입 에러

**문제**: `Cannot find module 'naive-ui' or its corresponding type declarations`

**해결책**:

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["naive-ui/volar"],
    "moduleResolution": "bundler"
  }
}
```

---

### 3. 다크 모드에서 깜빡임

**문제**: 페이지 로드 시 라이트 모드가 잠깐 보임

**해결책**:

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

---

## createDiscreteApi 관련 문제

### 4-1. window.$message undefined 에러

**문제**: `Cannot read properties of undefined (reading '$message')`

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
pnpm run dev
```

---

### 4-2. useMessage() Provider context 에러

**문제**: `[naive/use-message]: No outer <n-message-provider /> founded`

**증상**:
- `useMessage()`를 호출하면 Provider를 찾을 수 없다는 에러
- `onMounted` 내부에서 호출 시 에러 발생

**잘못된 코드 예시**:

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
```

**올바른 해결 방법**:

본 프로젝트에서는 `useMessage()` 사용 금지. `window.$message` 사용.

```typescript
// ❌ 사용 금지
const message = useMessage();

// ✅ 올바른 방법
window.$message?.success('메시지');
```

**자세한 내용**: `05-discrete-api.md` 참조

---

### 4-3. 두 방식을 혼용할 때의 문제

**문제**: Provider 방식과 createDiscreteApi 방식을 같은 앱에서 혼용

**증상**:
- 일부 메시지는 표시되고 일부는 표시되지 않음
- 스타일이나 위치가 불일치

**해결책**:
- **한 가지 방식만 선택**하여 일관되게 사용
- 본 프로젝트에서는 **createDiscreteApi 방식** 사용 ✅

---

### 5. 자동 Import가 작동하지 않음

**문제**: `unplugin-vue-components` 설정 후에도 컴포넌트가 인식되지 않음

**해결책**:

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

---

### 6. Form Validation이 제대로 작동하지 않음

**문제**: 폼 제출 시 유효성 검사가 실행되지 않음

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

### 7. Virtual Scroll이 느림

**문제**: 대용량 데이터에서 스크롤이 부드럽지 않음

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

**추가 최적화**:
- 컬럼 수 최소화 (필수 컬럼만)
- `render` 함수 최적화
- `v-memo` 사용

---

### 8. SSR (Server-Side Rendering) 이슈

**문제**: Nuxt나 SSR 환경에서 hydration mismatch

**해결책**:

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

- **공식 웹사이트**: https://www.naiveui.com
- **GitHub**: https://github.com/tusen-ai/naive-ui
- **NPM**: https://www.npmjs.com/package/naive-ui

### 관련 프로젝트

- **Soybean Admin**: https://github.com/soybeanjs/soybean-admin
- **Naive UI Admin**: https://github.com/jekip/naive-ui-admin
- **Vue Naive Admin**: https://github.com/zclzone/vue-naive-admin

### 아이콘

- **xicons**: https://www.xicons.org

### 커뮤니티

- **GitHub Discussions**: https://github.com/tusen-ai/naive-ui/discussions
- **Stack Overflow**: `[naiveui]` 태그

---

## 본 프로젝트 핵심 체크리스트

### ✅ 설정 확인

- [ ] `main.ts`에서 `createDiscreteApi` 설정 완료
- [ ] `src/types/global.d.ts`에 타입 정의 완료
- [ ] `tsconfig.app.json`에 `"types": ["naive-ui/volar"]` 추가

### ✅ 사용 패턴 확인

- [ ] 템플릿에서 `window.$message` 직접 호출 금지
- [ ] 메서드로 래핑하여 사용
- [ ] Optional chaining (`?.`) 사용

### ✅ 금지 사항

- [ ] `useMessage()`, `useDialog()` 등 Provider 방식 사용 금지
- [ ] Provider와 Discrete API 혼용 금지
- [ ] setup context 외부에서 `createDiscreteApi` 호출 금지

---

**관련 문서**:
- 빠른 참조: `00-quick-reference.md`
- 전역 API 설정: `05-discrete-api.md`
- 실전 패턴: `06-patterns.md`
