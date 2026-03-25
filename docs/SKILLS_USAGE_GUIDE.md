# Codex Skills Usage Guide

이 문서는 현재 세션에서 사용 가능한 skills 목록을 기준으로, 어떤 상황에서 어떤 skill을 선택하면 좋은지 빠르게 판단할 수 있도록 정리한 가이드입니다.

## 목적

- 현재 등록된 skill을 용도별로 한 번에 파악
- 작업 성격에 맞는 skill을 빠르게 선택
- 여러 skill을 함께 써야 할 때 추천 순서를 확인
- EveryShift MVP 저장소에서 우선 적용해야 할 project-specific skill을 명확히 정리

## 가장 중요한 원칙

1. 이 저장소에서는 `everyshift-*` skill을 일반 skill보다 먼저 검토합니다.
2. 새 기능, 동작 변경, UI 변경처럼 구현이 들어가는 작업은 보통 process skill과 domain skill을 함께 써야 합니다.
3. 문서 작성, 디자인 산출물, 파일 포맷 작업처럼 구현이 아닌 작업도 전용 skill이 있으면 우선 사용합니다.
4. 완료를 주장하기 전에는 `verification-before-completion` 관점으로 실제 검증 결과를 확보합니다.

## 빠른 선택 순서

### 1. 먼저 작업 유형을 구분

- EveryShift 앱 코드 수정인가?
- 버그 수정인가?
- 새 기능/화면/흐름 설계인가?
- 문서 작성인가?
- 산출물이 `docx`, `pdf`, `pptx`, `xlsx` 같은 파일인가?
- 외부 API/OpenAI/Claude/MCP 관련 작업인가?
- 병렬 작업이나 서브에이전트 분업이 필요한가?

### 2. 그 다음 아래 순서로 skill을 고릅니다

1. `using-superpowers`
2. 작업 방식 skill
   - 새 기능/설계: `brainstorming`
   - 버그/오동작: `systematic-debugging`
   - 큰 작업 계획화: `writing-plans`
3. EveryShift 전용 skill 또는 도메인 skill
4. 출력물 전용 skill
5. 마무리 skill
   - `verification-before-completion`
   - 필요 시 `requesting-code-review`
   - 브랜치 마무리 시 `finishing-a-development-branch`

## EveryShift MVP에서 추천 조합

### 새 화면/기능 추가

`using-superpowers` -> `brainstorming` -> `writing-plans` -> `test-driven-development` -> 관련 `everyshift-*` skill -> `verification-before-completion`

### 버그 수정

`using-superpowers` -> `systematic-debugging` -> `test-driven-development` -> 관련 `everyshift-*` skill -> `verification-before-completion`

### 여러 단계에 걸친 워크플로 변경

`using-superpowers` -> `brainstorming` -> `writing-plans` -> `everyshift-wizard-flow` + 필요 시 `everyshift-pinia-store-generator`/`everyshift-schedule-grid`

### 문서 작성

`using-superpowers` -> `doc-coauthoring`

### UI 검증

`using-superpowers` -> `webapp-testing`

### 큰 작업을 분업할 때

`using-superpowers` -> `dispatching-parallel-agents` 또는 `subagent-driven-development`

## EveryShift 전용 skills

이 저장소에서는 아래 6개를 가장 먼저 고려하면 됩니다.

| Skill                               | 언제 쓰면 좋은가                                                                                                 | 어떻게 쓰면 좋은가                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `everyshift-component-generator`    | `src/components/**`, `src/views/schedule/**`의 Vue SFC를 만들거나 고칠 때                                        | Naive UI, Tailwind, 한국어 UI, 현재 wizard 화면 패턴을 유지하는 용도로 사용              |
| `everyshift-composable-generator`   | `src/composables/**`에서 polling, grid logic, persistence, derived state를 다룰 때                               | 컴포넌트에서 재사용 로직을 분리하되 store처럼 비대해지지 않게 경계를 잡는 데 적합        |
| `everyshift-pinia-store-generator`  | `src/stores/**`에서 auth, organization, schedule, cross-view state를 다룰 때                                     | setup-style store, 명시적 action, reset 흐름, API layer 분리를 지키며 사용할 때 효과적   |
| `everyshift-schedule-grid`          | `ScheduleGrid.vue`, `ShiftSelector`, `ConstraintSelector`, `Step4InitialData.vue`, `Step5Result.vue`를 건드릴 때 | 성능 민감한 그리드, planning/result mode, sticky column/statistics 검증이 핵심일 때 사용 |
| `everyshift-supabase-api-generator` | `src/api/**`에서 Supabase query, Edge Function wrapper, snake_case -> camelCase 매핑이 필요할 때                 | 뷰/스토어에서 직접 Supabase를 만지지 않고 API boundary를 정리할 때 적합                  |
| `everyshift-wizard-flow`            | step route, route guard, `StepIndicator`, temp-save, step progression을 변경할 때                                | 현재 live 5-step flow 기준으로 route/store/button/guard 정합성을 맞추는 용도             |

