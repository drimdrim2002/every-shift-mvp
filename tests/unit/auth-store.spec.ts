import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { AuthError, User } from '@supabase/supabase-js';

const {
  signInWithPasswordMock,
  signOutMock,
  getSessionMock,
  syncWithAccessScopeMock,
  ensureAccessContextLoadedMock,
  setSessionUserMock,
  resetContextMock,
  rbacStoreState,
} = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  getSessionMock: vi.fn(),
  syncWithAccessScopeMock: vi.fn(),
  ensureAccessContextLoadedMock: vi.fn(),
  setSessionUserMock: vi.fn(),
  resetContextMock: vi.fn(),
  rbacStoreState: {
    selectedOrganizationId: 'org-1' as string | null,
    effectiveMembership: null as { organizationId: string } | null,
  },
}));

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
      getSession: getSessionMock,
    },
  },
}));

vi.mock('@/stores/schedule', () => ({
  useScheduleStore: () => ({
    syncWithAccessScope: syncWithAccessScopeMock,
  }),
}));

vi.mock('@/stores/organization', () => ({
  useOrganizationStore: () => ({
    resetContext: resetContextMock,
  }),
}));

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => ({
    selectedOrganizationId: rbacStoreState.selectedOrganizationId,
    effectiveMembership: rbacStoreState.effectiveMembership,
    setSessionUser: setSessionUserMock,
    ensureAccessContextLoaded: ensureAccessContextLoadedMock,
  }),
}))

import { useAuthStore } from '@/stores/auth';

function createAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    created_at: '2026-03-28T00:00:00Z',
    app_metadata: {
      organization_id: 'org-1',
    },
    user_metadata: {},
    ...overrides,
  } as User;
}

describe('useAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    ensureAccessContextLoadedMock.mockResolvedValue(undefined);
    rbacStoreState.selectedOrganizationId = 'org-1';
    rbacStoreState.effectiveMembership = null;
  });

  it('syncs schedule access scope after successful login', async () => {
    const user = createAuthUser();
    signInWithPasswordMock.mockResolvedValue({
      data: { user },
      error: null,
    });

    const store = useAuthStore();
    const result = await store.login('admin@everyshift.com', 'password');

    expect(result).toEqual({ success: true });
    expect(store.user).toEqual(user);
    expect(syncWithAccessScopeMock).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-1',
    });
    expect(setSessionUserMock).toHaveBeenCalledWith(user);
  });

  it('maps invalid credentials into a user-friendly Korean message', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: {
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      } satisfies Partial<AuthError>,
    });

    const store = useAuthStore();
    const result = await store.login('admin@everyshift.com', 'wrong-password');

    expect(result).toEqual({
      success: false,
      error: '이메일 또는 비밀번호가 올바르지 않습니다.',
    });
  });

  it('waits for access-context hydration before syncing the scoped wizard state', async () => {
    const user = createAuthUser();
    let resolveHydration: (() => void) | null = null;
    signInWithPasswordMock.mockResolvedValue({
      data: { user },
      error: null,
    });
    ensureAccessContextLoadedMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveHydration = resolve;
        }),
    );

    const store = useAuthStore();
    let settled = false;
    const loginPromise = store.login('admin@everyshift.com', 'password').then(() => {
      settled = true;
    });

    await Promise.resolve();

    expect(ensureAccessContextLoadedMock).toHaveBeenCalledTimes(1);
    expect(syncWithAccessScopeMock).not.toHaveBeenCalled();
    expect(settled).toBe(false);

    resolveHydration?.();
    await loginPromise;

    expect(syncWithAccessScopeMock).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-1',
    });
    expect(settled).toBe(true);
  });

  it('clears schedule scope and organization context on logout', async () => {
    signOutMock.mockResolvedValue({ error: null });

    const store = useAuthStore();
    store.user = createAuthUser();

    await store.logout();

    expect(store.user).toBeNull();
    expect(syncWithAccessScopeMock).toHaveBeenCalledWith(null);
    expect(resetContextMock).toHaveBeenCalledTimes(1);
    expect(setSessionUserMock).toHaveBeenCalledWith(null);
  });

  it('syncs schedule access scope from the hydrated existing session on checkSession', async () => {
    const user = createAuthUser({
      id: 'user-2',
      app_metadata: {
        organization_id: 'org-2',
      },
    });
    rbacStoreState.selectedOrganizationId = 'org-2';
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user,
        },
      },
    });

    const store = useAuthStore();
    await store.checkSession();

    expect(store.user).toEqual(user);
    expect(syncWithAccessScopeMock).toHaveBeenCalledWith({
      userId: 'user-2',
      organizationId: 'org-2',
    });
    expect(ensureAccessContextLoadedMock).toHaveBeenCalledTimes(1);
  });

  it('passes a null organization scope through after RBAC hydration when no org is active', async () => {
    const user = createAuthUser();
    rbacStoreState.selectedOrganizationId = null;
    rbacStoreState.effectiveMembership = null;
    signInWithPasswordMock.mockResolvedValue({
      data: { user },
      error: null,
    });

    const store = useAuthStore();
    const result = await store.login('admin@everyshift.com', 'password');

    expect(result).toEqual({ success: true });
    expect(syncWithAccessScopeMock).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: null,
    });
  });
});
