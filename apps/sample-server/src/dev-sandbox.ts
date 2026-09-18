import { Router, type Request, type Response } from 'express';
import { createLogger } from '@mawsoftwares/sdk';

const log = createLogger('dev-sandbox');
const MAX_MESSAGES = 50;

export interface SandboxSmsMessage {
  readonly id: string;
  readonly to: string;
  readonly message: string;
  readonly receivedAt: string;
  readonly payload: unknown;
}

/**
 * In-process SMS catcher for local testing. Development-only — no vendor
 * account, no Docker. Point SMS Master `baseUrl` at this route.
 */
export function createDevSandboxRouter(): Router {
  const messages: SandboxSmsMessage[] = [];
  const router = Router();

  function capture(req: Request, res: Response): void {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const query = (req.query ?? {}) as Record<string, unknown>;
    const payload = Object.keys(body).length > 0 ? body : query;
    const entry: SandboxSmsMessage = {
      id: crypto.randomUUID(),
      to: String(payload.to ?? ''),
      message: String(payload.message ?? ''),
      receivedAt: new Date().toISOString(),
      payload,
    };
    messages.unshift(entry);
    if (messages.length > MAX_MESSAGES) messages.length = MAX_MESSAGES;
    log.info('Sandbox SMS captured', { id: entry.id, to: entry.to });
    res.status(200).json({ success: true, data: { id: entry.id } });
  }

  router.post('/', (req, res) => {
    capture(req, res);
  });
  router.get('/', (req, res) => {
    if (req.query.to !== undefined || req.query.message !== undefined) {
      capture(req, res);
      return;
    }
    res.json({ data: messages });
  });

  return router;
}
