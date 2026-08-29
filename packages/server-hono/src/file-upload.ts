import type { Context, MiddlewareHandler } from 'hono';
import type { IFileStorage, StoredFile, UploadRequest } from '@mawsoftwares/sdk/contracts/IFileStorage';
import { sanitizeFilename, getMimeType } from '@mawsoftwares/sdk/kernel/file';

export interface HonoFileUploadOptions {
  readonly storage: IFileStorage;
  readonly maxSize?: number;
  readonly allowedTypes?: string[];
  readonly keyPrefix?: string;
  readonly generateKey?: (file: { originalName: string; mimeType: string }) => string;
}

function defaultKeyGenerator(prefix: string, originalName: string): string {
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const safe = sanitizeFilename(originalName);
  return prefix ? `${prefix}/${timestamp}-${rand}-${safe}` : `${timestamp}-${rand}-${safe}`;
}

export function createHonoFileUploadHandler(options: HonoFileUploadOptions): MiddlewareHandler {
  const maxSize = options.maxSize ?? 10 * 1024 * 1024;
  const prefix = options.keyPrefix ?? 'uploads';

  return async (c, next) => {
    const contentType = c.req.header('Content-Type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      await next();
      return;
    }

    const body = await c.req.parseBody({ all: true });
    const entries = Object.values(body).flat();
    const files = entries.filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
      return c.json({ error: 'No files provided' }, 400);
    }

    const results: StoredFile[] = [];

    for (const file of files) {
      if (file.size > maxSize) {
        return c.json(
          { error: `File too large: ${file.name} (${file.size} bytes, max ${maxSize})` },
          413,
        );
      }

      const mimeType = file.type || getMimeType(file.name);

      if (options.allowedTypes && options.allowedTypes.length > 0) {
        const allowed = options.allowedTypes.some((t) => {
          if (t.endsWith('/*')) return mimeType.startsWith(t.slice(0, -1));
          return mimeType === t;
        });
        if (!allowed) {
          return c.json({ error: `File type not allowed: ${mimeType}` }, 415);
        }
      }

      const key = options.generateKey
        ? options.generateKey({ originalName: file.name, mimeType })
        : defaultKeyGenerator(prefix, file.name);

      const uploadReq: UploadRequest = {
        key,
        mimeType,
        size: file.size,
        originalName: file.name,
      };

      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await options.storage.put(key, buffer, uploadReq);
      results.push(stored);
    }

    c.set('uploadedFiles', results);
    await next();
  };
}

export function createHonoFileRoutes(storage: IFileStorage, opts?: { keyPrefix?: string }) {
  const prefix = opts?.keyPrefix ?? 'uploads';

  return {
    list: async (c: Context) => {
      try {
        const result = await storage.list({ prefix });
        return c.json(result);
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'List failed' }, 500);
      }
    },

    getUrl: async (c: Context) => {
      const key = c.req.param('key');
      if (!key) return c.json({ error: 'Missing key parameter' }, 400);
      try {
        const url = await storage.getUrl(key);
        return c.json({ url });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Failed to get URL' }, 500);
      }
    },

    deleteFile: async (c: Context) => {
      const key = c.req.param('key');
      if (!key) return c.json({ error: 'Missing key parameter' }, 400);
      try {
        await storage.delete(key);
        return c.json({ deleted: true, key });
      } catch (err) {
        return c.json({ error: err instanceof Error ? err.message : 'Delete failed' }, 500);
      }
    },
  };
}
