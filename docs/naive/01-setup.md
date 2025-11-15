# Naive UI Setup Guide

> 프로젝트 초기 설정 & 환경 구성

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

**⚠️ 본 프로젝트에서는 createDiscreteApi 사용**
- Provider 방식 대신 `createDiscreteApi` 사용
- 자세한 내용: `05-discrete-api.md` 참조

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

**문제 해결**:
- 서버 재시작 필요
- `node_modules/.cache` 삭제
- `components.d.ts` 파일 확인 (자동 생성되어야 함)

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

## 추가 리소스

- **공식 문서**: https://www.naiveui.com
- **GitHub**: https://github.com/tusen-ai/naive-ui
- **xicons**: https://www.xicons.org

---

**다음 단계**:
- 폼 구현: `02-forms.md`
- 테이블 구현: `03-data-tables.md`
- 전역 API 설정: `05-discrete-api.md`
