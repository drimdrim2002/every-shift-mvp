import { describe, expect, it, vi } from 'vitest';

import {
  buildPublicHolidayApiUrl,
  normalizePublicHolidayRows,
  parsePublicHolidayApiPayload,
} from '../../scripts/ops/publicHolidaySync';
import {
  resolvePublicHolidaySyncConfig,
  syncPublicHolidays,
  upsertPublicHolidayRows,
} from '../../scripts/ops/sync-public-holidays';

const NOW = '2026-05-13T00:00:00.000Z';

function successPayload(item: unknown) {
  return {
    response: {
      header: {
        resultCode: '00',
        resultMsg: 'NORMAL SERVICE.',
      },
      body: {
        items: {
          item,
        },
      },
    },
  };
}

describe('public holiday API helpers', () => {
  it('normalizes a single holiday JSON item', () => {
    const rows = normalizePublicHolidayRows(
      successPayload({
        locdate: 20260101,
        dateName: '신정',
        isHoliday: 'Y',
      }),
      NOW,
    );

    expect(rows).toEqual([
      {
        holiday_date: '2026-01-01',
        name: '신정',
        is_holiday: true,
        country_code: 'KR',
        source: 'data.go.kr:kasi-special-day',
        source_payload: {
          locdate: 20260101,
          dateName: '신정',
          isHoliday: 'Y',
        },
        synced_at: NOW,
        updated_at: NOW,
      },
    ]);
  });

  it('normalizes an array response', () => {
    const rows = normalizePublicHolidayRows(
      successPayload([
        { locdate: 20260101, dateName: '신정', isHoliday: 'Y' },
        { locdate: 20260301, dateName: '삼일절', isHoliday: 'Y' },
      ]),
      NOW,
    );

    expect(rows.map((row) => row.holiday_date)).toEqual(['2026-01-01', '2026-03-01']);
  });

  it('returns an empty array for an empty response', () => {
    expect(
      normalizePublicHolidayRows(
        {
          response: {
            header: { resultCode: '00' },
            body: {},
          },
        },
        NOW,
      ),
    ).toEqual([]);
  });

  it("returns an empty array when items is ''", () => {
    expect(
      normalizePublicHolidayRows(
        {
          response: {
            header: { resultCode: '00' },
            body: { items: '' },
          },
        },
        NOW,
      ),
    ).toEqual([]);
  });

  it("filters items where isHoliday is not 'Y'", () => {
    const rows = normalizePublicHolidayRows(
      successPayload([
        { locdate: 20260505, dateName: '어린이날', isHoliday: 'Y' },
        { locdate: 20260515, dateName: '기념일', isHoliday: 'N' },
      ]),
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].holiday_date).toBe('2026-05-05');
  });

  it('supports boolean isHoliday true', () => {
    const rows = normalizePublicHolidayRows(
      successPayload({ locdate: '20260815', dateName: '광복절', isHoliday: true }),
      NOW,
    );

    expect(rows[0].holiday_date).toBe('2026-08-15');
  });

  it('deduplicates by holiday_date and lets later duplicates overwrite earlier rows', () => {
    const rows = normalizePublicHolidayRows(
      successPayload([
        { locdate: 20261003, dateName: '개천절', isHoliday: 'Y', sequence: 1 },
        { locdate: 20261003, dateName: '개천절 대체', isHoliday: 'Y', sequence: 2 },
      ]),
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('개천절 대체');
    expect(rows[0].source_payload).toEqual({
      locdate: 20261003,
      dateName: '개천절 대체',
      isHoliday: 'Y',
      sequence: 2,
    });
  });

  it('throws on invalid locdate', () => {
    expect(() =>
      normalizePublicHolidayRows(successPayload({ locdate: 20260231, dateName: '잘못된 날짜', isHoliday: 'Y' }), NOW),
    ).toThrow(/invalid locdate/i);
  });

  it('throws provider context on non-success resultCode', () => {
    expect(() =>
      normalizePublicHolidayRows(
        {
          response: {
            header: {
              resultCode: '99',
              resultMsg: 'LIMITED NUMBER OF SERVICE REQUESTS EXCEEDS ERROR.',
            },
            body: { items: '' },
          },
        },
        NOW,
      ),
    ).toThrow(/data\.go\.kr.*99.*LIMITED NUMBER/i);
  });

  it('throws when the provider response is malformed instead of treating it as empty success', () => {
    expect(() => normalizePublicHolidayRows({ html: '<html>forbidden</html>' }, NOW)).toThrow(
      /invalid response payload/i,
    );
  });

  it('throws when a provider success payload contains malformed item rows', () => {
    expect(() =>
      normalizePublicHolidayRows(
        {
          response: {
            header: { resultCode: '00' },
            body: { items: { item: 'bad' } },
          },
        },
        NOW,
      ),
    ).toThrow(/malformed item rows/i);
  });

  it('throws provider context on OpenAPI error wrapper payloads', () => {
    expect(() =>
      normalizePublicHolidayRows(
        {
          OpenAPI_ServiceResponse: {
            cmmMsgHeader: {
              errMsg: 'SERVICE ERROR',
              returnAuthMsg: 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR',
              returnReasonCode: '30',
            },
          },
        },
        NOW,
      ),
    ).toThrow(/SERVICE_KEY_IS_NOT_REGISTERED_ERROR/);
  });

  it('parses XML fallback using fast-xml-parser-compatible payload shape', () => {
    const parsed = parsePublicHolidayApiPayload(`
      <response>
        <header>
          <resultCode>00</resultCode>
          <resultMsg>NORMAL SERVICE.</resultMsg>
        </header>
        <body>
          <items>
            <item>
              <locdate>20261009</locdate>
              <dateName>한글날</dateName>
              <isHoliday>Y</isHoliday>
            </item>
          </items>
        </body>
      </response>
    `);

    expect(normalizePublicHolidayRows(parsed, NOW)[0]).toMatchObject({
      holiday_date: '2026-10-09',
      name: '한글날',
    });
  });

  it('builds the public holiday API URL for a JSON response', () => {
    const url = new URL(
      buildPublicHolidayApiUrl({
        serviceKey: 'service-key',
        year: 2026,
        month: 3,
        responseType: 'json',
      }),
    );

    expect(url.origin + url.pathname).toBe(
      'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo',
    );
    expect(url.searchParams.get('ServiceKey')).toBe('service-key');
    expect(url.searchParams.get('solYear')).toBe('2026');
    expect(url.searchParams.get('solMonth')).toBe('03');
    expect(url.searchParams.get('pageNo')).toBe('1');
    expect(url.searchParams.get('numOfRows')).toBe('100');
    expect(url.searchParams.get('_type')).toBe('json');
  });

  it('preserves an already-encoded data.go.kr service key', () => {
    const encodedKey = 'abc%2Bdef%3D';
    const rawUrl = buildPublicHolidayApiUrl({
      serviceKey: encodedKey,
      year: 2026,
      month: 1,
      responseType: 'json',
    });

    expect(rawUrl).toContain(`ServiceKey=${encodedKey}`);
    expect(rawUrl).not.toContain('ServiceKey=abc%252Bdef%253D');
  });

  it('encodes a raw data.go.kr service key once', () => {
    const rawUrl = buildPublicHolidayApiUrl({
      serviceKey: 'abc+def=',
      year: 2026,
      month: 1,
      responseType: 'json',
    });

    expect(rawUrl).toContain('ServiceKey=abc%2Bdef%3D');
  });
});

