# Phase2A Slice8 제3자 QA 실행 가이드

작성일: 2026-04-02  
대상: 개발자가 아닌 QA/기획/운영 검증자

## 1) 이 문서로 무엇을 확인하나요?

이 문서는 `Slice8: Step5 state panels, final guards, and Trust Layer tests`를 수동 UI 기준으로 확인합니다.

Slice8에서는 Slice7의 review hub shell 위에 아래 동작이 추가로 닫혀 있어야 합니다.

1. 상태별 기본 패널이 올바르게 열리는지
2. 강하게 강조되는 primary CTA가 한 번에 하나만 보이는지
3. `review_pending -> recheck -> review_ready -> finalize` 흐름이 버튼으로 이어지는지
4. `finalized` 상태가 읽기 전용으로 잠기는지
5. `review_blocked / infeasible / solve_failed`가 서로 다른 패널로 보이는지
6. Step3에서 finalized month의 직원 재저장이 차단되는지

## 2) 시작 전 준비

### 2.1 필요한 fixture 월

아래 fixture는 개발자 또는 QA 리드가 미리 준비해야 합니다.

| 별칭            | 준비 상태                                       | 주 용도                                         | 재사용 여부     |
| --------------- | ----------------------------------------------- | ----------------------------------------------- | --------------- |
| `S7-BASE`       | Slice7 shell 확인용 다중 버전 월                | compare surface, preview/selected, query 정규화 | 재사용 가능     |
| `S8-READY`      | `selected == preview == review_ready` 상태의 월 | grid-first, 수동 수정, recheck, finalize        | 파괴적 테스트용 |
| `S8-FINALIZED`  | `finalized` 상태의 월                           | 읽기 전용, finalized 마커, Step3 보호           | 재사용 가능     |
| `S8-BLOCKED`    | `review_blocked` 상태의 월                      | proof-first 패널 확인                           | 재사용 가능     |
| `S8-INFEASIBLE` | `infeasible` 상태의 월                          | infeasible 패널 확인                            | 재사용 가능     |
| `S8-FAILED`     | `solve_failed` 상태의 월                        | failure 패널, trace id, retry CTA               | 재사용 가능     |

중요:

- `S8-READY`는 수동 수정과 finalize 때문에 상태가 바뀝니다.
- 반복 실행이 필요하면 개발자가 같은 조건의 월을 새로 준비해야 합니다.

### 2.2 테스터 준비

1. 테스트 계정으로 로그인합니다.
2. 브라우저에서 주소창 수정과 새로고침이 가능해야 합니다.
3. 가능하면 같은 테스트 세션에서 `S7-BASE -> S8-READY -> S8-FINALIZED -> S8-BLOCKED -> S8-INFEASIBLE -> S8-FAILED` 순서로 진행합니다.

## 3) 공통 진입 방법

각 fixture 월은 아래처럼 엽니다.

1. 대시보드(`/`)로 이동합니다.
2. 해당 fixture 월 카드를 찾습니다.
3. 카드 본문을 클릭해 Step5로 들어갑니다.
4. Step5 상단에 `버전 비교`가 있는지 먼저 확인합니다.
5. URL의 `?version=` 값도 같이 메모해 둡니다.

## 4) Slice7 빠른 재확인

Slice8은 Slice7을 포함합니다. 다만 여기서는 빠르게 다시 확인합니다.

### 카드 A. Compare Surface와 버전 분리 확인

대상 fixture: `S7-BASE`

실행:

1. `S7-BASE`를 엽니다.
2. `버전 비교`, `미리보기 버전`, `선택된 버전`이 동시에 보이는지 확인합니다.
3. `선택됨`이 아닌 다른 카드를 클릭합니다.
4. `미리보기`만 이동하는지 확인합니다.
5. `이 버전을 선택` 버튼을 눌러 `선택됨`이 실제로 옮겨가는지 확인합니다.

기대 결과:

- compare surface는 계속 보입니다.
- 카드 클릭만으로는 preview만 바뀝니다.
- 버튼을 눌렀을 때만 selected가 바뀝니다.

## 5) Slice8 추가 실행 카드

### 카드 B. `review_ready`는 grid-first로 열리는지 확인

대상 fixture: `S8-READY`

실행:

