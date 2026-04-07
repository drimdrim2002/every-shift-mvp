# Phase2A PRD ↔ 실행 컷라인 갭 리포트 (KR)

- 작성일: 2026-04-03
- 작성자: Codex
- 대상 문서: `docs/prd/PHASE2_PRD.md`, `docs/prd/PHASE2_PRD_KR.md`, `docs/prd/PHASE2_ENGINEERING_SPEC.md`, `docs/plans/PHASE2A_EXECUTION_SLICES.md`

## 1. 결론

`PHASE2A_EXECUTION_SLICES.md`는 의도적으로 **Phase2A-1 Trust Layer 전용**으로 잠겨 있다.

- 정합한 축:
  - `PHASE2_PRD_KR.md` (Phase2A 내부를 Trust Layer / Go-Live Ops Layer로 분리)
  - `PHASE2_ENGINEERING_SPEC.md` (active target = Trust Layer, ops/fairness deferred)
- 불일치가 발생하는 축:
  - `PHASE2_PRD.md` (EN)는 Phase2A를 단일 범위처럼 읽히는 구간이 있어 Trust/Ops 컷라인이 명시적으로 보이지 않는다.

## 2. 범위 정합성 매트릭스

| 항목                                     | PRD/Spec 기대사항                                                     | 실행 슬라이스 반영 상태                          | 판정                         |
| ---------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------- |
| 하드 제약 충족 증명                      | Phase2A Trust Layer 필수                                              | Slice 6/7/8의 trust gate 및 Step5 상태 UX에 반영 | 정합                         |
| 생성 불가능(infeasible) 사유 설명        | Phase2A Trust Layer 필수                                              | evaluator/result-state 분류 경로로 반영          | 정합                         |
| 미반영 off 요청 사유 설명                | Phase2A Trust Layer 필수                                              | evaluator/review payload 경로로 반영             | 정합                         |
| version compare + select + finalize gate | Phase2A Trust Layer 필수                                              | Slice 3~8 핵심 범위                              | 정합                         |
| 관리자 bootstrap/초기 운영 진입          | Phase2A Go-Live Ops Layer 필수                                        | 슬라이스에 없음 (trust-only 계획에서 이연)       | 현재 실행문서 기준 이연/누락 |
| off 요청 정책 관리(월/연간, rank code)   | Phase2A Go-Live Ops Layer 필수                                        | 슬라이스에 없음 (이연)                           | 현재 실행문서 기준 이연/누락 |
| rolling fairness ledger                  | Phase2A Go-Live Ops Layer 필수                                        | `Do Not Do` 및 deferred 참조로 명시 제외         | 현재 실행문서 기준 이연/누락 |
| 수기 기준안 before/after 리포트          | `PHASE2_PRD.md`는 요구, `PHASE2_PRD_KR.md`는 핵심 compare와 분리 가능 | 전용 슬라이스로 명시되지 않음                    | 컷라인 명시 보강 필요        |

## 3. 확인된 컷라인 충돌

### 3.1 PRD(EN)와 PRD/Spec(KR+ENG) 구조 차이

- `PHASE2_PRD.md`는 Phase2A를 Trust/Ops로 명시 분리하지 않는다.
- `PHASE2_PRD_KR.md`는 명시 분리한다.
  - `Phase2A-1 Trust Layer`
  - `Phase2A-2 Go-Live Ops Layer`
- 실행 슬라이스는 EN PRD 단일 블록 모델이 아니라 분리 모델을 따른다.

영향:

- `PHASE2_PRD.md`만 보고 진행하면, deferred 항목을 "구현 누락"으로 오해할 수 있다.

### 3.2 이연 항목은 제품 범위에서 제거된 것이 아니나, 실행 슬라이스에는 소유자가 없음

실행 슬라이스는 fairness 및 ops-layer 트랙을 명시적으로 제외한다.

영향:

- Go-Live Ops Layer 후속 계획 문서가 없으면, 저장소 레벨에서 "Phase2A 완료 기준"이 모호해진다.

## 4. 이연/누락 구현 항목 레지스터 (별도 추적 대상)

아래 항목들은 현재 `PHASE2A_EXECUTION_SLICES.md` 범위에 포함되지 않으며, 별도 실행계획 문서가 필요하다.

### GAP-01 관리자 bootstrap 및 setup checklist

