# Plan Mode 운영 규칙

이 문서는 agent가 plan mode에서 구현 계획을 제안하기 전에 따라야 할 운영 규칙을 정의한다. 목적은 빠르지만 불명확한 계획을 줄이고, 모호함을 먼저 드러낸 뒤, 구현 전에 검증 가능한 실행 계약을 만드는 것이다.

## 목적

Plan mode는 단순히 작업 목록을 빨리 만드는 모드가 아니라 품질 게이트다.

Agent는 불명확한 요청을 명확한 실행 계약으로 바꿔야 한다. 요청이 모호하면 그 모호함을 드러내고, 필요한 경우 질문하거나 불확실성을 명시해야 한다. 설계를 바꿀 수 있는 요구사항을 조용히 임의로 만들어서는 안 된다.

계획의 깊이는 risk에 비례해야 한다. 작고 명확한 요청은 작고 명확한 계획으로 충분하다. 넓거나 모호한 요청은 더 깊은 조사와 설계 과정이 필요하다.

## 핵심 규칙

아래 단계를 완료하기 전에는 구현 계획을 작성하지 않는다.

1. 목표를 agent의 말로 다시 설명한다.
2. 모호한 요구사항을 식별한다.
3. 코드 변경을 제안하기 전에 관련 로컬 파일을 확인한다.
4. 가정을 명시적으로 나열한다.
5. 어떤 가정이 설계를 바꿀 수 있다면 명확화 질문을 한다.
6. 서로 다른 설계가 실제로 가능한 경우에만 최소 두 가지 접근안을 제시하고 trade-off를 설명한다.
7. 하나의 접근안을 추천하고 이유를 설명한다.
8. 구체적인 acceptance criteria를 정의한다.
9. 단계별 구현 계획을 작성한다.
10. 계획을 비판적으로 재검토하고 수정한 뒤, 사용자 승인을 기다린다.

사용자가 특정 출력 형식을 지정한 경우에는 그 형식을 우선 따른다. 지정된 형식이 이 규칙과 충돌하면, 충돌을 짧게 설명하고 더 엄격한 plan mode 프로토콜로 진행할지 확인한다.

기계적이거나 risk가 낮은 요청은 아래 simple plan fast path를 사용할 수 있다. Fast path도 code inspection, assumptions, acceptance criteria, approval stop은 필요하지만, 긴 template이나 억지 alternative를 요구하지 않는다.

## 정보 라벨

정보가 부족하거나 불확실한 경우 숨기지 말고 다음 라벨로 표시한다.

- `Question`: 사용자의 답변이 필요하다. 답변에 따라 동작, 범위, 아키텍처가 달라질 수 있다.
- `Assumption`: 이 내용이 참이라는 전제에서만 진행할 수 있다.
- `Risk`: 계획이 실패하거나 기존 동작을 깨거나 운영 비용을 만들 수 있는 지점이다.
- `Needs code inspection`: 특정 파일을 읽기 전에는 답할 수 없다.

## 모호성 점검표

계획을 작성하기 전에 각 항목을 점검한다.

| 항목                                | 상태                               | 메모                                            |
| ----------------------------------- | ---------------------------------- | ----------------------------------------------- |
| User flow / expected behavior       | Clear / Ambiguous / Not applicable | 사용자는 무엇을 보고 무엇을 해야 하는가?        |
| Data model changes                  | Clear / Ambiguous / Not applicable | schema, type, persistence 변경이 필요한가?      |
| API contract                        | Clear / Ambiguous / Not applicable | request, response, error contract가 바뀌는가?   |
| Error handling                      | Clear / Ambiguous / Not applicable | 실패 시 어떤 동작을 해야 하는가?                |
| Authentication / authorization      | Clear / Ambiguous / Not applicable | 누가 이 동작을 수행할 수 있는가?                |
| Edge cases                          | Clear / Ambiguous / Not applicable | 특수 상태에서도 유지되어야 할 동작은 무엇인가?  |
| Migration or backward compatibility | Clear / Ambiguous / Not applicable | 기존 데이터나 기존 동작을 보존해야 하는가?      |
| Tests                               | Clear / Ambiguous / Not applicable | 무엇으로 변경이 정상임을 증명할 것인가?         |
| Performance impact                  | Clear / Ambiguous / Not applicable | 로딩, 렌더링, query 비용에 영향이 있는가?       |
| Deployment impact                   | Clear / Ambiguous / Not applicable | 환경 변수, build, release 단계에 영향이 있는가? |
| Rollback plan                       | Clear / Ambiguous / Not applicable | 변경을 안전하게 되돌릴 수 있는가?               |

