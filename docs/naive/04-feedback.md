# Naive UI Feedback Components

> Modal, Dialog, Message, Notification 컴포넌트

## Modal (Dialog)

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

**⚠️ 본 프로젝트에서는 window.$message 사용**
- `useMessage()`, `useDialog()` 대신 `window.$message`, `window.$dialog` 사용
- 자세한 내용: `05-discrete-api.md` 참조

---

## Message API

### 기본 사용법

```typescript
// ❌ Provider 방식 (본 프로젝트에서 사용 안 함)
import { useMessage } from 'naive-ui';
const message = useMessage();

// ✅ Discrete API 방식 (본 프로젝트)
const showSuccess = () => {
  window.$message?.success('성공 메시지!');
};

const showError = () => {
  window.$message?.error('에러 메시지!');
};

const showWarning = () => {
  window.$message?.warning('경고 메시지!');
};

const showInfo = () => {
  window.$message?.info('정보 메시지!');
};
```

### 옵션

```typescript
window.$message?.success('메시지', {
  duration: 3000,  // 3초 후 자동 닫힘
  closable: true,  // 닫기 버튼 표시
  keepAliveOnHover: true,  // 마우스 오버 시 닫히지 않음
});
```

---

## Dialog API

### 기본 사용법

```typescript
// ✅ 확인 다이얼로그
const showConfirm = () => {
  window.$dialog?.warning({
    title: '확인',
    content: '정말 삭제하시겠습니까?',
    positiveText: '확인',
    negativeText: '취소',
    onPositiveClick: () => {
      window.$message?.success('삭제되었습니다');
    },
    onNegativeClick: () => {
      window.$message?.info('취소되었습니다');
    },
  });
};

// ✅ 경고 다이얼로그
const showWarning = () => {
  window.$dialog?.warning({
    title: '경고',
    content: '이 작업은 되돌릴 수 없습니다.',
    positiveText: '확인',
  });
};

// ✅ 에러 다이얼로그
const showError = () => {
  window.$dialog?.error({
    title: '오류',
    content: '작업을 완료할 수 없습니다.',
    positiveText: '확인',
  });
};
```

---

## Notification

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

**⚠️ 본 프로젝트에서는 window.$notification 사용**
```typescript
window.$notification?.success({
  title: '성공',
  content: '작업이 완료되었습니다.',
  duration: 2500,
});
```

---

## 로딩 상태 관리

### NSpin (로딩 스피너)

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

## 실전 패턴

### API 에러 핸들링

```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/endpoint');

    if (!response.ok) {
      const error = await response.json();
      window.$message?.error(error.message || '요청 실패');
      return;
    }

    window.$message?.success('저장되었습니다');
  } catch (error) {
    window.$message?.error('네트워크 오류가 발생했습니다');
  }
};
```

### 삭제 확인

```typescript
const handleDelete = (id: string) => {
  window.$dialog?.warning({
    title: '삭제 확인',
    content: '정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
    positiveText: '삭제',
    negativeText: '취소',
    onPositiveClick: async () => {
      try {
        await deleteItem(id);
        window.$message?.success('삭제되었습니다');
      } catch (error) {
        window.$message?.error('삭제 실패');
      }
    },
  });
};
```

---

## 문제 해결

### Message/Dialog API가 작동하지 않음

**Provider 방식 사용 시** (본 프로젝트 아님):
```vue
<!-- App.vue -->
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

**본 프로젝트 (Discrete API)**:
- `main.ts`에서 `createDiscreteApi` 설정 확인
- `window.$message` 등이 정의되어 있는지 확인
- 자세한 내용: `05-discrete-api.md` 참조

---

**관련 문서**:
- 전역 API 설정: `05-discrete-api.md`
- 빠른 참조: `00-quick-reference.md`
- 문제 해결: `07-troubleshooting.md`
