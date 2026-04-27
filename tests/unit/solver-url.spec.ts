import { describe, expect, it } from 'vitest';
import { buildSolverApiUrl, resolveApiBaseUrl } from '@/api/solver';

describe('solver url resolution', () => {
  it('uses configured absolute base url in development mode when provided', () => {
    const env = {
      DEV: true,
      VITE_API_BASE_URL: 'https://every-shift-api-service-554455861916.asia-northeast3.run.app',
    };

    expect(resolveApiBaseUrl(env)).toBe('https://every-shift-api-service-554455861916.asia-northeast3.run.app');
    expect(buildSolverApiUrl('/api/solve', env)).toBe(
      'https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/solve',
    );
  });

  it('falls back to vite proxy path in development mode when base url is empty', () => {
    const env = {
      DEV: true,
      VITE_API_BASE_URL: '',
    };

    expect(resolveApiBaseUrl(env)).toBe('');
    expect(buildSolverApiUrl('/api/solve', env)).toBe('/api/solve');
  });

  it('uses same-origin api path in production mode even when a base url is configured', () => {
    const env = {
      DEV: false,
      VITE_API_BASE_URL: 'https://every-shift-api-service-554455861916.asia-northeast3.run.app',
    };

    expect(resolveApiBaseUrl(env)).toBe('');
    expect(buildSolverApiUrl('/api/solve', env)).toBe('/api/solve');
  });

  it('normalizes trailing slash in development base url', () => {
    const env = {
      DEV: true,
      VITE_API_BASE_URL: 'https://example.com/',
    };

    expect(resolveApiBaseUrl(env)).toBe('https://example.com');
    expect(buildSolverApiUrl('/api/status/abc', env)).toBe('https://example.com/api/status/abc');
  });
});