어떤 항목이든 `Ambiguous`라면 명확화 질문을 하거나, 그 모호함을 가정으로 남겨도 안전한 이유를 설명한다.

## 필수 계획 섹션

중간 규모와 큰 규모의 계획은 아래 섹션을 포함해야 한다. 비어 있는 섹션이 있다면 왜 비어 있는지 설명한다. 작은 fast-path 계획은 같은 정보를 더 적은 heading으로 압축할 수 있지만, 실제 모호함, risk, acceptance criteria, verification을 생략해서는 안 된다.

## Goal

요청된 결과를 쉬운 말로 다시 설명한다. 필요한 경우 scope와 out-of-scope를 함께 적는다.

## Current Codebase Understanding

로컬 파일을 확인한 뒤 알게 된 내용을 요약한다. 기억이나 일반론이 아니라 실제로 확인한 파일에 근거해야 한다.

## Relevant Files Inspected

계획 전에 읽은 파일이나 디렉토리를 나열한다. 각 항목에는 왜 확인했는지 짧게 적는다.

## Ambiguity Review

모호성 점검표를 보여주고 각 항목을 `Clear`, `Ambiguous`, `Not applicable` 중 하나로 표시한다.

## Open Questions

구현, 제품 동작, data shape, test, deployment, rollback을 바꿀 수 있는 질문을 적는다. 질문이 없다면 왜 없는지 설명한다.

## Assumptions

계획이 의존하는 가정을 나열한다. 각 가정은 false일 경우 계획을 수정해야 할 만큼 구체적이어야 한다.

## Risks

가능한 실패 방식, regression, 운영상 우려를 나열한다. 제품 리스크, 기술 리스크, 테스트 공백을 포함한다.

## Options Considered

다음 중 하나라도 해당하면 최소 두 가지 접근안을 제시한다.

- 제품 동작이 합리적으로 둘 이상의 방향으로 갈 수 있다.
- Data shape, API contract, authorization, migration, rollback이 접근안별로 달라질 수 있다.
- 한 접근안은 빠르지만 위험하고, 다른 접근안은 더 안전하지만 크다.
- 사용자가 명시적으로 alternative를 요청했다.

기계적이거나 risk가 낮은 작업에서는 억지 alternative를 만들지 않는다. 하나의 직접 접근이 적절한 이유를 설명한다.

실제 option마다 다음 내용을 포함한다.

- 무엇인가.
- 왜 동작하는가.
- trade-off는 무엇인가.
- 어떤 경우에 부적절한 선택인가.

## Recommended Approach

하나의 접근안을 선택하고, 이 codebase, 요청, risk profile에 가장 적합한 이유를 설명한다.

## Detailed Implementation Steps

순서가 있는 구체적인 단계를 작성한다. 각 단계는 어떤 동작을 바꾸는지와 가능한 경우 관련 파일이나 module을 포함해야 한다.

큰 작업은 다음 phase로 나눈다.

1. Investigation.
2. Design.
3. Implementation.
4. Verification.
5. Rollback 또는 release follow-up.

작업이 여러 user flow, data contract, migration, deployment surface에 걸쳐 있다면 이 phase를 하나의 단순 목록으로 합치지 않는다.

## Files to Change

변경 예정 파일과 각 파일을 바꾸는 이유를 적는다. 확정된 파일과 구현 중 추가될 수 있는 파일을 구분한다.