- 요구사항 출처:
  - `PHASE2_PRD_KR.md` 4.4-A (관리자 bootstrap / 초기 운영 설정)
  - `PHASE2_PRD_KR.md` 4.6 Go-Live Ops 산출물
- 현재 상태:
  - 이연, 실행 슬라이스 소유자 없음
- 후속 권고 산출물:
  - `PHASE2A_OPS_EXECUTION_SLICES.md`의 Slice O1

### GAP-02 rank code 기반 off 요청 정책 관리 (월/연간)

- 요구사항 출처:
  - `PHASE2_PRD_KR.md` 4.4-B
  - `PHASE2_ENGINEERING_SPEC.md` deferred 목록 (`organization_rank_codes`, `off_request_policy_rules`)
- 현재 상태:
  - 이연, 실행 슬라이스 소유자 없음
- 후속 권고 산출물:
  - `PHASE2A_OPS_EXECUTION_SLICES.md`의 Slice O2

### GAP-03 rolling fairness ledger (finalize 트리거 적재 + 누적 모델)

- 요구사항 출처:
  - `PHASE2_PRD.md` 4.2-G, 4.4 산출물, Priority 1
  - `PHASE2_PRD_KR.md` 4.4-C, 4.6 Go-Live Ops 산출물
  - `PHASE2_ENGINEERING_SPEC.md` deferred 목록 (`fairness_ledger_monthly`, finalize-triggered write, optional solver fairness context)
- 현재 상태:
  - 현재 실행 슬라이스에서 명시 제외
- 후속 권고 산출물:
  - `PHASE2A_OPS_EXECUTION_SLICES.md`의 Slice O3

### GAP-04 파일럿 운영 진입 가이드

- 요구사항 출처:
  - `PHASE2_PRD_KR.md` 4.4-D
- 현재 상태:
  - 이연, 실행 슬라이스 소유자 없음
- 후속 권고 산출물:
  - `PHASE2A_OPS_EXECUTION_SLICES.md`의 Slice O4

### GAP-05 수기 기준안 before/after 리포트 해석 차이

- 요구사항 충돌 출처:
  - `PHASE2_PRD.md` 4.2-F (수기 기준안 비교를 요구)
  - `PHASE2_PRD_KR.md` 4.3-D 비고 (수기 기준안 비교를 core compare와 분리 가능)
- 현재 상태:
  - 현재 실행 슬라이스에 명시 반영 없음
- 후속 권고 조치:
  - PRD/plan 문서에 컷라인 해석 메모를 추가해 재충돌을 방지

## 5. 문서 보정 권고

1. `PHASE2_PRD.md`에 KR과 동일한 "Phase2A 컷라인(Trust Layer vs Go-Live Ops Layer)" 문구를 짧게 추가한다.
2. `PHASE2A_EXECUTION_SLICES.md`에서 향후 ops-slice 문서(placeholder)로 cross-link를 추가한다.
3. `docs/plans/PHASE2A_OPS_EXECUTION_SLICES.md`를 생성하고 GAP-01~05를 소유 슬라이스로 배치한다.

## 6. 근거 라인 앵커

- 실행 문서의 trust-layer-only 잠금:
  - `docs/plans/PHASE2A_EXECUTION_SLICES.md:5`
- 실행 슬라이스에서 fairness 명시 제외:
  - `docs/plans/PHASE2A_EXECUTION_SLICES.md:129`
  - `docs/plans/PHASE2A_EXECUTION_SLICES.md:409`
  - `docs/plans/PHASE2A_EXECUTION_SLICES.md:518`
- 엔지니어링 스펙 deferred 명시:
  - `docs/prd/PHASE2_ENGINEERING_SPEC.md:7`
  - `docs/prd/PHASE2_ENGINEERING_SPEC.md:31`
  - `docs/prd/PHASE2_ENGINEERING_SPEC.md:797`
- KR PRD의 분리 모델 및 ops-layer 요구사항:
  - `docs/prd/PHASE2_PRD_KR.md:131`
  - `docs/prd/PHASE2_PRD_KR.md:246`
  - `docs/prd/PHASE2_PRD_KR.md:327`
- EN PRD의 넓은 Phase2A 요구(rolling fairness 및 수기 기준안 맥락 포함):
  - `docs/prd/PHASE2_PRD.md:129`
  - `docs/prd/PHASE2_PRD.md:218`
  - `docs/prd/PHASE2_PRD.md:242`
