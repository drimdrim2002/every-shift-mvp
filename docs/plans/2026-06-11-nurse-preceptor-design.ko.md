# 간호사 프리셉터(선배–신규 1:1 짝) — 설계 개요

> **상태:** 설계 확정 (구현 전)  
> **작성일:** 2026-06-11  
> **구현:** 설계 문서만. 코드 변경 없음.

---

## 문서 구조

구현은 아래 **순서**로 진행한다.

| 순서  | 문서                                                       | 내용                                      |
| ----- | ---------------------------------------------------------- | ----------------------------------------- |
| **1** | [DB 설계](./2026-06-11-nurse-preceptor-db.ko.md)           | migration, RLS, roster replace RPC 2-pass |
| **2** | [API / TypeScript](./2026-06-11-nurse-preceptor-api.ko.md) | 타입, 매핑, 솔버·compliance 계약          |
| **3** | [UI 설계](./2026-06-11-nurse-preceptor-ui.ko.md)           | Step3 테이블·모달·엑셀·compliance 표시    |

---

## 요약

EveryShift MVP에 **프리셉터–프리셉티 1:1 짝** 기능을 추가한다. 지정된 직원은 **같은 날 같은 시프트**로 배정되어야 하며 (**하드 제약**), 적용은 **선택적**이다. 조직 단위로 `employees` 테이블에 영구 저장한다.

솔버가 제약을 만족하지 못해도 **생성은 완료**한다. Step4/Step5 **compliance**에서 `프리셉터 불일치` 위반을 표시하고, NOD 등과 동일하게 **mandatory**로 확정을 차단한다.

### 확정 요구사항

| 항목      | 결정                                                  |
| --------- | ----------------------------------------------------- |
| 제약 유형 | 하드 — 프리셉티·프리셉터 **같은 날 같은 시프트**      |
| 적용 범위 | 선택적 — `preceptor` 지정된 직원만                    |
| 관계      | 1:1                                                   |
| 저장      | 조직 단위 — `employees` 영구 저장                     |
| 후보 조건 | 같은 로스터, 본인 제외, **가능 시프트 1개 이상 겹침** |
| 완료 기준 | Step3 UI·DB + `solverInput` 스냅샷 + 목 솔버 반영     |
| 미충족 시 | 생성 완료, compliance **「프리셉터 불일치」**         |

### 식별자

| 계층      | 필드                           | 형식 |
| --------- | ------------------------------ | ---- |
| UI / 엑셀 | `preceptorEmployeeId`          | 직번 |
| DB / 솔버 | `preceptor_id` / `preceptorId` | UUID |

---

## 전체 구현 슬라이스 (참고)

| Slice | 문서 | 내용                                     |
| ----- | ---- | ---------------------------------------- |
| S1    | DB   | migration + RPC 2-pass                   |
| S2    | API  | 타입 + Ops contracts                     |
| S3–S5 | UI   | Step3, Table, Excel                      |
| S6–S8 | API  | solver snapshot, mock solver, compliance |

**의존성:** S1 → S2 → S3/S4/S5 (병렬) → S6 → S7/S8.

---

## MVP Scope

**포함:** Step3 UI·DB, 엑셀, solverInput 스냅샷, 목 솔버, Step4/5 compliance.

**제외:** 자동 매칭, 1:N/N:M, 기간 한정 pairing, 프리셉터 대시보드, 모바일, 실 solver hard constraint.

---

## 참고

- `AGENTS.md`, `DESIGN.md`
- 원격 DB (`employees`): `preceptor_id` **미존재** (2026-06-11 확인) — [DB 문서](./2026-06-11-nurse-preceptor-db.ko.md) §2
