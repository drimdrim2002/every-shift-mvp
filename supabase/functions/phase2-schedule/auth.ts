import { ContractError, type Phase2ScheduleAuthContext } from './contracts.ts';
import {
  OrganizationAccessError,
  resolveOrganizationAccessContext,
  type SharedAccessRepositoryClient,
  type SharedAuthClient,
} from '../_shared/organization-access.ts';

export type Phase2ScheduleAuthClient = SharedAuthClient;
export type Phase2ScheduleAuthRepositoryClient = SharedAccessRepositoryClient;

class RestRepositoryQueryBuilder<T> {
  private columns = '*';
  private readonly filters: Array<[string, string]> = [];
  private limitCount: number | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly serviceRoleKey: string,
    private readonly table: 'profiles' | 'organization_memberships'
  ) {}

  select(columns: string): RestRepositoryQueryBuilder<T> {
    this.columns = columns;
    return this;
  }

  eq(column: string, value: string): RestRepositoryQueryBuilder<T> {
    this.filters.push([column, value]);
    return this;
  }

  limit(count: number): RestRepositoryQueryBuilder<T> {
    this.limitCount = count;
    return this;
  }

  async maybeSingle(): Promise<{
    data: T | null;
    error: { message: string } | null;
  }> {
    const url = new URL(`${this.baseUrl}/rest/v1/${this.table}`);
    url.searchParams.set('select', this.columns);

    for (const [column, value] of this.filters) {
      url.searchParams.append(column, `eq.${value}`);
    }

    if (this.limitCount !== null) {
      url.searchParams.set('limit', String(this.limitCount));
    }

    const response = await fetch(url, {
      headers: {
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        data: null,
        error: {
          message: await response.text(),
        },
      };
    }

    const payload = await response.json();
    const data = Array.isArray(payload) ? (payload[0] ?? null) : (payload ?? null);

    return {
      data: data as T | null,
      error: null,
    };
  }
}

function createRepositoryClient(): Phase2ScheduleAuthRepositoryClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new ContractError(
      'internal_error',
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured',
      500
    );
  }

  return {
    from(table: 'profiles' | 'organization_memberships') {
      return {
        select(columns: string) {
          return new RestRepositoryQueryBuilder(supabaseUrl, serviceRoleKey, table).select(columns);
        },
      };
    },
  };
}

function toContractError(error: unknown): never {
  if (error instanceof OrganizationAccessError) {
    throw new ContractError(error.code, error.message, error.status);
  }

  throw error;
}

function assertScheduleAdmin(
  access: Awaited<ReturnType<typeof resolveOrganizationAccessContext>>
): void {
  if (access.isSuper || access.organizationRole === 'admin') {
    return;
  }

  throw new ContractError(
    'organization_access_denied',
    'Authenticated user is not authorized for phase2 schedule',
    403
  );
}

export async function resolveAuthContext(
  authClient: Phase2ScheduleAuthClient,
  repositoryClientOrRequest: Phase2ScheduleAuthRepositoryClient | Request,
  maybeRequest?: Request
): Promise<Phase2ScheduleAuthContext> {
  const request = maybeRequest ?? (repositoryClientOrRequest as Request);
  const repositoryClient = maybeRequest
    ? (repositoryClientOrRequest as Phase2ScheduleAuthRepositoryClient)
    : createRepositoryClient();

  try {
    const access = await resolveOrganizationAccessContext(authClient, repositoryClient, request);
    assertScheduleAdmin(access);

    return {
      userId: access.userId,
      organizationId: access.organizationId,
    };
  } catch (error: unknown) {
    toContractError(error);
  }
}
