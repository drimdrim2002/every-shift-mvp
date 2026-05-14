import { XMLParser } from 'fast-xml-parser';

const PUBLIC_HOLIDAY_API_ENDPOINT =
  'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo';
const SOURCE = 'data.go.kr:kasi-special-day';

export interface PublicHolidayApiItem {
  locdate?: string | number;
  dateName?: string;
  isHoliday?: string | boolean;
  [key: string]: unknown;
}

export interface PublicHolidayUpsertRow {
  holiday_date: string;
  name: string;
  is_holiday: true;
  country_code: 'KR';
  source: 'data.go.kr:kasi-special-day';
  source_payload: Record<string, unknown>;
  synced_at: string;
  updated_at: string;
}

export function buildPublicHolidayApiUrl(input: {
  serviceKey: string;
  year: number;
  month: number;
  responseType?: 'json';
}): string {
  const url = new URL(PUBLIC_HOLIDAY_API_ENDPOINT);

  url.searchParams.set('solYear', String(input.year));
  url.searchParams.set('solMonth', String(input.month).padStart(2, '0'));
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '100');

  if (input.responseType === 'json') {
    url.searchParams.set('_type', 'json');
  }

  const serviceKey = normalizeServiceKey(input.serviceKey);

  return `${url.origin}${url.pathname}?ServiceKey=${serviceKey}&${url.searchParams.toString()}`;
}

export function parsePublicHolidayApiPayload(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      trimValues: true,
    });

    return parser.parse(raw);
  }
}

export function normalizePublicHolidayRows(payload: unknown, now = new Date().toISOString()): PublicHolidayUpsertRow[] {
  assertProviderSuccess(payload);

  const dedupedRows = new Map<string, PublicHolidayUpsertRow>();

  for (const item of extractItems(payload)) {
    if (!isHoliday(item)) {
      continue;
    }

    const holidayDate = formatLocdate(item.locdate);
    dedupedRows.set(holidayDate, {
      holiday_date: holidayDate,
      name: typeof item.dateName === 'string' ? item.dateName : '',
      is_holiday: true,
      country_code: 'KR',
      source: SOURCE,
      source_payload: { ...item },
      synced_at: now,
      updated_at: now,
    });
  }

  return Array.from(dedupedRows.values());
}

function assertProviderSuccess(payload: unknown): void {
  assertNoOpenApiError(payload);

  const response = getPath(payload, ['response']);
  if (!isRecord(response)) {
    throw new Error('data.go.kr public holiday provider returned an invalid response payload');
  }

  const header = getPath(payload, ['response', 'header']);
  if (!isRecord(header) || header.resultCode == null) {
    throw new Error('data.go.kr public holiday provider returned a response without resultCode');
  }

  const resultCode = String(header.resultCode);
  if (resultCode === '00' || resultCode === '0') {
    return;
  }

  const resultMsg = header.resultMsg == null ? 'Unknown provider error' : String(header.resultMsg);
  throw new Error(`data.go.kr public holiday provider failed: resultCode=${resultCode}, resultMsg=${resultMsg}`);
}

function assertNoOpenApiError(payload: unknown): void {
  const errorHeader = getPath(payload, ['OpenAPI_ServiceResponse', 'cmmMsgHeader']);
  if (!isRecord(errorHeader)) {
    return;
  }

  const returnAuthMsg = errorHeader.returnAuthMsg == null ? '' : String(errorHeader.returnAuthMsg);
  const errMsg = errorHeader.errMsg == null ? '' : String(errorHeader.errMsg);
  const reasonCode = errorHeader.returnReasonCode == null ? '' : String(errorHeader.returnReasonCode);
  const details = [errMsg, returnAuthMsg, reasonCode].filter(Boolean).join(', ');

  throw new Error(`data.go.kr public holiday provider failed: ${details || 'OpenAPI error response'}`);
}

function extractItems(payload: unknown): PublicHolidayApiItem[] {
  const bodyItems = getPath(payload, ['response', 'body', 'items']);
  const item = isRecord(bodyItems) ? bodyItems.item : undefined;

  if (bodyItems === '' || bodyItems == null || item == null) {
    return [];
  }

  if (Array.isArray(item)) {
    if (!item.every(isRecord)) {
      throw new Error('data.go.kr public holiday provider returned malformed item rows');
    }

    return item as PublicHolidayApiItem[];
  }

  if (!isRecord(item)) {
    throw new Error('data.go.kr public holiday provider returned malformed item rows');
  }

  return [item as PublicHolidayApiItem];
}

function formatLocdate(locdate: PublicHolidayApiItem['locdate']): string {
  const raw = String(locdate ?? '');
  if (!/^\d{8}$/.test(raw)) {
    throw new Error(`Invalid locdate from data.go.kr public holiday provider: ${raw}`);
  }

  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid locdate from data.go.kr public holiday provider: ${raw}`);
  }

  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function isHoliday(item: PublicHolidayApiItem): boolean {
  return item.isHoliday === 'Y' || item.isHoliday === true;
}

function normalizeServiceKey(value: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

function getPath(value: unknown, path: string[]): unknown {
  let cursor = value;

  for (const key of path) {
    if (!isRecord(cursor)) {
      return undefined;
    }
    cursor = cursor[key];
  }

  return cursor;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
