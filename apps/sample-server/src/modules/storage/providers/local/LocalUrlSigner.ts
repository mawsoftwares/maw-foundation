import { createHmac, timingSafeEqual } from 'node:crypto';

export type LocalTransferOperation = 'put' | 'get';

export interface LocalTransferClaims {
  readonly tenantId: string;
  readonly configId: string;
  readonly key: string;
  readonly op: LocalTransferOperation;
  /** Expiry, epoch seconds. */
  readonly exp: number;
  readonly contentType: string;
  readonly contentLength?: number;
  readonly fileName?: string;
  readonly disposition?: 'attachment' | 'inline';
}

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

/** Stateless HMAC-SHA256 tokens that authorise a single upload/download against the local gateway. */
export class LocalUrlSigner {
  constructor(private readonly secret: string) {
    if (secret.length < 16) throw new Error('Local storage signing secret must be at least 16 characters');
  }

  sign(claims: LocalTransferClaims): string {
    const body = b64url(Buffer.from(JSON.stringify(claims), 'utf8'));
    return `${body}.${this.mac(body)}`;
  }

  /** Returns the claims, or `null` when the token is malformed, tampered with or expired. */
  verify(token: string, now: Date = new Date()): LocalTransferClaims | null {
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra !== undefined) return null;
    const expected = Buffer.from(this.mac(body));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    try {
      const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as LocalTransferClaims;
      if (typeof claims.exp !== 'number' || claims.exp * 1000 < now.getTime()) return null;
      if (claims.op !== 'put' && claims.op !== 'get') return null;
      return claims;
    } catch {
      return null;
    }
  }

  private mac(body: string): string {
    return b64url(createHmac('sha256', this.secret).update(body).digest());
  }
}
