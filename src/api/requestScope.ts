import { useRbacStore } from '@/stores/rbac';

export function getRequiredOrganizationId(): string {
  const rbacStore = useRbacStore();
  const organizationId =
    rbacStore.selectedOrganizationId ?? rbacStore.effectiveMembership?.organizationId ?? null;

  if (!organizationId) {
    throw new Error('활성 조직을 먼저 선택하세요.');
  }

  return organizationId;
}

export function buildOrganizationScopeHeaders(
  organizationId: string
): { 'X-Organization-Id': string } {
  return {
    'X-Organization-Id': organizationId,
  };
}
