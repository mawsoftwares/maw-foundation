import { describe, it, expect } from 'vitest';
import { MemoryRateLimiter } from '@mawsoftwares/platform/security/MemoryRateLimiter';
import { createRateLimitMiddleware } from './rate-limit';
import type { Request, Response } from 'express';

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) {
      res.headers[name] = value;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res.body = body;
      return res;
    },
  };
  return res;
}

function mockReq(path: string, ip: string, headers: Record<string, string> = {}) {
  return { method: 'POST', path, ip, headers } as unknown as Request;
}

async function hit(
  mw: ReturnType<typeof createRateLimitMiddleware>,
  path: string,
  ip: string,
  headers: Record<string, string> = {},
) {
  const res = mockRes();
  let passed = false;
  await mw(mockReq(path, ip, headers), res as unknown as Response, () => {
    passed = true;
  });
  return { res, passed };
}

describe('createRateLimitMiddleware', () => {
  const tiers = [
    { prefix: '/auth/login', config: { windowMs: 60_000, maxRequests: 2 } },
    { prefix: '/auth/', config: { windowMs: 60_000, maxRequests: 3 } },
  ];

  function build() {
    return createRateLimitMiddleware({ limiter: new MemoryRateLimiter(0), tiers });
  }

  it('returns the standard error envelope with retryAfterMs in details', async () => {
    const mw = build();
    await hit(mw, '/auth/login', '1.1.1.1');
    await hit(mw, '/auth/login', '1.1.1.1');
    const { res, passed } = await hit(mw, '/auth/login', '1.1.1.1', { 'x-request-id': 'req-9' });

    expect(passed).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBeGreaterThan(0);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'RATE_LIMITED', details: { retryAfterMs: expect.any(Number) } },
    });
  });

  it('ignores a spoofed X-Forwarded-For header and keys on req.ip', async () => {
    const mw = build();
    await hit(mw, '/auth/login', '2.2.2.2', { 'x-forwarded-for': 'a' });
    await hit(mw, '/auth/login', '2.2.2.2', { 'x-forwarded-for': 'b' });
    const { res } = await hit(mw, '/auth/login', '2.2.2.2', { 'x-forwarded-for': 'c' });

    expect(res.statusCode).toBe(429);
  });

  it('limits other /auth/ endpoints with their own tier, separate from login', async () => {
    const mw = build();
    for (let i = 0; i < 3; i++) {
      expect((await hit(mw, '/auth/forgot-password', '3.3.3.3')).passed).toBe(true);
    }
    expect((await hit(mw, '/auth/forgot-password', '3.3.3.3')).res.statusCode).toBe(429);
    expect((await hit(mw, '/auth/login', '3.3.3.3')).passed).toBe(true);
  });

  it('tracks different client IPs independently', async () => {
    const mw = build();
    await hit(mw, '/auth/login', '4.4.4.4');
    await hit(mw, '/auth/login', '4.4.4.4');
    expect((await hit(mw, '/auth/login', '4.4.4.4')).res.statusCode).toBe(429);
    expect((await hit(mw, '/auth/login', '5.5.5.5')).passed).toBe(true);
  });
});
