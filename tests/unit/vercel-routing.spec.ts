import { existsSync, readFileSync } from 'node:fs';
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
  it('serves solver api requests through the vercel function proxy', () => {
    expect(existsSync(resolve(process.cwd(), 'api/[...path].js'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'api/solver-proxy.js'))).toBe(true);

    const config = readVercelConfig();

    expect(config.rewrites?.[0]).toEqual({
      source: '/api/:path*',
      destination: '/api/[...path]',
    });
  });

  it('keeps the spa fallback rewrite for non-api routes', () => {
    const config = readVercelConfig();

    expect(config.rewrites?.[1]).toEqual({
      source: '/(.*)',
      destination: '/index.html',
    });
  });
});