## Test Plan

구현 전에 검증 계획을 정의한다. 필요한 경우 unit test, integration test, E2E test, manual QA, lint, build check를 포함한다.

이 repository에서는 다음을 따른다.

- 코드 변경 후 `pnpm lint:check`를 실행한다.
- `.vue`, `.ts`, routing, stores, composables, types, tests, build config를 건드린 경우 `pnpm run build`도 실행한다.
- 동작이 바뀌면 focused test를 추가하거나 수정한다.

## Acceptance Criteria

Definition of Done을 구체적이고 검증 가능한 문장으로 정의한다. Acceptance criteria에는 사용자에게 보이는 동작, data/API 정확성, error state, non-regression 요구사항, verification command가 포함되어야 한다.

나쁜 예:

- "페이지가 잘 동작한다."

좋은 예:

- "Step4 grid cell을 클릭하면 선택한 근무자와 날짜가 요청 drawer에 미리 채워지지만, 사용자가 반영 버튼을 누르기 전까지 Off 요청은 저장되지 않는다."

## Rollback Plan

변경을 되돌리는 방법을 설명한다. 단순 code revert면 그렇게 적는다. Migration, data change, deployment configuration이 포함된다면 안전한 rollback 경로와 data 보존 제약을 명시한다.

## Approval Gate

모든 계획은 명시적인 중단 문구로 끝낸다.

```text
I will wait for your approval before implementation.
```

Plan mode에서는 사용자가 계획을 승인하거나 plan mode를 종료한다고 명시하기 전까지 code edit을 시작하지 않는다.

## Self-Review Pass

계획 초안을 만든 뒤 최종 답변 전에 비판적으로 검토한다.

다음을 찾아 수정한다.

1. 숨은 가정.
2. 누락된 edge case.
3. 기존 동작을 깨뜨릴 수 있는 구현 지점.
4. 놓쳤을 수 있는 파일이나 contract.
5. regression을 잡을 수 있는 test.
6. rollback 공백.
7. 너무 모호해서 검증할 수 없는 acceptance criteria.

그다음 계획을 수정한다. 최종 답변에는 다음 중 하나를 포함한다.

- `Self-review changes` 섹션에 재검토 후 무엇을 바꿨는지 짧게 설명한다.
- 또는 수정이 필요 없었다면 그 이유를 설명한다.

## 명확화 질문 정책

다음 경우에는 명확화 질문을 한다.

- 서로 다른 설계가 가능하고 결과가 크게 달라진다.
- 누락된 요구사항이 사용자 동작을 바꿀 수 있다.
- 누락된 요구사항이 data shape, API contract, auth, migration, rollback을 바꿀 수 있다.
- 요청 범위가 넓거나 production behavior에 영향을 준다.
- Definition of Done이 없고 안전하게 추론할 수 없다.

다음 경우에는 질문하지 않는다.

- 누락된 세부사항이 cosmetic이고 기존 project convention으로 처리할 수 있다.
- 로컬 문서나 source file에서 답을 찾을 수 있다.
- 작업이 기계적인 변경이고 acceptance criteria가 이미 명확하다.

질문이 필요하면 planning을 막는 최소 질문만 한다. 긴 질문 목록보다 구체적인 묶음 질문을 선호한다.

## 작업 크기별 깊이 조절

계획은 변경의 risk보다 무거워서는 안 된다. 실제 모호함과 risk를 드러내는 선에서 가장 작은 프로세스를 사용한다.

### Simple Plan Fast Path

다음 조건을 모두 만족할 때 사용한다.

- 요청이 좁고 구현 경로가 명확하게 하나다.
- Data model, API contract, auth, migration, deployment, cross-screen behavior에 영향이 없다.
- 관련 파일을 빠르게 확인할 수 있다.
- Acceptance criteria를 구체적으로 쉽게 말할 수 있다.
- 긴 계획의 비용이 변경 risk보다 크다.

