import { describe, it, expect } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'node:net';
import type { MawModule } from './contract';
import { EnvironmentError, parseModuleList } from './env';
import { listenWithGracefulShutdown, resolveModuleSelection } from './serve';

const m = (key: string): MawModule => ({ definition: { key, name: key, version: '1.0.0', routePrefix: `/api/${key}` } });

describe('parseModuleList', () => {
  it('trims and drops empty entries', () => {
    expect(parseModuleList(' a, b ,,c ')).toEqual(['a', 'b', 'c']);
    expect(parseModuleList(undefined)).toEqual([]);
  });
});

describe('resolveModuleSelection', () => {
  it('returns the enabled set', () => {
    expect([...(resolveModuleSelection([m('a'), m('b')], ['b']).enabled ?? [])]).toEqual(['a']);
  });

  it('refuses unknown keys', () => {
    expect(() => resolveModuleSelection([m('a')], ['nope'])).toThrow(EnvironmentError);
  });
});

describe('listenWithGracefulShutdown', () => {
  it('listens, closes idempotently and runs shutdown once', async () => {
    let shutdowns = 0;
    const app = express();
    app.get('/ping', (_req, res) => { res.json({ ok: true }); });
    const running = listenWithGracefulShutdown(
      { app, port: 0, shutdown: async () => { shutdowns += 1; } },
      { host: '127.0.0.1', handleSignals: false },
    );
    await new Promise<void>((resolve) => running.server.once('listening', () => resolve()));
    const { port } = running.server.address() as AddressInfo;
    expect((await fetch(`http://127.0.0.1:${port}/ping`)).status).toBe(200);
    const before = process.listenerCount('SIGTERM');
    await Promise.all([running.close(), running.close()]);
    expect(shutdowns).toBe(1);
    expect(running.server.listening).toBe(false);
    expect(process.listenerCount('SIGTERM')).toBe(before);
  });
});
