import { createClient } from '@supabase/supabase-js';
import { pathToFileURL } from 'node:url';

import {
  buildPublicHolidayApiUrl,
  normalizePublicHolidayRows,
  parsePublicHolidayApiPayload,
  type PublicHolidayUpsertRow,
} from './publicHolidaySync';

interface PublicHolidaySupabaseClient {
  from(table: 'public_holidays'): {
    upsert(
      rows: PublicHolidayUpsertRow[],
      options: { onConflict: 'holiday_date' }
    ): PromiseLike<{ error: Error | null }>;
  };
}

export function resolvePublicHolidaySyncConfig(env: NodeJS.ProcessEnv): {
  supabaseUrl: string;
  serviceRoleKey: string;
  publicDataServiceKey: string;
  startYear: number;
  endYear: number;
} {
  const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PUBLIC_DATA_SERVICE_KEY'] as const;
  const missing = requiredEnv.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const startYear = parseYear(env.PUBLIC_HOLIDAY_SYNC_START_YEAR, 'PUBLIC_HOLIDAY_SYNC_START_YEAR', 2026);
  const endYear = parseYear(env.PUBLIC_HOLIDAY_SYNC_END_YEAR, 'PUBLIC_HOLIDAY_SYNC_END_YEAR', 2030);

  if (startYear > endYear) {
    throw new Error(`Invalid year range: startYear (${startYear}) must be <= endYear (${endYear})`);
  }

  return {
    supabaseUrl: env.SUPABASE_URL!,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!,
    publicDataServiceKey: env.PUBLIC_DATA_SERVICE_KEY!,
    startYear,
    endYear,
  };
}

export async function syncPublicHolidays(input: {
  config: ReturnType<typeof resolvePublicHolidaySyncConfig>;
  fetcher: typeof fetch;
  upsertRows: (rows: PublicHolidayUpsertRow[]) => Promise<void>;
  now?: string;
}): Promise<{ yearsProcessed: number[]; rowsFetched: number; rowsUpserted: number }> {
  const yearsProcessed = buildYearRange(input.config.startYear, input.config.endYear);
  let rowsFetched = 0;
  let rowsUpserted = 0;

  for (const year of yearsProcessed) {
    for (let month = 1; month <= 12; month += 1) {
      const url = buildPublicHolidayApiUrl({
        serviceKey: input.config.publicDataServiceKey,
        year,
        month,
        responseType: 'json',
      });
      const response = await input.fetcher(url);

      if (!response.ok) {
        throw new Error(`Public holiday provider HTTP error: ${response.status} ${response.statusText}`);
      }

      const payload = parsePublicHolidayApiPayload(await response.text());
      const rows = normalizePublicHolidayRows(payload, input.now);

      rowsFetched += rows.length;

      if (rows.length === 0) {
        continue;
      }

      await input.upsertRows(rows);
      rowsUpserted += rows.length;
    }
  }

  return {
    yearsProcessed,
    rowsFetched,
    rowsUpserted,
  };
}

function parseYear(value: string | undefined, envName: string, fallback: number): number {
  if (value == null || value === '') {
    return fallback;
  }

  if (!/^\d{4}$/.test(value)) {
    throw new Error(`Invalid ${envName}: expected a four-digit year`);
  }

  const year = Number(value);
  if (year < 1900 || year > 9999) {
    throw new Error(`Invalid ${envName}: expected a four-digit year`);
  }

  return year;
}

function buildYearRange(startYear: number, endYear: number): number[] {
  const years: number[] = [];
  for (let year = startYear; year <= endYear; year += 1) {
    years.push(year);
  }
  return years;
}

export async function upsertPublicHolidayRows(
  supabase: PublicHolidaySupabaseClient,
  rows: PublicHolidayUpsertRow[]
): Promise<void> {
  const { error } = await supabase.from('public_holidays').upsert(rows, {
    onConflict: 'holiday_date',
  });

  if (error) {
    throw error;
  }
}

async function runCli(): Promise<void> {
  const config = resolvePublicHolidaySyncConfig(process.env);
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const result = await syncPublicHolidays({
    config,
    fetcher: fetch,
    upsertRows: (rows) => upsertPublicHolidayRows(supabase as PublicHolidaySupabaseClient, rows),
  });

  console.log(
    `Public holiday sync complete: years=${result.yearsProcessed.join(',')}, rowsFetched=${result.rowsFetched}, rowsUpserted=${result.rowsUpserted}`,
  );
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : undefined;

if (invokedPath === import.meta.url) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Public holiday sync failed: ${message}`);
    process.exitCode = 1;
  });
}