1. `S8-READY`를 엽니다.
2. 현재 한 버전에 `미리보기`와 `선택됨`이 동시에 붙어 있는지 확인합니다.
3. detail area에서 grid가 바로 보이는지 확인합니다.
4. 상단 action area의 기본 버튼 라벨을 확인합니다.

기대 결과:

- 첫 화면에서 배정표(grid)가 바로 보입니다.
- `하드 제약 위반 요약`, `생성 불가`, `생성 실패` 패널이 먼저 열리지 않습니다.
- 선택된 버전의 gate가 열려 있으면 기본 버튼은 `이 버전 확정`으로 보입니다.

실패로 기록할 예:

- `review_ready`인데 proof 패널이나 failure 패널이 먼저 열림
- primary CTA가 여러 개 동시에 강하게 강조되어 보임

### 카드 C. 수동 수정 후 `review_pending`으로 전환되는지 확인

대상 fixture: `S8-READY`

실행:

1. `S8-READY` 화면에서 grid의 수정 가능한 셀 1개를 바꿉니다.
2. 우측 하단의 `저장` 버튼을 클릭합니다.
3. 저장이 끝나면 detail area와 action area를 확인합니다.

기대 결과:

- 상단 또는 detail area에 `재검토 필요` 안내가 보입니다.
- primary CTA가 `다시 검토`로 바뀝니다.
- 바로 `이 버전 확정`으로 확정할 수 있는 상태가 아닙니다.

실패로 기록할 예:

- 수정 후에도 바로 finalize 상태처럼 보임
- `재검토 필요` 안내가 전혀 없음

### 카드 D. `다시 검토` 클릭 후 `review_ready`로 복귀하는지 확인

대상 fixture: 카드 C를 방금 수행한 같은 `S8-READY`

실행:

1. action area의 `다시 검토` 버튼을 클릭합니다.
2. 처리 완료까지 기다립니다.
3. grid와 action area를 다시 확인합니다.

기대 결과:

- `재검토 필요` 안내가 사라지거나 약해집니다.
- 기본 패널이 다시 grid 중심으로 돌아옵니다.
- primary CTA가 다시 `이 버전 확정` 또는 현재 상태에 맞는 단일 버튼으로 바뀝니다.

실패로 기록할 예:

- `다시 검토`를 눌러도 상태가 그대로 멈춤
- 검토 완료 후에도 계속 pending 안내가 남음

### 카드 E. `이 버전 확정` 후 finalized 읽기 전용으로 잠기는지 확인

대상 fixture: 카드 D를 통과한 같은 `S8-READY`

실행:

1. action area의 `이 버전 확정` 버튼을 클릭합니다.
2. 처리 완료 후 페이지를 새로고침합니다.
3. version 카드와 grid 편집 가능 여부를 확인합니다.

기대 결과:

- 현재 버전에 `확정됨` 표시가 보입니다.
- 읽기 전용 안내가 보입니다.
- 셀 수정, 저장, 더 개선하기 같은 편집 동작이 막힙니다.

실패로 기록할 예:

- 확정 후에도 셀 편집이 계속 가능함
- 확정 마커가 붙지 않음

### 카드 F. 이미 finalized된 월이 grid-first + read-only로 열리는지 확인

대상 fixture: `S8-FINALIZED`

실행:

1. `S8-FINALIZED`를 엽니다.
2. 첫 화면에서 grid가 보이는지 확인합니다.
3. 버전 카드에 `확정됨` 칩이 있는지 확인합니다.
4. 임의 셀을 수정하려고 시도합니다.

기대 결과:

- 첫 화면은 grid 중심입니다.
- `확정됨` 마커가 보입니다.
- grid는 읽기 전용입니다.
- 저장/재생성 같은 편집 동작이 막힙니다.

### 카드 G. `review_blocked`는 proof-first로 열리는지 확인

대상 fixture: `S8-BLOCKED`

실행:

1. `S8-BLOCKED`를 엽니다.
2. detail area의 첫 패널 제목을 확인합니다.
3. `하드 제약` 탭이 기본 탭인지 확인합니다.
4. action area의 기본 버튼 라벨을 확인합니다.

기대 결과:

- `하드 제약 위반 요약` 패널이 먼저 보입니다.
- 위반 건수 또는 blocking reason이 보입니다.
- 필요하면 기본 버튼은 `다시 검토`입니다.
- compare surface는 계속 상단에 남아 있습니다.

실패로 기록할 예:

