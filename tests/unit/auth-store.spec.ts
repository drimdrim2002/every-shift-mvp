import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { User } from '@supabase/supabase-js';

const {
  signInWithPasswordMock,
  signOutMock,
  getSessionMock,
  syncWithAuthUserMock,
} = vi.hoisted(() => ({
  signInWithPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  getSessionMock: vi.fn(),
  syncWithAuthUserMock: vi.fn(),
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
  });

  it('clears schedule scope on logout', async () => {
    signOutMock.mockResolvedValue({ error: null });

    const store = useAuthStore();
    store.user = createAuthUser();

    await store.logout();

    expect(store.user).toBeNull();
    expect(syncWithAuthUserMock).toHaveBeenCalledWith(null);
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
  });
});