## Process / Superpowers skills

이 그룹은 "무엇을 만들지"보다 "어떻게 진행할지"를 결정합니다.

| Skill                            | 언제 쓰면 좋은가                                                 | 어떻게 쓰면 좋은가                                                            |
| -------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `using-superpowers`              | 모든 대화 시작 시                                                | 현재 작업에 맞는 다른 skill이 있는지 먼저 점검하는 진입점으로 사용            |
| `brainstorming`                  | 새 기능, 새 UI, 동작 변경, 설계가 필요한 요청                    | 바로 구현하지 말고 요구사항, 대안, 설계를 먼저 확정할 때 사용                 |
| `writing-plans`                  | 여러 파일/단계로 나뉘는 구현 작업                                | 구현 전에 작업을 세분화하고 파일/테스트/검증 순서를 문서화할 때 사용          |
| `test-driven-development`        | 기능 추가, 버그 수정, 리팩터링                                   | 실패하는 테스트를 먼저 만들고 최소 구현으로 통과시키는 흐름에 사용            |
| `systematic-debugging`           | 원인 불명 버그, 테스트 실패, 예상과 다른 동작                    | 추측 패치 대신 재현, 원인 추적, working example 비교를 먼저 할 때 사용        |
| `verification-before-completion` | 완료 보고 직전, 커밋 직전                                        | 테스트/빌드/린트/실행 결과로 완료 근거를 확보할 때 사용                       |
| `requesting-code-review`         | 큰 기능 완료 후, 머지 전, 중요 수정 후                           | 별도 리뷰 관점으로 리스크를 점검하고 다음 단계로 가기 전에 사용               |
| `receiving-code-review`          | 리뷰 피드백을 받았을 때                                          | 리뷰 의견을 그대로 따르지 않고 기술적으로 검증하며 반영 여부를 판단할 때 사용 |
| `using-git-worktrees`            | 큰 작업을 격리된 환경에서 진행해야 할 때                         | 현재 작업 트리를 오염시키지 않고 별도 worktree로 안전하게 작업할 때 사용      |
| `dispatching-parallel-agents`    | 독립적인 하위 작업 2개 이상을 병렬로 처리할 때                   | 서로 다른 파일/책임 범위를 분리해 동시에 진행할 때 사용                       |
| `subagent-driven-development`    | 계획이 있고 task 단위로 분업 실행할 때                           | task마다 subagent를 붙여 구현/리뷰를 반복하는 운영 방식에 적합                |
| `executing-plans`                | 이미 작성된 implementation plan을 현재 세션에서 그대로 실행할 때 | plan 문서를 체크리스트처럼 따라가며 배치 단위로 진행할 때 사용                |
| `finishing-a-development-branch` | 구현과 검증이 끝난 뒤 브랜치 마무리 단계                         | merge, PR, cleanup 중 어떤 형태로 마칠지 결정할 때 사용                       |

## 문서 / 커뮤니케이션 skills

문서 자체가 산출물일 때는 이 그룹이 가장 직접적입니다.

| Skill             | 언제 쓰면 좋은가                                   | 어떻게 쓰면 좋은가                                                     |
| ----------------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| `doc-coauthoring` | 제안서, 스펙, RFC, 가이드, 운영 문서를 작성할 때   | 문맥 수집 -> 구조화 -> reader testing 순서로 문서를 다듬을 때 사용     |
| `internal-comms`  | 사내 공지, 상태 업데이트, 리더십 보고, FAQ를 쓸 때 | 회사 내부 커뮤니케이션 톤과 포맷에 맞춰 정리할 때 사용                 |
| `docx`            | Word 문서를 읽거나 만들거나 수정할 때              | `.docx` 기반 결과물이 필요하면 일반 markdown 대신 이 skill을 우선 사용 |
| `pdf`             | PDF 읽기, 병합, 분할, OCR, 생성이 필요할 때        | PDF가 입력이거나 결과물인 경우 바로 사용                               |
| `pptx`            | 발표 자료를 만들거나 수정할 때                     | 슬라이드 구조, 레이아웃, speaker note, 템플릿 작업 시 사용             |
| `xlsx`            | 엑셀/CSV/TSV 정리, 생성, 변환이 필요할 때          | 표 데이터 자체가 최종 산출물일 때 사용                                 |

