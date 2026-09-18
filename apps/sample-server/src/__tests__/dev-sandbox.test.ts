import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createDevSandboxRouter } from '../dev-sandbox';

describe('dev SMS sandbox', () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  async function listen(): Promise<string> {
    const app = express();
    app.use(express.json());
    app.use('/sms-sandbox', createDevSandboxRouter());
    const server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    close = () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}/sms-sandbox`;
  }

  it('captures a JSON POST and lists it', async () => {
    const base = await listen();
    const sent = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: '+15551234567', message: 'Your code is 123456' }),
    });
    expect(sent.ok).toBe(true);
    const listed = await fetch(base);
    const body = (await listed.json()) as { data: Array<{ to: string; message: string }> };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.to).toBe('+15551234567');
    expect(body.data[0]?.message).toBe('Your code is 123456');
  });
});
