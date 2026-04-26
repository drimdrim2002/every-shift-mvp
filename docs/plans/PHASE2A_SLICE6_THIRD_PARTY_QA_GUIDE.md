# Phase2A Slice6 제3자 QA 실행 가이드

작성일: 2026-04-02  
대상: 개발자가 아닌 QA/운영/기획 검증자

## 1) 이 문서로 무엇을 확인하나요?

이 문서는 **Slice6(Trust Gate)** 만 확인합니다.

확인 항목은 딱 4개입니다.

1. 수정 후 저장하면 상태가 `수정됨`으로 바뀌는지
2. `recheck` 실행 후 상태가 완료 계열로 돌아오는지
3. `finalize` 실행 후 화면이 읽기 전용으로 잠기는지
4. 수정 후 `recheck` 없이 `finalize` 하면 `409`로 차단되는지

주의:

- 현재 UI에 `recheck/finalize` 버튼이 아직 없습니다.
- 그래서 브라우저 개발자도구(Network + Console)에서 요청 2개만 수동 호출합니다.

## 2) 시작 전 준비 (3분)

1. 테스트 계정으로 로그인
2. 테스트 월 1개 선택 (권장: 기존 테스트와 겹치지 않는 월)
3. Step5 결과 화면까지 이동
4. 브라우저 개발자도구 열기
   - Network 탭
   - Preserve log 체크

체크:

- URL 형태가 아래와 비슷해야 합니다.  
  `/schedule/step5/<scheduleId>?version=<previewVersionId>`
- `version` 값(= `previewVersionId`)을 메모해 둡니다.

## 3) 가장 쉬운 API 호출 방법 (복붙 1회)

`recheck/finalize` 호출은 아래 방식이 제일 쉽습니다.

1. Network 탭에서 `compare` 요청 1개 선택
2. 우클릭 -> `Copy` -> `Copy as fetch`
3. Console 탭에 붙여넣기
4. URL 끝부분과 method만 바꿔 실행

### Recheck 호출 규칙

- URL 끝: `/schedule-versions/<previewVersionId>/recheck`
- method: `POST`
- body: 없음

### Finalize 호출 규칙

- URL 끝: `/schedule-versions/<previewVersionId>/finalize`
- method: `POST`
- body: 없음

판정 팁:

- 응답이 `200`이면 성공
- 응답이 `409`면 차단 성공(의도된 보호 동작)

## 4) 실행 카드 (그대로 따라하기)

### 카드 A. 수정 후 저장 상태 확인

실행:

1. Step5에서 셀 1개 수정
2. `저장` 클릭
3. 페이지 새로고침

기대 결과:

- 상태가 `수정됨`으로 보인다.
- 방금 수정한 셀이 유지된다.

### 카드 B. Recheck 확인

실행:

1. 위 3장 방법으로 `recheck` 요청 1회 실행
2. Step5 새로고침

기대 결과:

- 상태가 완료 계열로 돌아온다.
- 화면 오류 없이 정상 표시된다.

### 카드 C. Finalize 확인

실행:

1. 위 3장 방법으로 `finalize` 요청 1회 실행
2. Step5 새로고침

기대 결과:

- 읽기 전용 안내가 보인다.
- 셀 수정/저장/재생성 같은 편집 동작이 막힌다.

### 카드 D. 잘못된 Finalize 차단 확인(핵심)

실행:

1. finalize 되지 않은 다른 테스트 월(또는 다시 만든 버전) 준비
2. 셀 1개 수정 후 저장
3. `recheck`는 실행하지 않음
4. 바로 `finalize` 요청 실행

기대 결과:

- 응답이 `409`
- 화면이 finalized 상태로 잠기지 않는다.

## 5) 최종 합격 기준

아래 4개 모두 만족하면 Slice6 UI 검증 합격입니다.

- 카드 A 통과
- 카드 B 통과
- 카드 C 통과
- 카드 D에서 `409` 차단 확인

## 6) 실패 시 보고 템플릿 (복붙)

```text
[Slice6 QA Report]
- 날짜:
- 테스트 환경(URL/브랜치):
- 테스트 계정:
- 테스트 월:

- 카드 A: Pass | Fail
  - 메모:
- 카드 B: Pass | Fail
  - 메모:
- 카드 C: Pass | Fail
  - 메모:
- 카드 D: Pass | Fail
  - 메모:

- 실패한 요청:
  - endpoint:
  - status:
  - response message:

- 첨부:
  - 실패 화면 스크린샷 1장
  - Network 실패 요청 캡처 1장
```

## 7) 이번 가이드 범위 밖(정상)

아래는 이번 문서에서 보지 않습니다.

- compare/review 허브 UI 완성도
- `recheck/finalize` 버튼 UI 자체
- Step3 finalized 보호 UX
