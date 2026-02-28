---
name: vue-component-creator
description: Vue 3 SFC 컴포넌트를 생성 및 최적화합니다. Naive UI 컴포넌트 라이브러리와 Tailwind CSS를 사용하여 재사용 가능한 UI 컴포넌트를 구현할 때 사용합니다.
---

# Vue Component Creator

## Overview

이 스킬은 EveryShift MVP의 디자인 시스템과 일관된 UI/UX를 제공하기 위한 Vue 3 컴포넌트 생성을 담당합니다.

## Core Capabilities

### 1. SFC 구조 설계
- `<script setup>` 및 TypeScript를 사용한 표준 SFC 템플릿 생성.
- `props`, `emits`, `slots`를 활용한 재사용성 극대화.

### 2. Naive UI 활용
- `n-card`, `n-button`, `n-data-table` 등 Naive UI 컴포넌트의 적절한 속성 설정.
- Naive UI의 테마 및 커스텀 스타일 적용.

### 3. Tailwind CSS 스타일링
- 유틸리티 클래스 위주의 빠른 UI 구현.
- 복잡한 그리드 및 레이아웃 처리.

### 4. 반응형 레이아웃
- 모바일 및 데스크탑 환경에 대응하는 레이아웃 설계.
- `v-if`, `v-show`를 통한 조건부 렌더링 최적화.

## Guidelines

1. **컴포넌트 분리:** 뷰 파일이 지나치게 커지면 비즈니스 로직과 UI 로직을 적절히 분리하여 `src/components/`로 추출하십시오.
2. **명명 규칙:** PascalCase를 컴포넌트 이름에 사용하고 파일 이름도 일치시키십시오.
3. **접근성 및 성능:** 불필요한 리렌더링을 방지하고 시맨틱 태그를 사용하여 웹 접근성을 높이십시오.

## Resources

- **references/component_patterns.md:** Naive UI와 Tailwind CSS를 결합한 공통 컴포넌트 디자인 패턴.