## 프론트엔드 / 디자인 / 아티팩트 skills

화면 품질이나 시각적 결과물이 중요한 경우에 사용합니다.

| Skill                   | 언제 쓰면 좋은가                                             | 어떻게 쓰면 좋은가                                               |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `frontend-design`       | 웹 페이지, 랜딩, 대시보드, 컴포넌트 UI를 새로 만들 때        | 기존 디자인 시스템이 없거나 디자인 품질을 끌어올려야 할 때 사용  |
| `web-artifacts-builder` | 복잡한 HTML artifact, React 기반 상호작용 산출물이 필요할 때 | 라우팅, 상태관리, shadcn/ui급 구성이 필요한 artifact 제작에 적합 |
| `theme-factory`         | 문서/슬라이드/HTML 결과물에 일관된 테마를 입혀야 할 때       | 이미 만든 결과물에 빠르게 색/폰트/분위기 체계를 입히는 용도      |
| `brand-guidelines`      | Anthropic 스타일 가이드를 적용해야 할 때                     | Anthropic 브랜드 컬러/타이포를 맞춰야 하는 특별한 경우에만 사용  |
| `canvas-design`         | 포스터, 정적 비주얼, 인쇄용 아트워크가 필요할 때             | 코드보다 결과물 미감이 더 중요한 정적 디자인 작업에 적합         |
| `algorithmic-art`       | p5.js 기반 생성형 아트를 만들어야 할 때                      | 시드 기반 랜덤성, 파라미터 탐색이 필요한 아트 생성에 사용        |
| `slack-gif-creator`     | Slack용 짧은 GIF를 제작해야 할 때                            | 용량/프레임/반복 특성을 Slack 친화적으로 맞추는 데 사용          |

## 개발 플랫폼 / API / 테스트 skills

외부 시스템이나 기술 문서를 다루는 작업에서 유용합니다.

| Skill            | 언제 쓰면 좋은가                                                   | 어떻게 쓰면 좋은가                                                      |
| ---------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `openai-docs`    | OpenAI 제품/API 사용법, 최신 모델 선택, 공식 문서 근거가 필요할 때 | 공식 OpenAI 문서를 우선 확인하고 최신 정보를 인용해야 할 때 사용        |
| `claude-api`     | Anthropic/Claude API 또는 Agent SDK를 사용할 때                    | `anthropic` 관련 SDK, 툴 사용, 예제 패턴이 필요한 경우 사용             |
| `mcp-builder`    | MCP 서버를 직접 만들 때                                            | 외부 시스템을 tool 형태로 연결하는 MCP 서버 설계/구현에 사용            |
| `webapp-testing` | 로컬 웹앱을 Playwright로 검증할 때                                 | 특정 route, UI surface, action, expected result를 실제로 확인할 때 사용 |

## Skill 제작 / 운영 skills

skill 자체를 만들거나 설치하거나 개선하는 작업용입니다.

| Skill                    | 언제 쓰면 좋은가                                         | 어떻게 쓰면 좋은가                                                       |
| ------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------ |
| `skill-creator`          | 새 skill 생성, 기존 skill 개선, eval/benchmark를 돌릴 때 | 성능 측정, 설명 개선, 패키징, 반복 개선이 필요할 때 사용                 |
| `skill-creator` (system) | 새 skill을 만들거나 기존 skill을 업데이트할 때           | 현재 환경에 내장된 system 버전으로, trigger 설명과 구조 개선 용도로 사용 |
| `writing-skills`         | skill 문서와 사용성 자체를 설계/검증할 때                | skill의 품질, 문서 구조, 테스트 전략을 다듬는 데 적합                    |
| `skill-installer`        | 큐레이션된 skill 또는 외부 repo skill을 설치할 때        | 설치 가능한 skill 탐색, 설치, 등록이 목적일 때 사용                      |
| `template-skill`         | 실사용보다는 skill 템플릿이 필요할 때                    | 새 skill 초안의 골격만 빠르게 만들 때 참고용으로 사용                    |

