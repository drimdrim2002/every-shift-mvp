import { beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';

const { showWarningMock, supabaseFromMock } = vi.hoisted(() => ({
  showWarningMock: vi.fn(),
  supabaseFromMock: vi.fn(),
}));

const scheduleStoreMock = reactive({
  basicInfo: null as
    | {
        month: string;
        organizationId: string;
      }
    | null,
  siteRequirements: [] as Array<unknown>,
  employees: [] as Array<{ id: string }>,
});

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => scheduleStoreMock,
}));

vi.mock('@/utils/message', () => ({
  showWarning: showWarningMock,
}));

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

import { stepProgressGuard } from '@/router/guards';

describe('stepProgressGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scheduleStoreMock.basicInfo = null;
    scheduleStoreMock.siteRequirements = [];
    scheduleStoreMock.employees = [];
  });

  it('redirects Step4 to Step1 when basic info is missing', async () => {
    const next = vi.fn();

    await stepProgressGuard(
      { path: '/schedule/step4', params: {} } as any,
      { path: '/' } as any,
      next
    );

    expect(showWarningMock).toHaveBeenCalledWith('먼저 기본 정보를 입력해주세요.');
    expect(next).toHaveBeenCalledWith('/schedule/step1');
  });

  it('allows Step4 re-entry when basic info is restored and employees exist in DB', async () => {
    scheduleStoreMock.basicInfo = {
      month: '2026-04',
      organizationId: 'org-1',
    };

    const eq = vi.fn().mockResolvedValue({ count: 2, error: null });
    const select = vi.fn().mockReturnValue({ eq });
    supabaseFromMock.mockReturnValue({ select });

    const next = vi.fn();

    await stepProgressGuard(
      { path: '/schedule/step4', params: {} } as any,
      { path: '/schedule/step1' } as any,
      next
    );

    expect(supabaseFromMock).toHaveBeenCalledWith('employees');
    expect(select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(next).toHaveBeenCalledWith();
  });
});
