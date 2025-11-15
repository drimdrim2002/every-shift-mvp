# Naive UI Best Practices

> ✅ DO / ❌ DON'T 패턴 가이드

## 목차

1. [전역 API 설정](#전역-api-설정)
2. [컴포넌트에서 사용](#컴포넌트에서-사용)
3. [타입 안전성](#타입-안전성)
4. [에러 핸들링](#에러-핸들링)
5. [성능 최적화](#성능-최적화)

---

## 전역 API 설정

### ✅ DO: createDiscreteApi 사용 (권장)

```typescript
// main.ts
import { createDiscreteApi } from 'naive-ui';

// ✅ mount 전에 초기화
const { message, dialog, notification, loadingBar } = createDiscreteApi([
  'message',
  'dialog',
  'notification',
  'loadingBar',
]);

// ✅ 전역 객체에 할당
window.$message = message;
window.$dialog = dialog;
window.$notification = notification;
window.$loadingBar = loadingBar;

const app = createApp(App);
app.mount('#app');
```

**장점**:
- Provider 불필요
- setup 외부에서 사용 가능
- 어디서든 일관된 API 접근

### ❌ DON'T: Provider와 Discrete API 혼용

```typescript
// main.ts
const { message } = createDiscreteApi(['message']);
window.$message = message;
```

```vue
<!-- App.vue -->
<template>
  <!-- ❌ Provider와 혼용하지 말 것 -->
  <n-message-provider>
    <Content />
  </n-message-provider>
</template>
```

**문제점**:
- 두 개의 독립적인 메시지 시스템
- 설정이 공유되지 않음
- 혼란스러운 동작

### ❌ DON'T: mount 후 초기화

```typescript
// main.ts
const app = createApp(App);
app.mount('#app'); // ❌ 너무 이른 마운트

// ❌ mount 후 초기화는 너무 늦음
const { message } = createDiscreteApi(['message']);
window.$message = message;
```

**문제점**:
- 컴포넌트가 이미 렌더링된 후 초기화
- Race condition 발생 가능

---

## 컴포넌트에서 사용

### ✅ DO: 메서드로 감싸기

```vue
<script setup lang="ts">
// ✅ 메서드 내부에서 접근
const showSuccess = () => {
  window.$message?.success('성공!');
};

const showError = (msg: string) => {
  window.$message?.error(msg);
};
</script>

<template>
  <!-- ✅ 메서드 호출 -->
  <n-button @click="showSuccess">성공</n-button>
  <n-button @click="showError('에러 발생')">에러</n-button>
</template>
```

**장점**:
- 실행 시점에 평가됨
- Optional chaining으로 안전
- 재사용 가능

### ✅ DO: 유틸리티 함수 사용

```typescript
// src/utils/message.ts
export function showSuccess(content: string) {
  window.$message?.success(content);
}

export function showError(content: string) {
  window.$message?.error(content);
}

export function showWarning(content: string) {
  window.$message?.warning(content);
}
```

```vue
<script setup lang="ts">
import { showSuccess, showError } from '@/utils/message';

const handleSubmit = async () => {
  try {
    await api.submit();
    showSuccess('제출 완료!');
  } catch (error) {
    showError('제출 실패');
  }
};
</script>
```

**장점**:
- 중앙화된 관리
- 일관된 사용 패턴
- 테스트 용이

### ❌ DON'T: 템플릿에서 직접 접근

```vue
<template>
  <!-- ❌ 템플릿에서 직접 접근 금지 -->
  <n-button @click="window.$message.success('성공!')">
    클릭
  </n-button>

  <!-- ❌ Optional chaining 없이 접근 -->
  <n-button @click="window.$message.error('에러')">
    에러
  </n-button>
</template>
```

**문제점**:
- 초기화 타이밍 문제
- undefined 에러 가능성
- HMR 중 오류 발생

### ❌ DON'T: setup에서 즉시 할당

```vue
<script setup lang="ts">
// ❌ setup 시점에 즉시 할당
const message = window.$message; // undefined일 수 있음!

const showSuccess = () => {
  message.success('성공!'); // ❌ 에러!
};
</script>
```

**문제점**:
- setup 시점에 window.$message가 undefined일 수 있음
- HMR 중 재초기화되지 않음

---

## 타입 안전성

### ✅ DO: 전역 타입 정의

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

**장점**:
- TypeScript 자동완성
- 컴파일 타임 에러 감지
- IDE 지원

### ✅ DO: tsconfig에 naive-ui/volar 추가

```json
{
  "compilerOptions": {
    "types": ["vite/client", "naive-ui/volar"]
  }
}
```

**장점**:
- 컴포넌트 타입 추론
- Props 자동완성
- 더 나은 IDE 경험

### ✅ DO: 유틸리티 함수에 타입 추가

```typescript
// src/utils/message.ts
import type { MessageOptions } from 'naive-ui';

export function showSuccess(
  content: string,
  options?: MessageOptions
): void {
  window.$message?.success(content, options);
}

export function showError(
  content: string,
  options?: MessageOptions
): void {
  window.$message?.error(content, options);
}
```

**장점**:
- 타입 안전성
- 옵션 자동완성
- 문서화 효과

### ❌ DON'T: any 타입 사용

```typescript
// ❌ 타입을 any로 우회하지 말 것
const message: any = window.$message;
message.whatever(); // 런타임 에러 가능
```

**문제점**:
- 타입 안전성 상실
- 에러 감지 불가
- 유지보수 어려움

---

## 에러 핸들링

### ✅ DO: Optional Chaining 사용

```typescript
// ✅ 항상 optional chaining 사용
window.$message?.success('성공!');
window.$dialog?.warning({
  title: '경고',
  content: '정말 삭제하시겠습니까?',
});
```

**장점**:
- undefined 에러 방지
- 안전한 폴백
- 디버깅 용이

### ✅ DO: 폴백 로직 구현

```typescript
// src/utils/message.ts
export function showSuccess(content: string): void {
  if (!window.$message) {
    console.warn('Naive UI message API not initialized');
    // 폴백: 네이티브 alert 또는 다른 방법
    console.log('SUCCESS:', content);
    return;
  }

  window.$message.success(content);
}
```

**장점**:
- 초기화 실패 시 graceful degradation
- 디버깅 정보 제공
- 사용자 경험 개선

### ✅ DO: Try-Catch로 감싸기 (중요한 경우)

```typescript
async function handleCriticalOperation() {
  try {
    await criticalAPI();

    // ✅ 메시지 표시 실패가 앱 전체를 멈추지 않도록
    try {
      window.$message?.success('완료!');
    } catch (msgError) {
      console.warn('Failed to show message:', msgError);
    }
  } catch (error) {
    console.error('Critical operation failed:', error);
    window.$message?.error('작업 실패');
  }
}
```

**장점**:
- 메시지 표시 실패가 전체 로직을 방해하지 않음
- 로깅으로 디버깅 가능
- 견고한 에러 처리

### ❌ DON'T: 에러 무시

```typescript
// ❌ 에러를 무시하지 말 것
try {
  window.$message.success('성공!'); // Optional chaining 없음!
} catch {
  // ❌ 조용히 실패
}
```

**문제점**:
- 디버깅 어려움
- 근본 원인 파악 불가
- 사용자 피드백 없음

---

## 성능 최적화

### ✅ DO: 메시지 닫기 처리

```typescript
// ✅ 장기 실행 작업에는 메시지 레퍼런스 저장
async function longRunningTask() {
  const loadingMsg = window.$message?.loading('처리 중...', {
    duration: 0, // 자동으로 닫히지 않음
  });

  try {
    await someAsyncWork();
    loadingMsg?.destroy(); // ✅ 명시적으로 닫기
    window.$message?.success('완료!');
  } catch (error) {
    loadingMsg?.destroy();
    window.$message?.error('실패!');
  }
}
```

**장점**:
- 메모리 누수 방지
- 사용자 경험 개선
- 명확한 상태 전환

### ✅ DO: duration 설정

```typescript
// ✅ 적절한 duration 설정
window.$message?.success('저장 완료!', {
  duration: 3000, // 3초 후 자동 닫힘
});

window.$message?.error('중요한 에러!', {
  duration: 5000, // 5초 후 자동 닫힘
  closable: true, // 수동으로도 닫을 수 있음
});
```

**장점**:
- 메모리 효율적
- 사용자가 읽을 충분한 시간
- 화면 정리

### ✅ DO: 컴포넌트 언마운트 시 정리

```vue
<script setup lang="ts">
import { onBeforeUnmount } from 'vue';
import type { MessageReactive } from 'naive-ui';

let activeMessages: MessageReactive[] = [];

const showMessage = (content: string) => {
  const msg = window.$message?.info(content, { duration: 0 });
  if (msg) activeMessages.push(msg);
};

// ✅ 컴포넌트 언마운트 시 모든 메시지 닫기
onBeforeUnmount(() => {
  activeMessages.forEach((msg) => msg.destroy());
  activeMessages = [];
});
</script>
```

**장점**:
- 메모리 누수 방지
- 깨끗한 상태 유지
- 리소스 관리

### ❌ DON'T: 무한정 메시지 표시

```typescript
// ❌ duration: 0으로 무한정 표시하지 말 것
setInterval(() => {
  window.$message?.info('주기적 알림', {
    duration: 0, // ❌ 절대 안 닫힘!
  });
}, 10000); // ❌ 10초마다 메시지 누적됨
```

**문제점**:
- 메모리 누수
- UI 혼잡
- 성능 저하

### ❌ DON'T: 동일한 메시지 중복 표시

```typescript
// ❌ 중복 방지 없이 반복 호출
button.addEventListener('click', () => {
  window.$message?.success('저장 완료!');
  window.$message?.success('저장 완료!'); // ❌ 중복!
  window.$message?.success('저장 완료!'); // ❌ 중복!
});
```

**개선**:

```typescript
// ✅ 중복 방지
let lastMessageTime = 0;
const DEBOUNCE_TIME = 1000;

function showSuccessDebounced(content: string) {
  const now = Date.now();
  if (now - lastMessageTime < DEBOUNCE_TIME) {
    return; // 1초 내 중복 호출 무시
  }

  lastMessageTime = now;
  window.$message?.success(content);
}
```

---

## 종합 예제

### ✅ 완벽한 패턴

```typescript
// src/utils/message.ts
import type { MessageApi, MessageOptions, MessageReactive } from 'naive-ui';

class MessageService {
  private api: MessageApi | null = null;
  private lastMessageTime = 0;
  private readonly DEBOUNCE_TIME = 500;

  private getApi(): MessageApi {
    if (!this.api) {
      if (!window.$message) {
        throw new Error('Naive UI message API not initialized');
      }
      this.api = window.$message;
    }
    return this.api;
  }

  private shouldShowMessage(): boolean {
    const now = Date.now();
    if (now - this.lastMessageTime < this.DEBOUNCE_TIME) {
      return false;
    }
    this.lastMessageTime = now;
    return true;
  }

  success(content: string, options?: MessageOptions): MessageReactive | null {
    if (!this.shouldShowMessage()) return null;

    try {
      return this.getApi().success(content, {
        duration: 3000,
        ...options,
      });
    } catch (error) {
      console.error('Failed to show success message:', error);
      return null;
    }
  }

  error(content: string, options?: MessageOptions): MessageReactive | null {
    // 에러 메시지는 중복 방지 안 함
    try {
      return this.getApi().error(content, {
        duration: 5000,
        closable: true,
        ...options,
      });
    } catch (error) {
      console.error('Failed to show error message:', error);
      return null;
    }
  }

  // 기타 메서드들...
}

export const messageService = new MessageService();

// 편의 함수들
export const showSuccess = (content: string, options?: MessageOptions) =>
  messageService.success(content, options);

export const showError = (content: string, options?: MessageOptions) =>
  messageService.error(content, options);
```

```vue
<!-- 컴포넌트에서 사용 -->
<script setup lang="ts">
import { showSuccess, showError } from '@/utils/message';

const handleSave = async () => {
  try {
    await saveData();
    showSuccess('저장 완료!');
  } catch (error) {
    showError('저장 실패!');
  }
};
</script>

<template>
  <n-button @click="handleSave">저장</n-button>
</template>
```

---

## 요약 체크리스트

### 설정 단계
- [ ] `createDiscreteApi` 사용
- [ ] `app.mount()` **전에** window 객체 할당
- [ ] 전역 타입 정의 (`global.d.ts`)
- [ ] `tsconfig.app.json`에 `naive-ui/volar` 추가

### 사용 단계
- [ ] 템플릿에서 직접 접근 금지
- [ ] 항상 메서드로 감싸기
- [ ] Optional chaining (`?.`) 사용
- [ ] 유틸리티 함수로 추상화

### 에러 핸들링
- [ ] 폴백 로직 구현
- [ ] Try-Catch로 중요 부분 감싸기
- [ ] 에러 로깅 추가

### 성능 최적화
- [ ] 적절한 duration 설정
- [ ] 컴포넌트 언마운트 시 정리
- [ ] 중복 메시지 방지
- [ ] 메시지 레퍼런스 관리

---

## 추가 리소스

- [Troubleshooting Guide](./troubleshooting.md) - 문제 해결 가이드
- [README](./README.md) - 문서 인덱스
- [createDiscreteApi API](./createDiscreteApi.md) - API 레퍼런스
- [Naive UI 공식 문서](https://www.naiveui.com) - 온라인 환경

---

## 문서 히스토리

| 날짜 | 변경 사항 |
|------|----------|
| 2024-11-15 | 초기 문서 작성 - 실전 경험 기반 DO/DON'T 패턴 정리 |
