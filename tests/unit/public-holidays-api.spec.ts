import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseFromMock } = vi.hoisted(() => ({
  supabaseFromMock: vi.fn(),
}));

vi.mock('@/api/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

import { listPublicHolidayDatesInRange } from '@/api/publicHolidays';

const ERROR_MESSAGE = '공휴일 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';

function mockPublicHolidayQuery(
  response: {
    data: Array<{ holiday_date: string | null }> | null;
    error: { message: string } | null;
  },
) {
  const order = vi.fn().mockResolvedValue(response);
  const lte = vi.fn().mockReturnValue({ order });
  const gte = vi.fn().mockReturnValue({ lte });
  const eqIsHoliday = vi.fn().mockReturnValue({ gte });
  const eqCountry = vi.fn().mockReturnValue({ eq: eqIsHoliday });
  const select = vi.fn().mockReturnValue({ eq: eqCountry });

  supabaseFromMock.mockReturnValue({ select });

  return {
    select,
    eqCountry,
    eqIsHoliday,
    gte,
    lte,
    order,
  };
}

describe('public holidays api boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries Korean public holiday dates in the requested inclusive range', async () => {
    const query = mockPublicHolidayQuery({
      data: [
        { holiday_date: '2026-05-05' },
        { holiday_date: '2026-05-01' },
      ],
      error: null,
    });

    await expect(listPublicHolidayDatesInRange('2026-05-01', '2026-05-31')).resolves.toEqual([
      '2026-05-01',
      '2026-05-05',
    ]);

    expect(supabaseFromMock).toHaveBeenCalledWith('public_holidays');
    expect(query.select).toHaveBeenCalledWith('holiday_date');
    expect(query.eqCountry).toHaveBeenCalledWith('country_code', 'KR');
    expect(query.eqIsHoliday).toHaveBeenCalledWith('is_holiday', true);
    expect(query.gte).toHaveBeenCalledWith('holiday_date', '2026-05-01');
    expect(query.lte).toHaveBeenCalledWith('holiday_date', '2026-05-31');
    expect(query.order).toHaveBeenCalledWith('holiday_date', { ascending: true });
  });

  it('normalizes duplicate and null rows away', async () => {
    mockPublicHolidayQuery({
      data: [
        { holiday_date: '2026-05-05' },
        { holiday_date: null },
        { holiday_date: '2026-05-01' },
        { holiday_date: '2026-05-05' },
      ],
      error: null,
    });

    await expect(listPublicHolidayDatesInRange('2026-05-01', '2026-05-31')).resolves.toEqual([
      '2026-05-01',
      '2026-05-05',
    ]);
  });

  it('returns an empty list without querying for inverted ranges', async () => {
    await expect(listPublicHolidayDatesInRange('2026-06-01', '2026-05-31')).resolves.toEqual([]);

    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it('throws the Korean holiday load error for invalid caller-provided dates', async () => {
    await expect(listPublicHolidayDatesInRange('2026-5-01', '2026-05-31')).rejects.toThrow(
      ERROR_MESSAGE,
    );
    await expect(listPublicHolidayDatesInRange('2026-05-01', '2026-02-31')).rejects.toThrow(
      ERROR_MESSAGE,
    );

    expect(supabaseFromMock).not.toHaveBeenCalled();
  });

  it('throws the Korean holiday load error when Supabase returns an error', async () => {
    mockPublicHolidayQuery({
      data: null,
      error: { message: 'permission denied' },
    });

    await expect(listPublicHolidayDatesInRange('2026-05-01', '2026-05-31')).rejects.toThrow(
      ERROR_MESSAGE,
    );
  });
});
