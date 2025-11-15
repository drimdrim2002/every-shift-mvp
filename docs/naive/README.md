# Naive UI Documentation (로컬 캐시)

> Vue 3 전용 컴포넌트 라이브러리 문서 - 오프라인 참조용

## 📚 문서 개요

이 폴더는 Naive UI 공식 문서의 로컬 캐시입니다.
Claude Code의 네트워크 제한으로 naiveui.com 접근이 불가능하여 생성되었습니다.

- **버전**: Naive UI 2.43.1 기준
- **출처**: [GitHub - naive-ui](https://github.com/tusen-ai/naive-ui)
- **라이선스**: MIT License

---

## 📂 파일 구조

### 전체 가이드
- **[naive-ui-document.md](./naive-ui-document.md)** - 종합 가이드 (1600+ 줄)
  - 설치, 설정, TypeScript, 테마, 컴포넌트
  - **createDiscreteApi 완벽 가이드** ⭐
  - **실전 문제 해결** (window.$message 에러 등)
  - 일반적인 패턴, 자동 Import, 아이콘

### API 레퍼런스
- **[createDiscreteApi.md](./createDiscreteApi.md)** - Discrete API 상세
- **[message-api.md](./message-api.md)** - Message API 레퍼런스
- **[dialog-api.md](./dialog-api.md)** - Dialog API 레퍼런스
- **[notification-api.md](./notification-api.md)** - Notification API 레퍼런스
- **[loading-bar-api.md](./loading-bar-api.md)** - LoadingBar API 레퍼런스

### 실전 가이드
- **[best-practices.md](./best-practices.md)** - ✅ DO / ❌ DON'T 패턴
- **[troubleshooting.md](./troubleshooting.md)** - 실전 문제 해결 가이드

### 유틸리티
- **[fetch-docs.sh](./fetch-docs.sh)** - 문서 자동 다운로드 스크립트

---

## 🚀 빠른 시작

### 1. 전역 API 설정 (본 프로젝트 패턴)

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

### 2. 컴포넌트에서 사용

```vue
<script setup lang="ts">
// ✅ 안전한 패턴: 메서드로 래핑
const showSuccess = () => {
  window.$message?.success('성공!');
};
</script>

<template>
  <n-button @click="showSuccess">클릭</n-button>
</template>
```

### 3. 상세 가이드

- **기본 설치 및 설정**: [naive-ui-document.md](./naive-ui-document.md#설치)
- **createDiscreteApi 사용법**: [naive-ui-document.md](./naive-ui-document.md#setup-외부에서-사용하기-discrete-api)
- **문제 해결**: [troubleshooting.md](./troubleshooting.md)
- **권장 패턴**: [best-practices.md](./best-practices.md)

---

## ⚠️ 주의사항

### Claude Code 네트워크 제한

Claude Code는 보안상 다음 도메인만 접근 가능:
- ✅ api.anthropic.com
- ✅ github.com
- ✅ npmjs.com
- ✅ pypi.org
- ❌ naiveui.com (차단됨)

따라서 **모든 문서를 로컬에 캐싱**하여 사용합니다.

### 문서 업데이트

```bash
# 자동 스크립트 사용
bash docs/naive/fetch-docs.sh

# 또는 수동으로 GitHub에서 다운로드
# https://github.com/tusen-ai/naive-ui/tree/main/src
```

---

## 🔍 검색 가이드

### 주제별 빠른 찾기

**설치 및 설정:**
- [기본 설치](./naive-ui-document.md#설치)
- [TypeScript 설정](./naive-ui-document.md#typescript-설정)
- [자동 Import](./naive-ui-document.md#자동-import-설정)

**Discrete API (전역 사용):**
- [createDiscreteApi란?](./naive-ui-document.md#creatediscreteapi란)
- [사용법 가이드](./naive-ui-document.md#creatediscreteapi-사용법)
- [주의사항](./naive-ui-document.md#creatediscreteapi-주의사항)
- [안전한 패턴](./naive-ui-document.md#안전한-사용-패턴)

**문제 해결:**
- [window.$message undefined 에러](./naive-ui-document.md#4-1-windowmessage-undefined-에러-creatediscreteapi-사용-시)
- [Provider context 에러](./naive-ui-document.md#4-2-usemessage-provider-context-에러)
- [Tailwind CSS 충돌](./naive-ui-document.md#1-css-스타일-충돌-tailwind-css와-함께-사용-시)

**API 레퍼런스:**
- [Message API](./message-api.md)
- [Dialog API](./dialog-api.md)
- [Notification API](./notification-api.md)
- [LoadingBar API](./loading-bar-api.md)

---

## 📖 추가 리소스

### 공식 문서 (온라인)
- 공식 사이트: https://www.naiveui.com (Windows 브라우저에서만)
- GitHub: https://github.com/tusen-ai/naive-ui
- NPM: https://www.npmjs.com/package/naive-ui

### 프로젝트 관련
- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 전체 가이드
- [package.json](../../package.json) - 설치된 버전 확인

---

## 🔄 문서 버전 관리

| 버전 | 업데이트 날짜 | 변경 사항 |
|------|--------------|-----------|
| 1.0.0 | 2024-11-15 | 초기 문서 생성 |
| | | - createDiscreteApi 가이드 추가 |
| | | - 실전 문제 해결 섹션 추가 |
| | | - best-practices.md 생성 |
| | | - troubleshooting.md 생성 |

---

## 💡 기여 가이드

문서 개선 제안이나 오류 발견 시:
1. 해당 섹션 수정
2. 이 README의 버전 테이블 업데이트
3. CLAUDE.md에 변경사항 반영 (필요시)

---

## 📝 라이선스

이 문서는 Naive UI 공식 문서에서 가져왔으며, MIT License를 따릅니다.
- Copyright (c) 2019-present TuSimple

자세한 내용: https://github.com/tusen-ai/naive-ui/blob/main/LICENSE
