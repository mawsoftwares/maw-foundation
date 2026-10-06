import { Router, type Request, type Response } from 'express';
import { createLogger } from '@mawsoftwares/sdk';
import { LocalStorageProvider, PayloadTooLargeError } from './LocalStorageProvider';
import type { LocalUrlSigner } from './LocalUrlSigner';

const log = createLogger('storage:local-gateway');

export interface LocalObjectGatewayDeps {
  readonly signer: LocalUrlSigner;
  /** Resolves the tenant's provider; must return `null` unless it is an active local provider. */
  readonly resolveProvider: (tenantId: string, configId: string) => Promise<LocalStorageProvider | null>;
}

function mediaType(value: string | undefined): string {
  return (value ?? '').split(';')[0]!.trim().toLowerCase();
}

function contentDisposition(kind: 'attachment' | 'inline', fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * Signed `PUT`/`GET` endpoints that stand in for a bucket's presigned URLs when the
 * tenant uses local disk. Authorisation is the HMAC token (issued only after the normal
 * authenticated, tenant-checked flow), so these routes carry no bearer auth.
 */
export function createLocalObjectRouter({ signer, resolveProvider }: LocalObjectGatewayDeps): Router {
  const router = Router();

  router.put('/:token', (req: Request, res: Response) => {
    void handlePut(req, res);
  });
  router.get('/:token', (req: Request, res: Response) => {
    void handleGet(req, res);
  });

  async function handlePut(req: Request, res: Response): Promise<void> {
    try {
      const claims = signer.verify(String(req.params['token']));
      if (!claims || claims.op !== 'put') return void res.status(403).json({ error: 'Invalid or expired upload URL' });

      if (mediaType(req.headers['content-type']) !== mediaType(claims.contentType)) {
        return void res.status(400).json({ error: 'Content-Type does not match the upload request' });
      }
      const declared = claims.contentLength ?? 0;
      const header = req.headers['content-length'];
      if (header !== undefined && Number(header) !== declared) {
        return void res.status(400).json({ error: 'Content-Length does not match the upload request' });
      }

      const provider = await resolveProvider(claims.tenantId, claims.configId);
      if (!provider) return void res.status(404).json({ error: 'Storage configuration unavailable' });

      await provider.writeStream(claims.key, req, declared);
      res.status(200).end();
    } catch (err) {
      if (err instanceof PayloadTooLargeError) return void res.status(413).json({ error: 'Payload exceeds declared size' });
      log.error('Local upload failed');
      if (!res.headersSent) res.status(500).json({ error: 'Upload failed' });
    }
  }

  async function handleGet(req: Request, res: Response): Promise<void> {
    try {
      const claims = signer.verify(String(req.params['token']));
      if (!claims || claims.op !== 'get') return void res.status(403).json({ error: 'Invalid or expired download URL' });

      const provider = await resolveProvider(claims.tenantId, claims.configId);
      if (!provider) return void res.status(404).json({ error: 'Storage configuration unavailable' });

      const { stream, size } = await provider.openReadStream(claims.key);
      res.status(200);
      res.setHeader('Content-Type', claims.contentType);
      res.setHeader('Content-Length', String(size));
      res.setHeader('Content-Disposition', contentDisposition(claims.disposition ?? 'attachment', claims.fileName ?? 'download'));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-store');
      stream.on('error', () => res.destroy());
      stream.pipe(res);
    } catch (err) {
      const status = err instanceof Error && err.name === 'StorageError' && 'statusCode' in err ? Number((err as { statusCode: number }).statusCode) : 500;
      if (!res.headersSent) res.status(status).json({ error: status === 404 ? 'Object not found' : 'Download failed' });
    }
  }

  return router;
}
