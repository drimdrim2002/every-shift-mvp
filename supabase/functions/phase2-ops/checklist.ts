import type {
  ChecklistItem,
  ChecklistItemKey,
  ChecklistResponse,
  FairnessLedgerWindowSummary,
} from './contracts.ts';

export interface ChecklistSnapshot {
  organizationId: string;
  checklistCursor: string | null;
  organizationProfileConfirmedAt: string | null;
  organizationName: string | null;
  organizationType: string | null;
  scheduleActiveSiteCount: number;
  pilotSiteId: string | null;
  minimumRestHours: number | null;
  shiftCount: number;
  siteRequirementCount: number;
  employeeCount: number;
  hasMonthlyDefaultOffRequestPolicy: boolean;
  hasAnnualDefaultOffRequestPolicy: boolean;
  scheduleReviewRoute: string | null;
  fairnessSummary: FairnessLedgerWindowSummary[];
}

function buildChecklistItem(
  key: ChecklistItemKey,
  title: string,
  route: string | null,
  ready: boolean,
  blockedReason: string,
  isOptional = false
): ChecklistItem {
  return {
    key,
    title,
    status: ready ? 'ready' : 'blocked',
    route,
    blockedReason: ready ? null : blockedReason,
    isOptional,
  };
}

export function buildChecklistResponse(snapshot: ChecklistSnapshot): ChecklistResponse {
  const organizationProfileReady = Boolean(
    snapshot.organizationProfileConfirmedAt
      && snapshot.organizationName?.trim()
      && snapshot.organizationType?.trim()
  );
  const scheduleFoundationReady =
    snapshot.scheduleActiveSiteCount === 1
    && Boolean(snapshot.pilotSiteId)
    && typeof snapshot.minimumRestHours === 'number'
    && snapshot.minimumRestHours > 0
    && snapshot.shiftCount > 0
    && snapshot.siteRequirementCount > 0;
  const employeeRosterReady = snapshot.employeeCount > 0;
  const offRequestPolicyReady =
    snapshot.hasMonthlyDefaultOffRequestPolicy && snapshot.hasAnnualDefaultOffRequestPolicy;
  const scheduleReviewReady = Boolean(snapshot.scheduleReviewRoute);

  const items: ChecklistItem[] = [
    buildChecklistItem(
      'organization_profile',
      '병원 정보 확인',
      '/ops/organization-setup',
      organizationProfileReady,
      '병원 정보 확인이 아직 완료되지 않았습니다.'
    ),
    buildChecklistItem(
      'schedule_foundation',
      '기준 장소와 근무 기준 설정',
      '/schedule/step2',
      scheduleFoundationReady,
      '기준 장소, 휴식시간, 시프트, 인력 기준 설정을 먼저 완료해주세요.'
    ),
    buildChecklistItem(
      'employee_roster',
      '직원 로스터 준비',
      '/schedule/step3',
      employeeRosterReady,
      '직원 로스터가 아직 등록되지 않았습니다.'
    ),
    buildChecklistItem(
      'off_request_policy',
      'Off 사용 기준 설정',
      '/ops/off-request-policy-setup',
      offRequestPolicyReady,
      '필요하면 나중에 설정할 수 있습니다.',
      true
    ),
    buildChecklistItem(
      'schedule_review',
      '최종 검토 진입',
      snapshot.scheduleReviewRoute,
      scheduleReviewReady,
      '검토할 근무표가 아직 없습니다.'
    ),
  ];

  return {
    organizationId: snapshot.organizationId,
    checklistCursor: snapshot.checklistCursor,
    ready: items.every((item) => item.isOptional || item.status === 'ready'),
    items,
    fairnessSummary: snapshot.fairnessSummary,
  };
}