## 상황별 추천 매핑

### 1. Vue 컴포넌트를 고친다

- 기본: `everyshift-component-generator`
- Step 흐름도 같이 바뀐다: `everyshift-wizard-flow`
- 그리드 관련이다: `everyshift-schedule-grid`

### 2. composable로 로직을 뺀다

- 기본: `everyshift-composable-generator`
- polling/debug 성격이 강하다: `systematic-debugging` 병행

### 3. store 구조를 바꾼다

- 기본: `everyshift-pinia-store-generator`
- step 이동 조건까지 바뀐다: `everyshift-wizard-flow`

### 4. Supabase 연동 코드를 정리한다

- 기본: `everyshift-supabase-api-generator`
- store에서 API로 경계를 옮길 때도 같이 사용

### 5. Step4/Step5 그리드를 바꾼다

- 반드시 `everyshift-schedule-grid` 우선
- 관련 store/route까지 바뀌면 `everyshift-pinia-store-generator`, `everyshift-wizard-flow` 추가

### 6. 새 기능을 아예 설계부터 구현한다

- `brainstorming` -> `writing-plans` -> `test-driven-development` -> 관련 domain skill

### 7. 원인 모를 버그를 고친다

- `systematic-debugging` -> `test-driven-development` -> 관련 domain skill

### 8. 문서를 잘 쓰고 싶다

- 일반 문서: `doc-coauthoring`
- 내부 공유 문서: `internal-comms`
- Word/PDF/PPT/Excel 결과물: 각각 `docx`, `pdf`, `pptx`, `xlsx`

### 9. 작업을 끝내기 전에 무엇을 해야 하는지 헷갈린다

- 검증: `verification-before-completion`
- 리뷰: `requesting-code-review`
- 브랜치 정리: `finishing-a-development-branch`

## 실무에서 자주 쓰는 조합

### 조합 A: EveryShift 화면 개선

`using-superpowers` + `brainstorming` + `everyshift-component-generator`

설계가 필요한 UI 변경에 적합합니다.

### 조합 B: Step 흐름 변경

`using-superpowers` + `writing-plans` + `everyshift-wizard-flow` + `everyshift-pinia-store-generator`

route, store, next/back 버튼, guard가 함께 바뀌는 작업에 적합합니다.

### 조합 C: Grid 버그 수정

`using-superpowers` + `systematic-debugging` + `test-driven-development` + `everyshift-schedule-grid`

재현이 어렵고 영향 범위가 큰 grid 이슈에 적합합니다.

### 조합 D: Supabase API 정리

`using-superpowers` + `everyshift-supabase-api-generator` + `everyshift-pinia-store-generator`

직접 query가 퍼져 있는 코드를 API boundary로 모을 때 유용합니다.

### 조합 E: 큰 기능 분업 구현

`using-superpowers` + `writing-plans` + `dispatching-parallel-agents` 또는 `subagent-driven-development`

여러 독립 task를 병렬로 진행할 때 적합합니다.

## 이 저장소 기준 권장 우선순위

1. EveryShift 앱 코드 작업이면 `everyshift-*`부터 선택
2. 새 기능/동작 변경이면 `brainstorming` 여부 먼저 판단
3. 버그면 `systematic-debugging`부터 시작
4. 규모가 있으면 `writing-plans`
5. 구현 중이면 `test-driven-development`
6. 끝나기 전에는 `verification-before-completion`

## 참고 메모

- 현재 skill 목록에는 `skill-creator`가 두 번 보입니다.
  - 하나는 일반 skill 패키지 버전
  - 하나는 system 영역의 내장 버전
  - 둘 다 skill 제작 계열로 보면 되며, 실제 사용 시에는 현재 환경에서 불러온 설명을 기준으로 선택하면 됩니다.
- `template-skill`은 실전 작업용이라기보다 새 skill 초안을 잡는 템플릿 성격이 강합니다.
- `brand-guidelines`는 범용 브랜딩 skill이 아니라 Anthropic 스타일 적용용입니다.

## 한 줄 요약

EveryShift 저장소에서는 `everyshift-*`를 최우선으로 보고, 그 위에 `brainstorming`/`systematic-debugging`/`writing-plans` 같은 process skill을 겹쳐 쓰는 방식이 가장 안정적입니다.
