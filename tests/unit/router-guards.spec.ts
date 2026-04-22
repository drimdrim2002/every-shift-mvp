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

  it('allows setup-mode Step2 access without Step1 context for the canonical context query', async () => {
    const next = vi.fn();

    await stepProgressGuard(
      { path: '/schedule/step2', query: { context: 'setup' } } as any,
      { path: '/' } as any,
      next
    );

    expect(showWarningMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('allows setup-mode Step2 access without Step1 context for the legacy entry query', async () => {
    const next = vi.fn();

    await stepProgressGuard(
      { path: '/schedule/step2', query: { entry: 'setup' } } as any,
      { path: '/' } as any,
      next
    );

    expect(showWarningMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('allows setup-mode Step3 access without Step1 or Step2 context for the canonical context query', async () => {
    const next = vi.fn();

    await stepProgressGuard(
      { path: '/schedule/step3', query: { context: 'setup' } } as any,
      { path: '/' } as any,
      next
    );

    expect(showWarningMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('allows setup-mode Step3 access without Step1 or Step2 context for the legacy entry query', async () => {
    const next = vi.fn();

    await stepProgressGuard(
      { path: '/schedule/step3', query: { entry: 'setup' } } as any,
      { path: '/' } as any,
      next
    );

    expect(showWarningMock).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('keeps wizard-mode Step2 gated on basic info', async () => {
    const next = vi.fn();

    await stepProgressGuard(
      { path: '/schedule/step2', query: {} } as any,
      { path: '/' } as any,
      next
    );

    expect(showWarningMock).toHaveBeenCalledWith('먼저 기본 정보를 입력해주세요.');
    expect(next).toHaveBeenCalledWith('/schedule/step1');
  });

  it('keeps wizard-mode Step3 gated when site requirements are missing', async () => {
    scheduleStoreMock.basicInfo = {
      month: '2026-04',
      organizationId: 'org-1',
    };

    const next = vi.fn();

    await stepProgressGuard(
      { path: '/schedule/step3', query: {} } as any,
      { path: '/' } as any,
      next
    );

    expect(showWarningMock).toHaveBeenCalledWith('먼저 사이트 정보를 입력해주세요.');
    expect(next).toHaveBeenCalledWith('/schedule/step2');
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
