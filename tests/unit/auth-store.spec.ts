import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { AuthError, User } from '@supabase/supabase-js';

const {
  signInWithPasswordMock,
  signOutMock,
  getSessionMock,
  syncWithAuthUserMock,
  ensureAccessContextLoadedMock,
  setSessionUserMock,
} = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  getSessionMock: vi.fn(),
  syncWithAuthUserMock: vi.fn(),
  ensureAccessContextLoadedMock: vi.fn(),
  setSessionUserMock: vi.fn(),
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
    syncWithAuthUser: syncWithAuthUserMock,
  }),
}));

vi.mock('@/stores/rbac', () => ({
  useRbacStore: () => ({
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
    ensureAccessContextLoadedMock.mockResolvedValue(undefined)
  });

  it('syncs schedule scope after successful login', async () => {
    const user = createAuthUser();
    signInWithPasswordMock.mockResolvedValue({
      data: { user },
      error: null,
    });

    const store = useAuthStore();
    const result = await store.login('admin@everyshift.com', 'password');

    expect(result).toEqual({ success: true });
    expect(store.user).toEqual(user);
    expect(syncWithAuthUserMock).toHaveBeenCalledWith(user);
    expect(setSessionUserMock).toHaveBeenCalledWith(user)
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

  it('waits for access-context hydration before resolving a successful login', async () => {
    const user = createAuthUser()
    let resolveHydration: (() => void) | null = null
    signInWithPasswordMock.mockResolvedValue({
      data: { user },
      error: null,
    })
    ensureAccessContextLoadedMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveHydration = resolve
        }),
    )

    const store = useAuthStore()
    let settled = false
    const loginPromise = store.login('admin@everyshift.com', 'password').then(() => {
      settled = true
    })

    await Promise.resolve()

    expect(ensureAccessContextLoadedMock).toHaveBeenCalledTimes(1)
    expect(settled).toBe(false)

    resolveHydration?.()
    await loginPromise

    expect(settled).toBe(true)
  })

  it('clears schedule scope on logout', async () => {
    signOutMock.mockResolvedValue({ error: null });

    const store = useAuthStore();
    store.user = createAuthUser();

    await store.logout();

    expect(store.user).toBeNull();
    expect(syncWithAuthUserMock).toHaveBeenCalledWith(null);
    expect(setSessionUserMock).toHaveBeenCalledWith(null)
  });

  it('syncs schedule scope from the existing session on checkSession', async () => {
    const user = createAuthUser({
      id: 'user-2',
      app_metadata: {
        organization_id: 'org-2',
      },
    });
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
    expect(syncWithAuthUserMock).toHaveBeenCalledWith(user);
    expect(ensureAccessContextLoadedMock).toHaveBeenCalledTimes(1)
  });
});