- blocked 상태인데 grid만 먼저 열리고 proof 요약이 없음
- compare surface가 숨겨짐

### 카드 H. `infeasible`은 infeasibility 패널이 먼저 열리는지 확인

대상 fixture: `S8-INFEASIBLE`

실행:

1. `S8-INFEASIBLE`를 엽니다.
2. detail area의 첫 패널 제목과 요약 문구를 확인합니다.
3. compare surface가 동시에 남아 있는지 확인합니다.

기대 결과:

- `생성 불가` 패널이 먼저 보입니다.
- 왜 생성이 불가능한지 요약 문구가 보입니다.
- compare surface는 숨겨지지 않습니다.

실패로 기록할 예:

- infeasible인데 generic error만 보이고 설명이 없음
- compare surface가 사라짐

### 카드 I. `solve_failed`는 failure 패널과 trace id가 먼저 보이는지 확인

대상 fixture: `S8-FAILED`

실행:

1. `S8-FAILED`를 엽니다.
2. `생성 실패` 패널이 먼저 보이는지 확인합니다.
3. 실패 요약 문구와 `Trace ID`가 보이는지 확인합니다.
4. primary CTA 라벨이 `다시 생성`인지 확인합니다.

기대 결과:

- `생성 실패` 패널이 먼저 보입니다.
- 한 줄 실패 이유가 보입니다.
- `Trace ID`가 보입니다.
- primary CTA는 `다시 생성` 하나만 강하게 보입니다.

실패로 기록할 예:

- solve_failed인데 실패 이유나 trace id가 없음
- `다시 생성` 대신 다른 CTA가 primary로 보임

### 카드 J. Step3에서 finalized month 직원 저장이 차단되는지 확인

대상 fixture: `S8-FINALIZED`

실행:

1. 대시보드로 돌아갑니다.
2. `S8-FINALIZED` 월 카드의 `수정` 버튼을 클릭합니다.
3. Step1에서 `다음 단계 →`를 클릭합니다.
4. Step2에서도 `다음 단계 →`를 클릭합니다.
5. Step3에 들어가면 바로 `저장` 버튼을 클릭합니다.

기대 결과:

- Step3 저장이 성공하지 않습니다.
- 아래 문구가 보입니다.  
  `현재 월에 확정된 근무표가 있어 직원 정보를 다시 저장할 수 없습니다.`
- 확인용 warning dialog가 뜨지 않습니다.
- 직원 삭제/재생성 흐름으로 넘어가지 않습니다.

실패로 기록할 예:

- finalized month인데 직원 저장이 진행됨
- `현재 월의 근무표와 버전이 모두 삭제됩니다` 같은 파괴적 확인창이 뜸

## 6) 빠른 합격 기준

아래 항목이 모두 맞으면 Slice8 UI 검증 합격입니다.

- 카드 A 통과
- 카드 B 통과
- 카드 C 통과
- 카드 D 통과
- 카드 E 통과
- 카드 F 통과
- 카드 G 통과
- 카드 H 통과
- 카드 I 통과
- 카드 J 통과

## 7) 실패 보고 템플릿

```text
[Slice8 QA Report]
- 날짜:
- 테스트 환경(URL/브랜치):
- 테스트 계정:

- 카드 A (S7-BASE): Pass | Fail
  - 메모:
- 카드 B (S8-READY): Pass | Fail
  - 메모:
- 카드 C (S8-READY): Pass | Fail
  - 메모:
- 카드 D (S8-READY): Pass | Fail
  - 메모:
- 카드 E (S8-READY): Pass | Fail
  - 메모:
- 카드 F (S8-FINALIZED): Pass | Fail
  - 메모:
- 카드 G (S8-BLOCKED): Pass | Fail
  - 메모:
- 카드 H (S8-INFEASIBLE): Pass | Fail
  - 메모:
- 카드 I (S8-FAILED): Pass | Fail
  - 메모:
- 카드 J (S8-FINALIZED): Pass | Fail
  - 메모:

- 첨부:
  - 실패 화면 스크린샷
  - 주소창 캡처
  - 필요한 경우 Step3 에러 메시지 캡처
```

## 8) 이번 문서 범위 밖(정상)

아래 항목은 이번 가이드의 Pass/Fail 기준이 아닙니다.

- fairness ledger
- dashboard/운영 로그 확장
- Phase2B 범위
- 병원별 커스텀 운영 정책 검증
