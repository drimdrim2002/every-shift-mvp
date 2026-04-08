import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000001',
          name: 'Severance Hospital',
          type: 'hospital',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const { getOrganizationProfile } = await import('@/api/ops');
    const result = await getOrganizationProfile('00000000-0000-0000-0000-000000000001');

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
    expect(result).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Severance Hospital',
      type: 'hospital',
    });
  });

  it('updates organization profile through the phase2-ops edge function', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000001',
          name: 'Severance Hospital',
          type: 'hospital',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const { updateOrganizationProfile } = await import('@/api/ops');
    const result = await updateOrganizationProfile({
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Severance Hospital',
      type: 'hospital',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-ops/organization-profile',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000001',
          name: 'Severance Hospital',
          type: 'hospital',
        }),
      })
    );
    expect(result).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      name: 'Severance Hospital',
      type: 'hospital',
    });
  });

  it('loads sites through the phase2-ops edge function', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const { getSites } = await import('@/api/ops');
    const result = await getSites('00000000-0000-0000-0000-000000000001');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-ops/sites?organizationId=00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(result).toEqual({
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
    });
  });

  it('rejects site payloads that do not contain exactly one schedule-active site', async () => {
    const { updateSites } = await import('@/api/ops');

    await expect(
      updateSites({
        organizationId: '00000000-0000-0000-0000-000000000001',
        sites: [
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
        ],
      })
    ).rejects.toThrow('Exactly one schedule-active site is required');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves valid sites and shift constraints through the phase2-ops edge function', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
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
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            organizationId: '00000000-0000-0000-0000-000000000001',
            minimumRestHours: 11,
            checklistCursor: '',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
      );

    const { updateSites, updateShiftsConstraints } = await import('@/api/ops');

    const sitesResult = await updateSites({
      organizationId: '00000000-0000-0000-0000-000000000001',
      sites: [
        {
          code: 'MAIN',
          name: 'Main Ward',
          isActive: true,
          isScheduleActive: true,
        },
      ],
    });

    const shiftsConstraintsResult = await updateShiftsConstraints({
      organizationId: '00000000-0000-0000-0000-000000000001',
      minimumRestHours: 11,
      checklistCursor: '',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co/functions/v1/phase2-ops/sites',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000001',
          sites: [
            {
              code: 'MAIN',
              name: 'Main Ward',
              isActive: true,
              isScheduleActive: true,
            },
          ],
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://example.supabase.co/functions/v1/phase2-ops/shifts-constraints',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000001',
          minimumRestHours: 11,
          checklistCursor: '',
        }),
      })
    );
    expect(sitesResult).toEqual({
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
    });
    expect(shiftsConstraintsResult).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      minimumRestHours: 11,
      checklistCursor: '',
    });
  });

  it('loads shift constraints through the phase2-ops edge function', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000001',
          minimumRestHours: 11,
          checklistCursor: '',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const { getShiftsConstraints } = await import('@/api/ops');
    const result = await getShiftsConstraints('00000000-0000-0000-0000-000000000001');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/phase2-ops/shifts-constraints?organizationId=00000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        method: 'GET',
      })
    );
    expect(result).toEqual({
      organizationId: '00000000-0000-0000-0000-000000000001',
      minimumRestHours: 11,
      checklistCursor: '',
    });
  });
});
