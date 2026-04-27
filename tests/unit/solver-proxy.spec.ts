import { describe, expect, it } from 'vitest';
import { buildCloudRunApiUrl, createForwardHeaders } from '../../api/solver-proxy.js';

describe('solver vercel proxy', () => {
  it('maps same-origin api paths to cloud run api paths', () => {
    expect(buildCloudRunApiUrl('/api/solve')).toBe(
      'https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/solve',
    );
    expect(buildCloudRunApiUrl('/api/status/exec-1?include=result')).toBe(
      'https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/status/exec-1?include=result',
    );
    expect(buildCloudRunApiUrl('/api/[...path]', ['status', 'exec-1'])).toBe(
      'https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/status/exec-1',
    );
  });

  it('does not forward browser origin headers to cloud run', () => {
    const headers = createForwardHeaders({
      origin: 'https://every-shift-mvp.vercel.app',
      referer: 'https://every-shift-mvp.vercel.app/app/schedules/1',
      host: 'every-shift-mvp.vercel.app',
      'content-type': 'application/json',
      authorization: 'Bearer token',
    });

    expect(headers.has('origin')).toBe(false);
    expect(headers.has('referer')).toBe(false);
    expect(headers.has('host')).toBe(false);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('authorization')).toBe('Bearer token');
  });
});