describe('public holiday operator sync', () => {
  it('resolves sync config from env with default years', () => {
    expect(
      resolvePublicHolidaySyncConfig({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        PUBLIC_DATA_SERVICE_KEY: 'public-data-key',
      }),
    ).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      serviceRoleKey: 'service-role-key',
      publicDataServiceKey: 'public-data-key',
      startYear: 2026,
      endYear: 2030,
    });
  });

  it('throws missing env var names without values', () => {
    expect(() =>
      resolvePublicHolidaySyncConfig({
        SUPABASE_URL: 'https://example.supabase.co',
        PUBLIC_DATA_SERVICE_KEY: 'public-data-key',
      }),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);

    expect(() =>
      resolvePublicHolidaySyncConfig({
        SUPABASE_URL: 'https://example.supabase.co',
        PUBLIC_DATA_SERVICE_KEY: 'public-data-key',
      }),
    ).not.toThrow(/example\.supabase\.co|public-data-key/);
  });

  it('throws on invalid year range', () => {
    expect(() =>
      resolvePublicHolidaySyncConfig({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        PUBLIC_DATA_SERVICE_KEY: 'public-data-key',
        PUBLIC_HOLIDAY_SYNC_START_YEAR: '2031',
        PUBLIC_HOLIDAY_SYNC_END_YEAR: '2030',
      }),
    ).toThrow(/invalid year range/i);
  });

  it('rejects non-four-digit year strings', () => {
    expect(() =>
      resolvePublicHolidaySyncConfig({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        PUBLIC_DATA_SERVICE_KEY: 'public-data-key',
        PUBLIC_HOLIDAY_SYNC_START_YEAR: '2026.0',
      }),
    ).toThrow(/four-digit year/i);
  });

  it('iterates each month from startYear through endYear and upserts normalized rows', async () => {
    const fetcher = vi.fn(async (url: string) => {
      const requestUrl = new URL(url);
      const year = requestUrl.searchParams.get('solYear');
      const month = requestUrl.searchParams.get('solMonth');
      return new Response(
        JSON.stringify(
          successPayload(
            year === '2026' && month === '01'
              ? { locdate: 20260101, dateName: '신정', isHoliday: 'Y' }
              : [],
          ),
        ),
        { headers: { 'content-type': 'application/json' } },
      );
    });
    const upsertRows = vi.fn(async () => {});

    const result = await syncPublicHolidays({
      config: {
        supabaseUrl: 'https://example.supabase.co',
        serviceRoleKey: 'service-role-key',
        publicDataServiceKey: 'public-data-key',
        startYear: 2026,
        endYear: 2027,
      },
      fetcher,
      upsertRows,
      now: NOW,
    });

    expect(fetcher).toHaveBeenCalledTimes(24);
    expect(upsertRows).toHaveBeenCalledTimes(1);
    expect(upsertRows).toHaveBeenCalledWith([
      expect.objectContaining({ holiday_date: '2026-01-01' }),
    ]);
    expect(result).toEqual({
      yearsProcessed: [2026, 2027],
      rowsFetched: 1,
      rowsUpserted: 1,
    });
  });

  it('falls back to XML parsing when the provider response is not JSON', async () => {
    const fetcher = vi.fn(async () => {
      return new Response(
        `<response>
          <header><resultCode>00</resultCode><resultMsg>NORMAL SERVICE.</resultMsg></header>
          <body><items><item><locdate>20260101</locdate><dateName>신정</dateName><isHoliday>Y</isHoliday></item></items></body>
        </response>`,
        { headers: { 'content-type': 'application/xml' } },
      );
    });
    const upsertRows = vi.fn(async () => {});

    await syncPublicHolidays({
      config: {
        supabaseUrl: 'https://example.supabase.co',
        serviceRoleKey: 'service-role-key',
        publicDataServiceKey: 'public-data-key',
        startYear: 2026,
        endYear: 2026,
      },
      fetcher,
      upsertRows,
      now: NOW,
    });

    expect(upsertRows).toHaveBeenCalledWith([
      expect.objectContaining({ holiday_date: '2026-01-01', name: '신정' }),
    ]);
  });

  it('upserts public holiday rows with the holiday_date conflict target', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    const rows = [
      {
        holiday_date: '2026-01-01',
        name: '신정',
        is_holiday: true,
        country_code: 'KR',
        source: 'data.go.kr:kasi-special-day',
        source_payload: {},
        synced_at: NOW,
        updated_at: NOW,
      },
    ] as const;

    await upsertPublicHolidayRows({ from }, [...rows]);

    expect(from).toHaveBeenCalledWith('public_holidays');
    expect(upsert).toHaveBeenCalledWith([...rows], { onConflict: 'holiday_date' });
  });
});
