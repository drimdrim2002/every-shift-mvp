import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface VercelRewrite {
  source: string;
  destination: string;
}

interface VercelConfig {
  rewrites?: VercelRewrite[];
}

function readVercelConfig(): VercelConfig {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as VercelConfig;
}

describe('vercel routing contract', () => {
  it('proxies solver api requests before the spa fallback rewrite', () => {
    const config = readVercelConfig();

    expect(config.rewrites?.[0]).toEqual({
      source: '/api/:path*',
      destination: 'https://every-shift-api-service-554455861916.asia-northeast3.run.app/api/:path*',
    });
    expect(config.rewrites?.[1]).toEqual({
      source: '/(.*)',
      destination: '/index.html',
    });
  });
});
