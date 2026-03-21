# Pending `phase=null` Task Reclassification

Date: 2026-03-20
Source: `.shrimp-data/tasks.json`
Scope: `phase == null && status == "pending"`

## Summary

- Total pending `phase=null` tasks: 15
- Recommended move to `P10`: 4
- Recommended move to `P4`: 3
- Recommended keep as legacy `P2`: 8
- Recommended move to `P3`, `P5`, `P6`, `P7`, `P8`, `P9`: 0

This analysis uses current canonical phase definitions in `.shrimp-data/tasks.json`.
The recommendation rule is:

1. Move only when the task goal directly matches an existing `P3~P10` phase objective.
2. Keep as legacy `P1/P2` when the task is still a prerequisite or completion item for signup, approval, RLS foundation, or auth boundary work.
3. Prefer domain meaning over task name prefix.

## Decision Table

| Task | Recommended phase | Confidence | Decision | Reason |
| --- | --- | --- | --- | --- |
| `P1-2.3-2 위협 기반 RLS 검증 시나리오 설계` | `P10` | High | Move | 내용이 `RLS/권한/테넌트 침범` 위협 시나리오 설계이며, 현재 `P10-1.3 침투/오용 시나리오 테스트 계획`과 직접 겹친다. |
| `P1-2.3-3 SQL 검증 절차 및 합격 기준 정의` | `P10` | Medium | Move | 보안 검증 시나리오의 실행 절차와 pass criteria를 정하는 작업으로, release/security gate 성격이 강하다. |
| `P1-2.3-4 문서 통합 및 리뷰 체크리스트 완성` | `P10` | Medium | Move | 보안 검증 가이드를 리뷰 가능한 checklist로 마감하는 작업이며, `P10-1.1/1.3`의 감사 체크리스트 계열과 맞는다. |
| `P1-3.4-B 운영 Runbook 문서화` | `P10` | High | Move | `SUPERUSER_BOOTSTRAP_RUNBOOK`은 구현 태스크가 아니라 운영 절차 문서화이므로 `P10-3.2 운영 런북 작성`에 흡수하는 것이 가장 자연스럽다. |
| `P2-1.8-2 RLS: invite_codes admin 발급/폐기 정책 정의` | `P4` | Medium | Move | 초대코드 발급/폐기는 admin account operation에 가깝고, 계정 관리/RBAC 범위인 `P4`에서 운영하는 편이 일관적이다. |
| `P2-1.8-3 API 계약 문서화: invite 상태 판별/에러 매핑 보강` | `P4` | Medium | Move | invite code lifecycle은 가입 진입점이지만 실운영에서는 account provisioning 계약에 더 가깝다. `invite-code-manage` 골격 태스크와도 연결된다. |
| `P2-1.8-4 검증 시나리오 정합화: used_count 기반 회귀 포인트 추가` | `P4` | Medium | Move | 초대코드 발급/소진/폐기 회귀 검증은 계정 운영 기능 검증으로 흡수하는 것이 적절하다. |
| `P2-1.9-1 Canonical Contract Sync (API_SPEC + shared DTO)` | Legacy `P2` | High | Keep | `signup-submit v2` canonical contract 동기화는 여전히 signup feature completion 그 자체다. `P4` 이후 운영 화면과는 직접 연결되지 않는다. |
| `P2-1.9-2 signup-submit Edge Function v2 응답/검증 반영` | Legacy `P2` | High | Keep | Edge Function 구현 보강은 가입 API 완결 작업이며, 남은 phase 중 직접 대응 phase가 없다. |
| `P2-1.9-3 hospital-search 프록시 경계 구현 및 클라이언트 전환` | Legacy `P2` | High | Keep | 병원 검색은 `/signup` admin branch의 입력 보조 기능이다. 온보딩/계정운영/알림/대시보드로 옮기면 도메인이 흐려진다. |
| `P2-1.9-4 Front API 연동 정합성 및 검증 매트릭스` | Legacy `P2` | High | Keep | signup v2 계약에 맞춘 프론트 정합성 작업으로, `P2-1.9-1/2/3`와 강하게 묶여 있다. |
| `P2-1.6.3 프론트 API 래퍼 전환: direct fetch 제거` | Legacy `P2` | Medium | Keep | 보안 경계 성격은 있으나 실제 변경 대상이 signup hospital-search integration이다. feature completion 기준으로는 `P2` 잔여 작업으로 보는 것이 정확하다. |
| `P2-1.6.4 검증 및 품질 게이트(보안 경계 포함)` | Legacy `P2` | Medium | Keep | security wording이 있지만 hospital-search 경계 구현 완료를 닫는 verification task다. `P10` 일반 보안 감사보다 feature-specific gate에 가깝다. |
| `Optional hardening: enforce single signup invocation assertion` | Legacy `P2` | High | Keep | signup 호출 경계 regression unit test 보강이다. 후속 운영 phase보다 signup contract hardening에 속한다. |
| `Optional hardening: remove success message duplication between store and view` | Legacy `P2` | High | Keep | signup view/store 메시지 중복 제거는 로컬 UI hardening이다. `P3~P10` 어느 phase objective에도 직접 부합하지 않는다. |

## Phase Fit Notes

### Why no `P3`

`P3` is post-login admin onboarding: wizard, progress state, guard, and deep-link UX.
None of the pending `phase=null` tasks target onboarding progress or onboarding routing.

### Why no `P5`~`P9`

- `P5`: organization/master data
- `P6`: employee management/upload
- `P7`: schedule workflow and solver integration
- `P8`: notifications
- `P9`: dashboard/report/export

No pending `phase=null` task touches these domains directly.

## Recommended Follow-up

### Candidate re-parenting set

If backlog cleanup is the goal, the safest move set is:

- Move to `P10`
  - `P1-2.3-2`
  - `P1-2.3-3`
  - `P1-2.3-4`
  - `P1-3.4-B`
- Move to `P4`
  - `P2-1.8-2`
  - `P2-1.8-3`
  - `P2-1.8-4`

### Keep out of `P3~P10`

These should remain explicit legacy backlog until closed or intentionally retired:

- `P2-1.9-1`
- `P2-1.9-2`
- `P2-1.9-3`
- `P2-1.9-4`
- `P2-1.6.3`
- `P2-1.6.4`
- `Optional hardening: enforce single signup invocation assertion`
- `Optional hardening: remove success message duplication between store and view`

## Implementation Note

This document was written from the pre-update snapshot where the move candidates were still `phase=null`.
The recommended `phase` updates have now been applied to `.shrimp-data/tasks.json`:

1. 4 tasks moved to `P10`
2. 3 tasks moved to `P4`
3. 8 legacy `P2` items intentionally left unchanged

Naming is not normalized yet. If strict identifier consistency matters, the remaining follow-up is:

1. Rename the moved tasks to canonical `P4-*` or `P10-*` identifiers
2. Optionally tag the remaining legacy `P2` items as deferred
