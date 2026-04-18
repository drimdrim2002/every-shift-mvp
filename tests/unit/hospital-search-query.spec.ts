import { describe, expect, it } from 'vitest'

import { buildHospitalSearchQuery } from '../../supabase/functions/hospital-search/query'

describe('hospital-search upstream query', () => {
  it('uses the hospital-name parameter instead of the location parameter', () => {
    const params = buildHospitalSearchQuery('secret-key', '이화', 1, 20)

    expect(params.get('serviceKey')).toBe('secret-key')
    expect(params.get('yadmNm')).toBe('이화')
    expect(params.get('Q0')).toBeNull()
    expect(params.get('pageNo')).toBe('1')
    expect(params.get('numOfRows')).toBe('20')
    expect(params.get('_type')).toBe('json')
  })
})
