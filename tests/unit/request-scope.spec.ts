import { beforeEach, describe, expect, it, vi } from 'vitest';

const rbacStoreMock = vi.hoisted(() => ({
  selectedOrganizationId: null as string | null,
  effectiveMembership: null as { organizationId: string } | null,
}));

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => rbacStoreMock,
}));

describe('request scope helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    rbacStoreMock.selectedOrganizationId = null;
    rbacStoreMock.effectiveMembership = null;
  });

  it('prefers the selected organization id over the effective membership', async () => {
    rbacStoreMock.selectedOrganizationId = 'org-2';
    rbacStoreMock.effectiveMembership = { organizationId: 'org-1' };

    const { buildOrganizationScopeHeaders, getRequiredOrganizationId } = await import(
      '@/api/requestScope'
    );

    expect(getRequiredOrganizationId()).toBe('org-2');
    expect(buildOrganizationScopeHeaders('org-2')).toEqual({
      'X-Organization-Id': 'org-2',
    });
  });

  it('falls back to the effective membership organization id', async () => {
    rbacStoreMock.effectiveMembership = { organizationId: 'org-fallback' };

    const { getRequiredOrganizationId } = await import('@/api/requestScope');

    expect(getRequiredOrganizationId()).toBe('org-fallback');
  });

  it('throws a Korean error when there is no active organization', async () => {
    const { getRequiredOrganizationId } = await import('@/api/requestScope');

    expect(() => getRequiredOrganizationId()).toThrow('활성 조직을 먼저 선택하세요.');
  });
});
