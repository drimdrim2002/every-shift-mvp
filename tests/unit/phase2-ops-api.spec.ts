import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  OrganizationProfileRequest,
  OrganizationProfileResponse,
  ShiftsConstraintsRequest,
  ShiftsConstraintsResponse,
  SiteRequest,
  SiteResponse,
  SitesRequest,
  SitesResponse,
} from '@/types/ops';

const getSessionMock = vi.fn();
const fetchMock = vi.fn();

vi.mock('@/api/supabase', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

describe('phase2 ops api helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'session-token',
        },
      },
      error: null,
    });
  });

  it('loads organization profile through the phase2-ops edge function', async () => {
    const response = {
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Severance Hospital',
      type: 'hospital',
    } satisfies OrganizationProfileResponse;

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const { getOrganizationProfile } = await import('@/api/ops');
    const result = await getOrganizationProfile(response.organizationId);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-ops/organization-profile?organizationId=00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: expect.objectContaining({
          apikey: 'anon-key',
          Authorization: 'Bearer session-token',
        }),
      })
    );
    expect(result).toEqual(response);
  });

  it('updates organization profile through the phase2-ops edge function', async () => {
    const request = {
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Severance Hospital',
      type: 'hospital',
    } satisfies OrganizationProfileRequest;

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(request), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const { updateOrganizationProfile } = await import('@/api/ops');
    const result = await updateOrganizationProfile(request);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-ops/organization-profile',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(request),
      })
    );
    expect(result).toEqual(request);
  });

  it('loads sites through the phase2-ops edge function', async () => {
    const responseSites = [
      {
        id: 'site-1',
        organizationId: '00000000-0000-0000-0000-000000000001',
        code: 'MAIN',
        name: 'Main Ward',
        isActive: true,
        isScheduleActive: true,
      },
    ] satisfies SiteResponse[];
    const response = {
      organizationId: '00000000-0000-0000-0000-000000000001',
      pilotSiteId: 'site-1',
      sites: responseSites,
    } satisfies SitesResponse;

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const { getSites } = await import('@/api/ops');
    const result = await getSites('00000000-0000-0000-0000-000000000001');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-ops/sites?organizationId=00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(result).toEqual(response);
  });

  it('rejects site payloads that do not contain exactly one schedule-active site', async () => {
    const { updateSites } = await import('@/api/ops');
    const invalidSites = [
      {
        code: 'A',
        name: 'Alpha',
        isActive: true,
        isScheduleActive: true,
      },
      {
        code: 'B',
        name: 'Bravo',
        isActive: true,
        isScheduleActive: true,
      },
    ] satisfies SiteRequest[];

    await expect(
      updateSites({
        organizationId: '00000000-0000-0000-0000-000000000001',
        sites: invalidSites,
      })
    ).rejects.toThrow('Exactly one schedule-active site is required');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves valid sites and shift constraints through the phase2-ops edge function', async () => {
    const siteRequest = {
      organizationId: '00000000-0000-0000-0000-000000000001',
      sites: [
        {
          code: 'MAIN',
          name: 'Main Ward',
          isActive: true,
          isScheduleActive: true,
        },
      ],
    } satisfies SitesRequest;

    const sitesResponse = {
      organizationId: '00000000-0000-0000-0000-000000000001',
      pilotSiteId: 'site-1',
      sites: [
        {
          id: 'site-1',
          organizationId: '00000000-0000-0000-0000-000000000001',
          code: 'MAIN',
          name: 'Main Ward',
          isActive: true,
          isScheduleActive: true,
        },
      ],
    } satisfies SitesResponse;

    const shiftsConstraintsRequest = {
      organizationId: '00000000-0000-0000-0000-000000000001',
      minimumRestHours: 11,
      checklistCursor: '',
    } satisfies ShiftsConstraintsRequest;

    const shiftsConstraintsResponse = {
      organizationId: '00000000-0000-0000-0000-000000000001',
      minimumRestHours: 11,
      checklistCursor: '',
    } satisfies ShiftsConstraintsResponse;

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify(sitesResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(shiftsConstraintsResponse), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

    const { updateSites, updateShiftsConstraints } = await import('@/api/ops');

    const sitesResult = await updateSites(siteRequest);
    const shiftsConstraintsResult = await updateShiftsConstraints(shiftsConstraintsRequest);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co/functions/v1/phase2-ops/sites',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(siteRequest),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co/functions/v1/phase2-ops/shifts-constraints',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(shiftsConstraintsRequest),
      })
    );
    expect(sitesResult).toEqual(sitesResponse);
    expect(shiftsConstraintsResult).toEqual(shiftsConstraintsResponse);
  });

  it('loads shift constraints through the phase2-ops edge function', async () => {
    const response = {
      organizationId: '00000000-0000-0000-0000-000000000001',
      minimumRestHours: 11,
      checklistCursor: '',
    } satisfies ShiftsConstraintsResponse;

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const { getShiftsConstraints } = await import('@/api/ops');
    const result = await getShiftsConstraints('00000000-0000-0000-0000-000000000001');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-ops/shifts-constraints?organizationId=00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(result).toEqual(response);
  });
});
