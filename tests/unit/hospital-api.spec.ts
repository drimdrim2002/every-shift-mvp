import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { HospitalSearchApiError, searchHospitals } from '@/api/hospital'
import { supabase } from '@/api/supabase'

describe('hospital api boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns an empty list without invoking the edge function for a blank keyword', async () => {
    await expect(searchHospitals('   ')).resolves.toEqual([])
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('maps invoke HTTP error payload to a canonical upstream timeout error', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'UPSTREAM_TIMEOUT',
              message: '병원 검색 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
            },
          }),
          {
            status: 504,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      },
    })

    await expect(searchHospitals('세브')).rejects.toEqual(
      expect.objectContaining<Partial<HospitalSearchApiError>>({
        name: 'HospitalSearchApiError',
        code: 'UPSTREAM_TIMEOUT',
        message: '병원 검색 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
      }),
    )
  })

  it('falls back to INTERNAL_ERROR when invoke fails without a parseable payload', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: {
        message: 'network failure',
      },
    })

    await expect(searchHospitals('세브')).rejects.toEqual(
      expect.objectContaining<Partial<HospitalSearchApiError>>({
        name: 'HospitalSearchApiError',
        code: 'INTERNAL_ERROR',
        message: 'network failure',
      }),
    )
  })
})