Fast-path 계획은 아래 짧은 구조를 사용할 수 있다.

1. Goal.
2. Files inspected.
3. Assumptions 또는 open questions, 필요한 경우.
4. Implementation steps.
5. Acceptance criteria.
6. Verification.
7. Approval stop.

잘못된 해석이 product behavior, data, API, test, deployment, rollback을 바꿀 수 있을 만큼 요청이 모호하다면 fast path를 사용하지 않는다.

작은 작업:

- 직접 관련 파일을 확인한다.
- 가벼운 모호성 점검을 하고 실제 모호함만 적는다.
- acceptance criteria가 포함된 간결한 계획을 작성한다.

중간 작업:

- 관련 components, stores, types, tests를 확인한다.
- 두 가지 이상의 접근안을 제시한다.
- test plan과 rollback plan을 명시한다.

큰 작업:

- 바로 implementation plan으로 가지 않는다.
- 먼저 investigation plan을 만든다.
- 조사 후 design plan을 만든다.
- design 승인 후 implementation plan을 만든다.

여러 user flow, persistent data, API contract, migration, authentication, deployment, cross-screen behavior에 걸친 작업은 큰 작업으로 본다.

## Over-Engineering Guardrails

Plan mode는 under-planning뿐 아니라 over-engineering도 막아야 한다.

현재 코드 때문에 단순 변경이 안전하지 않은 경우가 아니라면, 간단한 요청을 넓은 redesign으로 확장하지 않는다. 더 큰 작업이 발견되면 main plan에 조용히 흡수하지 말고 follow-up 또는 risk로 표시한다.

요청이나 확인한 코드가 정당화하지 않는 한 다음을 제안하지 않는다.

- 새로운 abstraction 또는 framework 변경.
- 새로운 dependency.
- Database migration.
- API redesign.
- 넓은 refactor.
- 새로운 product surface.
- 순수 local behavior를 위한 E2E test suite.
- local-only 변경을 위한 rollout 또는 deployment machinery.

Codebase에서 이미 사용하는 local pattern을 우선한다. 기존 pattern이 충분하다면 계획은 그것을 직접 사용해야 한다.

Agent는 적절한 경우 명시적으로 downshift해야 한다.

- "작고 기계적인 변경이므로 하나의 직접 접근이면 충분하다."
- "Migration/API/auth 영향이 없으므로 해당 섹션은 확장하지 않는다."
- "Data shape 변경이 없으므로 rollback은 일반 code revert로 충분하다."

## EveryShift 전용 계획 제약

이 repository에서는 사용자가 명시적으로 override하지 않는 한 plan mode가 다음 제약을 지켜야 한다.

- 기본 scope는 MVP schedule-generation flow 안에 둔다.
- 사용자-facing UI text는 Korean이다.
- Organizations, employees, shifts는 MVP에서 seed data다. 기본적으로 CRUD를 추가하지 않는다.
- AI solver integration은 mocked 상태다. 기본적으로 real solver를 연결하지 않는다.
- Step 3 grid는 critical surface이므로 변경 전에 신중한 inspection이 필요하다.
- Editable row를 user-editable field로 keying하지 않는다.
- Async-loaded editor는 첫 preload가 끝나기 전 input을 render하지 않는다.
- Local form copy는 deep nested prop mutation이 아니라 prop replacement에서 sync해야 한다.

## 출력 원칙

계획은 구현할 수 있을 만큼 구체적이어야 하지만 불필요하게 길면 안 된다. 일반론보다 구체적인 문장을 우선한다. Risk를 줄이지 않는 의례적 섹션, alternative, test, phase를 추가하지 않는다. 모든 섹션은 아래 질문 중 하나에 답해야 한다.

- 무엇을 만들 것인가?
- 무엇이 오해될 수 있는가?
- 무엇을 확인했는가?
- 무엇이 바뀌는가?
- 어떻게 정상 동작을 증명할 것인가?
- 어떻게 되돌릴 것인가?
