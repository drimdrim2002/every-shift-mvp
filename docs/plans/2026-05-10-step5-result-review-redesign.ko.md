# Step5 결과 검토 화면 개편 계획

## 요약

`src/views/schedule/Step5Result.vue`를 개발자 중심의 Solver 결과 화면이 아니라, 간호관리자가 근무표를 검토하기 쉬운 화면으로 개편한다. 기존 `배정표 / 하드 제약 / Off 요청` 탭은 제거하고 `사이트 / 근무자` 보기로 재구성한다. `사이트` 보기는 전체 근무자 캘린더와 수정 기능을 유지하고, `근무자` 보기는 특정 근무자 1명의 배정 결과가 보건복지부 가이드라인을 잘 따르는지 확인하는 읽기 전용 상세 화면으로 만든다.

## 주요 변경 사항

- Step5 결과 화면에서 `Hard Score`, `Soft Score`를 제거한다. 생성 상태와 진행률은 유지하되 내부 점수 용어는 노출하지 않는다.
- Step5 사용자 화면의 `법적 기준` 표현은 `보건복지부 가이드라인`으로 변경한다.
- 상단 상태 영역은 `생성 상태`, `보건복지부 가이드라인 확인 결과`, `Off 요청 반영률`, `확정 가능 여부` 요약 카드로 재구성한다.
- 전월 데이터 표시 일수 조절은 슬라이더에서 숫자 스테퍼로 변경한다.
- 숫자 스테퍼는 캘린더 바로 위, 전월 데이터가 표시되는 왼쪽 영역에 배치한다.
- 기존 검토 탭은 `사이트 / 근무자` 보기 전환으로 대체한다.
- `사이트` 보기에서는 현재처럼 전체 근무자 캘린더를 보여주고, 근무 배정 수정도 여기에서만 허용한다.
- `근무자` 보기에서는 선택한 근무자의 읽기 전용 캘린더, 가이드라인 확인 결과, 위반 상세, Off 요청 상세를 보여준다.
- `근무자` 보기로 처음 들어가면 가이드라인 위반이 있는 근무자를 우선 선택한다. 위반 근무자가 없으면 첫 번째 근무자를 선택한다.
- 선택된 근무자에게 위반이 있으면 위반 상세를 자동으로 펼친다. 위반이 없으면 접힌 상태로 둔다.
- Off 요청 상세 팝업은 근무자 상세에서만 제공한다. 팝업에는 요청 날짜, 요청 메모, 실제 배정, 반영 여부, 미반영 사유를 보여준다.

## 구현 메모

- `Step5Result.vue`에 `resultViewMode: 'site' | 'employee'` 상태를 추가하고, `VersionReviewDetail`, `activeReviewTab`, `handleReviewTabChange` 사용을 제거한다.
- 생성, 저장, 재생성, 비교, 삭제, 엑셀 다운로드, 확정 로직은 변경하지 않는다.
- backend 호환성을 위해 `defaultTab`, `ScheduleReviewTab` 타입은 당장 제거하지 않고, Step5 메인 결과 화면에서만 사용을 중단한다.
- `ScheduleCompliancePanel.vue`는 전체 가이드라인 요약 패널 역할을 하도록 문구와 위반 상세 펼치기/접기 동작을 정리한다.
- `Step5Result.vue`가 더 커지지 않도록 근무자 상세는 `EmployeeResultDetail.vue` 같은 별도 컴포넌트로 분리한다.
- 기존 데이터인 `ScheduleComplianceResult.violations`, `latestEvaluation.offRequestResults`, `offRequestsCurrentMonth`, `offRequestNotesCurrentMonth`, `grid.dates.value`, `grid.assignments.value`, 직원 목록을 사용한다. 새 API 호출은 추가하지 않는다.
- Off 요청 반영 여부는 `latestEvaluation.offRequestResults`가 있으면 그 값을 우선 사용하고, 없으면 현재 배정이 `O`인지로 보조 판단한다.

## 테스트 계획

- `tests/unit/schedule-compliance-panel.spec.ts`의 기대 문구를 `보건복지부 가이드라인` 기준으로 갱신한다.
- `tests/unit/step5-result.spec.ts`에서 실행 중/완료 상태 모두 `Hard Score`, `Soft Score`가 렌더링되지 않는지 검증한다.
- Step5 단위 테스트에 상단 요약 카드, `사이트 / 근무자` 보기 전환, 숫자 스테퍼, 사이트 보기 수정 가능, 근무자 상세 읽기 전용을 추가하거나 갱신한다.
- 근무자 상세 테스트로 기본 근무자 선택, 위반 상세 자동 펼침, Off 요청 상세 팝업 내용을 검증한다.
- `tests/e2e/step5-review-hub.spec.ts`, `tests/e2e/helpers.ts`는 기존 검토 탭 기준 대신 `사이트 / 근무자` 화면 기준으로 갱신한다.
- 실행할 검증 명령:
  - `pnpm test:unit -- tests/unit/schedule-compliance-panel.spec.ts tests/unit/step5-result.spec.ts`
  - e2e 환경이 가능할 때 `pnpm test:e2e -- tests/e2e/step5-review-hub.spec.ts`
  - `pnpm lint:check`
  - `pnpm run build`

## 가정

- 이번 작업 범위는 Step5 결과 검토 UX에 한정한다. Dashboard에 남아 있는 점수 문구는 별도 요청 없이는 수정하지 않는다.
- 현재 데이터 구조에서는 `확인 필요` 사유를 특정 근무자에게 안정적으로 매핑하기 어렵다. 따라서 근무자 기본 선택은 실제 위반 근무자를 우선하고, 없으면 첫 번째 근무자로 처리한다.
- 이번 버전에서 근무자 상세는 검토 전용이다. 근무 배정 수정은 전체표 맥락을 유지하기 위해 사이트 보기에서만 제공한다.
