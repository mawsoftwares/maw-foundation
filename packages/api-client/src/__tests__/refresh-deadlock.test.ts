import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { ISecureStore } from '@mawsoftwares/sdk/contracts/ISecureStore';
import { ApiClient } from '../index';

function base64url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeToken(payload: Record<string, unknown>): string {
  const header = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function memoryStore(init: Record<string, string> = {}): ISecureStore {
  const map = new Map(Object.entries(init));
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async set(key, value) {
      map.set(key, value);
    },
    async remove(key) {
      map.delete(key);
    },
  };
}

function listen(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<{ server: Server; url: string }> {
  const server = createServer(handler);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe('proactive refresh deadlock', () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
  });

  it('refreshes a single time when the stored access token is already expired', async () => {
    let refreshCalls = 0;
    let meCalls = 0;
    const freshAccess = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });

    const started = await listen((req, res) => {
      if (req.method === 'POST' && req.url === '/auth/refresh') {
        refreshCalls += 1;
        if (refreshCalls > 3) {
          res.writeHead(500, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'refresh loop' }));
          return;
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          tokens: { accessToken: freshAccess, refreshToken: 'refresh-2' },
          session: { userId: 'u1', tenantId: 't1', role: 'admin', entitlements: [] },
        }));
        return;
      }
      if (req.method === 'GET' && req.url === '/me') {
        meCalls += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ userId: 'u1', tenantId: 't1', role: 'admin' }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server = started.server;

    const expiredAccess = makeToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
    const client = new ApiClient({
      baseUrl: started.url,
      store: memoryStore({
        'maw:auth:accessToken': expiredAccess,
        'maw:auth:refreshToken': 'refresh-1',
      }),
      mode: 'token',
      timeout: 3_000,
    });

    const me = await client.request<{ userId: string }>('/me');

    expect(me.userId).toBe('u1');
    expect(refreshCalls).toBe(1);
    expect(meCalls).toBe(1);
  });
});
