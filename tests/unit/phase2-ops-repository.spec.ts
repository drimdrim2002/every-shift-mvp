import { describe, expect, it, vi } from 'vitest';
import { bootstrapAdmin } from '@/../supabase/functions/phase2-ops/repository.ts';
import type { BootstrapAdminRequest } from '@/../supabase/functions/phase2-ops/contracts.ts';
import type { Phase2OpsOperatorAuthContext } from '@/../supabase/functions/phase2-ops/auth.ts';
import type { Phase2OpsRepositoryClient } from '@/../supabase/functions/phase2-ops/repository.ts';

interface QueryResult<T> {
  data: T | null;
  error: { message: string } | null;
}

class FakeSelectBuilder<T> {
  constructor(private readonly resolveResult: () => QueryResult<T>) {}

  eq() {
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle(): Promise<QueryResult<T>> {
    return Promise.resolve(this.resolveResult());
  }
}

function createRepositoryClient(params: {
  users?: Array<Record<string, unknown>>;
  userPages?: Array<Array<Record<string, unknown>>>;
  profile?: Record<string, unknown> | null;
  profileResults?: Array<Record<string, unknown> | null>;
  onboardingProgress?: Record<string, unknown> | null;
  onboardingProgressResults?: Array<Record<string, unknown> | null>;
  profileInsertErrors?: Array<{ message: string } | null>;
  onboardingInsertErrors?: Array<{ message: string } | null>;
}) {
  const insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];
  const updateCalls: Array<{
    table: string;
    payload: Record<string, unknown>;
    filters: Array<[string, string]>;
  }> = [];
  const userPages = params.userPages ?? [params.users ?? []];
  const profileResults = [...(params.profileResults ?? [params.profile ?? null])];
  const onboardingProgressResults = [
    ...(params.onboardingProgressResults ?? [params.onboardingProgress ?? null]),
  ];
  const profileInsertErrors = [...(params.profileInsertErrors ?? [])];
  const onboardingInsertErrors = [...(params.onboardingInsertErrors ?? [])];
  const nextProfileResult = () => profileResults.shift() ?? params.profile ?? null;
  const nextOnboardingProgressResult =
    () => onboardingProgressResults.shift() ?? params.onboardingProgress ?? null;
  const listUsers = vi.fn().mockImplementation(async ({ page = 1 } = {}) => ({
    data: {
      users: userPages[page - 1] ?? [],
    },
    error: null,
  }));
  const updateUserById = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  });

  const client: Phase2OpsRepositoryClient = {
    auth: {
      admin: {
        listUsers,
        updateUserById,
      },
    },
    from(table) {
      if (table === 'profiles') {
        return {
          select() {
            return new FakeSelectBuilder(() => ({
              data: nextProfileResult(),
              error: null,
            }));
          },
          insert(payload) {
            insertCalls.push({ table, payload });
            return Promise.resolve({
              data: null,
              error: profileInsertErrors.shift() ?? null,
            });
          },
          update(payload) {
            return {
              eq(column, value) {
                updateCalls.push({
                  table,
                  payload,
                  filters: [[column, value]],
                });
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }

      return {
        select() {
          return new FakeSelectBuilder(() => ({
            data: nextOnboardingProgressResult(),
            error: null,
          }));
        },
        insert(payload) {
          insertCalls.push({ table, payload });
          return Promise.resolve({
            data: null,
            error: onboardingInsertErrors.shift() ?? null,
          });
        },
        update(payload) {
          return {
            eq(column, value) {
              updateCalls.push({
                table,
                payload,
                filters: [[column, value]],
              });
              return Promise.resolve({ data: null, error: null });
            },
          };
        },
      };
    },
  };

  return { client, insertCalls, updateCalls, listUsers, updateUserById };
}

const AUTH_CONTEXT: Phase2OpsOperatorAuthContext = {
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  operatorOrganizationId: null,
  operatorGlobalRole: 'super',
};

const ADMIN_AUTH_CONTEXT: Phase2OpsOperatorAuthContext = {
  operatorUserId: '11111111-1111-4111-8111-111111111111',
  operatorOrganizationId: '00000000-0000-0000-0000-000000000009',
  operatorGlobalRole: 'admin',
};

const REQUEST: BootstrapAdminRequest = {
  organizationId: '00000000-0000-0000-0000-000000000001',
  targetEmail: 'pilot-admin@example.com',
  displayName: 'Pilot Admin',
  onboardingInitializationFlags: {
    createPilotSite: true,
    seedOrganizationSettings: true,
  },
};

describe('phase2 ops repository', () => {
  it('creates profile and onboarding progress while aligning auth metadata', async () => {
    const { client, insertCalls, updateCalls, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {},
          user_metadata: {},
        },
      ],
      profile: null,
      onboardingProgress: null,
    });
    const emitEvent = vi.fn();

    const result = await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, emitEvent);

    expect(result).toEqual({
      organizationId: REQUEST.organizationId,
      targetEmail: REQUEST.targetEmail,
      displayName: REQUEST.displayName,
      operatorUserId: AUTH_CONTEXT.operatorUserId,
      onboardingInitializationFlags: REQUEST.onboardingInitializationFlags,
    });
    expect(insertCalls).toEqual([
      {
        table: 'profiles',
        payload: {
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
          global_role: 'user',
          account_status: 'active',
        },
      },
      {
        table: 'onboarding_progress',
        payload: {
          organization_id: REQUEST.organizationId,
          current_step: 1,
          current_step_key: 'organization_info',
          last_actor_user_id: AUTH_CONTEXT.operatorUserId,
        },
      },
    ]);
    expect(updateCalls).toHaveLength(0);
    expect(updateUserById).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      {
        app_metadata: {
          organization_id: REQUEST.organizationId,
          organizationId: REQUEST.organizationId,
          current_organization_id: REQUEST.organizationId,
          currentOrganizationId: REQUEST.organizationId,
          foundation: {
            current_step_key: 'organization_info',
            organization_info_confirmed_at: null,
            organization_info_confirmed_by: null,
          },
        },
      }
    );
    expect(emitEvent).toHaveBeenCalledWith('admin_bootstrap_provisioned', {
      organizationId: REQUEST.organizationId,
      operatorUserId: AUTH_CONTEXT.operatorUserId,
      targetEmail: REQUEST.targetEmail,
      targetUserId: '22222222-2222-4222-8222-222222222222',
    });
  });

  it('syncs an existing profile and preserves onboarding progress when already initialized', async () => {
    const { client, insertCalls, updateCalls, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {
            organization_id: REQUEST.organizationId,
            organizationId: REQUEST.organizationId,
            current_organization_id: REQUEST.organizationId,
            currentOrganizationId: REQUEST.organizationId,
            foundation: {
              current_step_key: 'organization_info',
              organization_info_confirmed_at: null,
              organization_info_confirmed_by: null,
            },
          },
          user_metadata: {},
        },
      ],
      profile: {
        id: '22222222-2222-4222-8222-222222222222',
        organization_id: 'stale-org',
        role: 'user',
        display_name: 'Old Name',
        status: 'pending',
      },
      onboardingProgress: {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: REQUEST.organizationId,
        current_step: 4,
        current_step_key: 'step4',
      },
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(insertCalls).toHaveLength(0);
    expect(updateCalls).toEqual([
      {
        table: 'profiles',
        payload: {
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
          global_role: 'user',
          account_status: 'active',
        },
        filters: [['id', '22222222-2222-4222-8222-222222222222']],
      },
    ]);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('rejects bootstrap requests when a global admin targets a different organization', async () => {
    const { client, listUsers, updateUserById } = createRepositoryClient({
      users: [],
      profile: null,
      onboardingProgress: null,
    });

    await expect(bootstrapAdmin(client, ADMIN_AUTH_CONTEXT, REQUEST, vi.fn())).rejects.toMatchObject({
      code: 'organization_access_denied',
      message: 'Authenticated user is not authorized for the requested organization',
      status: 403,
    });

    expect(listUsers).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it('pages through auth users until the requested email is found', async () => {
    const { client, listUsers } = createRepositoryClient({
      userPages: [
        Array.from({ length: 200 }, (_, index) => ({
          id: `user-${index}`,
          email: `user-${index}@example.com`,
          app_metadata: {},
          user_metadata: {},
        })),
        [
          {
            id: '22222222-2222-4222-8222-222222222222',
            email: REQUEST.targetEmail,
            app_metadata: {},
            user_metadata: {},
          },
        ],
      ],
      profile: null,
      onboardingProgress: null,
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(listUsers).toHaveBeenCalledTimes(2);
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 200 });
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 200 });
  });

  it('treats duplicate profile and onboarding inserts as convergence instead of failure', async () => {
    const { client, insertCalls, updateCalls, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {},
          user_metadata: {},
        },
      ],
      profileResults: [
        null,
        {
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
        },
      ],
      onboardingProgressResults: [
        null,
        {
          id: '33333333-3333-4333-8333-333333333333',
          organization_id: REQUEST.organizationId,
          current_step: 1,
          current_step_key: 'organization_info',
        },
      ],
      profileInsertErrors: [
        { message: 'duplicate key value violates unique constraint "profiles_pkey"' },
      ],
      onboardingInsertErrors: [
        {
          message:
            'duplicate key value violates unique constraint "onboarding_progress_organization_id_key"',
        },
      ],
    });

    await expect(bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn())).resolves.toEqual({
      organizationId: REQUEST.organizationId,
      targetEmail: REQUEST.targetEmail,
      displayName: REQUEST.displayName,
      operatorUserId: AUTH_CONTEXT.operatorUserId,
      onboardingInitializationFlags: REQUEST.onboardingInitializationFlags,
    });

    expect(insertCalls).toEqual([
      {
        table: 'profiles',
        payload: {
          id: '22222222-2222-4222-8222-222222222222',
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
          global_role: 'user',
          account_status: 'active',
        },
      },
      {
        table: 'onboarding_progress',
        payload: {
          organization_id: REQUEST.organizationId,
          current_step: 1,
          current_step_key: 'organization_info',
          last_actor_user_id: AUTH_CONTEXT.operatorUserId,
        },
      },
    ]);
    expect(updateCalls).toEqual([
      {
        table: 'profiles',
        payload: {
          organization_id: REQUEST.organizationId,
          role: 'admin',
          display_name: REQUEST.displayName,
          status: 'active',
          global_role: 'user',
          account_status: 'active',
        },
        filters: [['id', '22222222-2222-4222-8222-222222222222']],
      },
    ]);
    expect(updateUserById).toHaveBeenCalledTimes(1);
  });

  it('preserves existing foundation progress when aligning missing organization metadata keys', async () => {
    const { client, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {
            foundation: {
              current_step_key: 'step4_review',
              organization_info_confirmed_at: '2026-04-08T10:00:00Z',
              organization_info_confirmed_by: 'operator-1',
            },
          },
          user_metadata: {},
        },
      ],
      profile: null,
      onboardingProgress: {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: REQUEST.organizationId,
        current_step: 4,
        current_step_key: 'step4_review',
      },
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(updateUserById).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      {
        app_metadata: {
          organization_id: REQUEST.organizationId,
          organizationId: REQUEST.organizationId,
          current_organization_id: REQUEST.organizationId,
          currentOrganizationId: REQUEST.organizationId,
          foundation: {
            current_step_key: 'step4_review',
            organization_info_confirmed_at: '2026-04-08T10:00:00Z',
            organization_info_confirmed_by: 'operator-1',
          },
        },
      }
    );
  });

  it('rebuilds foundation metadata from onboarding progress when auth metadata is missing', async () => {
    const { client, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {},
          user_metadata: {},
        },
      ],
      profile: null,
      onboardingProgress: {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: REQUEST.organizationId,
        current_step: 4,
        current_step_key: 'step4_review',
        organization_info_confirmed_at: '2026-04-08T10:00:00Z',
        organization_info_confirmed_by: 'operator-1',
      },
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(updateUserById).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      {
        app_metadata: {
          organization_id: REQUEST.organizationId,
          organizationId: REQUEST.organizationId,
          current_organization_id: REQUEST.organizationId,
          currentOrganizationId: REQUEST.organizationId,
          foundation: {
            current_step_key: 'step4_review',
            organization_info_confirmed_at: '2026-04-08T10:00:00Z',
            organization_info_confirmed_by: 'operator-1',
          },
        },
      }
    );
  });

  it('preserves legacy foundation progress from user metadata during bootstrap replay', async () => {
    const { client, updateUserById } = createRepositoryClient({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          email: REQUEST.targetEmail,
          app_metadata: {},
          user_metadata: {
            foundation: {
              currentStepKey: 'step5_ready',
              organizationInfoConfirmedAt: '2026-04-08T10:00:00Z',
              organizationInfoConfirmedBy: 'operator-legacy',
            },
          },
        },
      ],
      profile: null,
      onboardingProgress: {
        id: '33333333-3333-4333-8333-333333333333',
        organization_id: REQUEST.organizationId,
        current_step: 2,
        current_step_key: 'organization_info',
      },
    });

    await bootstrapAdmin(client, AUTH_CONTEXT, REQUEST, vi.fn());

    expect(updateUserById).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
      {
        app_metadata: {
          organization_id: REQUEST.organizationId,
          organizationId: REQUEST.organizationId,
          current_organization_id: REQUEST.organizationId,
          currentOrganizationId: REQUEST.organizationId,
          foundation: {
            current_step_key: 'step5_ready',
            organization_info_confirmed_at: '2026-04-08T10:00:00Z',
            organization_info_confirmed_by: 'operator-legacy',
          },
        },
      }
    );
  });
});
