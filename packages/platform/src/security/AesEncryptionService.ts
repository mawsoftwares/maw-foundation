import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import type { IEncryptionService } from '@mawsoftwares/sdk/contracts/IEncryptionService';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const VERSION = 'v1';

export class AesEncryptionService implements IEncryptionService {
  private readonly defaultKey: Buffer;

  constructor(defaultKeyHex: string) {
    const buf = Buffer.from(defaultKeyHex, 'hex');
    if (buf.length !== KEY_LENGTH) {
      throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars)`);
    }
    this.defaultKey = buf;
  }

  async encrypt(plaintext: string, keyHex?: string): Promise<string> {
    const key = keyHex ? Buffer.from(keyHex, 'hex') : this.defaultKey;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${VERSION}:${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
  }

  async decrypt(ciphertext: string, keyHex?: string): Promise<string> {
    const key = keyHex ? Buffer.from(keyHex, 'hex') : this.defaultKey;
    const parts = ciphertext.split(':');

    if (parts.length !== 4 || parts[0] !== VERSION) {
      throw new Error('Invalid ciphertext format');
    }

    const iv = Buffer.from(parts[1]!, 'hex');
    const encrypted = Buffer.from(parts[2]!, 'hex');
    const tag = Buffer.from(parts[3]!, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  async generateKey(): Promise<string> {
    return randomBytes(KEY_LENGTH).toString('hex');
  }
}
