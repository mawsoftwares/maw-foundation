import { createHmac, randomBytes } from 'node:crypto';
import type { OtpConfig } from '@mawsoftwares/sdk/security/SecurityConfig';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTotp(secret: Buffer, counter: bigint, digits: number): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const hmac = createHmac('sha1', secret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, '0');
}

export class OtpService {
  private readonly config: OtpConfig;

  constructor(config: OtpConfig) {
    this.config = config;
  }

  generateSecret(accountName: string): { secret: string; otpauthUri: string } {
    const raw = randomBytes(20);
    const secret = base32Encode(raw);
    const params = new URLSearchParams({
      secret,
      issuer: this.config.issuer,
      algorithm: 'SHA1',
      digits: String(this.config.digits),
      period: String(this.config.stepSeconds),
    });
    const otpauthUri = `otpauth://totp/${encodeURIComponent(this.config.issuer)}:${encodeURIComponent(accountName)}?${params.toString()}`;
    return { secret, otpauthUri };
  }

  /** The code an authenticator app shows for this secret right now. */
  generate(secret: string, atMs: number = Date.now()): string {
    return generateTotp(base32Decode(secret), this.counterAt(atMs), this.config.digits);
  }

  verify(secret: string, token: string): boolean {
    const key = base32Decode(secret);
    const counter = this.counterAt(Date.now());

    for (let i = -this.config.window; i <= this.config.window; i++) {
      const candidate = generateTotp(key, counter + BigInt(i), this.config.digits);
      if (timingSafeEqual(candidate, token)) return true;
    }
    return false;
  }

  private counterAt(atMs: number): bigint {
    return BigInt(Math.floor(atMs / 1000)) / BigInt(this.config.stepSeconds);
  }

  generateBackupCodes(count = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(randomBytes(4).toString('hex'));
    }
    return codes;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export interface IOtpSecretStore {
  saveSecret(userId: string, encryptedSecret: string): Promise<void>;
  getSecret(userId: string): Promise<string | null>;
  saveBackupCodes(userId: string, codeHashes: readonly string[]): Promise<void>;
  getBackupCodes(userId: string): Promise<readonly string[]>;
  useBackupCode(userId: string, codeHash: string): Promise<boolean>;
  deleteAll(userId: string): Promise<void>;
}

export class MemoryOtpSecretStore implements IOtpSecretStore {
  private readonly secrets = new Map<string, string>();
  private readonly backupCodes = new Map<string, string[]>();

  async saveSecret(userId: string, encryptedSecret: string): Promise<void> {
    this.secrets.set(userId, encryptedSecret);
  }

  async getSecret(userId: string): Promise<string | null> {
    return this.secrets.get(userId) ?? null;
  }

  async saveBackupCodes(userId: string, codeHashes: readonly string[]): Promise<void> {
    this.backupCodes.set(userId, [...codeHashes]);
  }

  async getBackupCodes(userId: string): Promise<readonly string[]> {
    return this.backupCodes.get(userId) ?? [];
  }

  async useBackupCode(userId: string, codeHash: string): Promise<boolean> {
    const codes = this.backupCodes.get(userId);
    if (!codes) return false;
    const idx = codes.indexOf(codeHash);
    if (idx === -1) return false;
    codes.splice(idx, 1);
    return true;
  }

  async deleteAll(userId: string): Promise<void> {
    this.secrets.delete(userId);
    this.backupCodes.delete(userId);
  }
}

export interface MfaServiceOptions {
  readonly otpService: OtpService;
  readonly store: IOtpSecretStore;
  readonly encryptionService: { encrypt(plaintext: string): Promise<string>; decrypt(ciphertext: string): Promise<string> };
  readonly userRepository: { updateMfaEnabled(userId: string, enabled: boolean): Promise<void> };
  readonly hasher: { hash(value: string): Promise<string>; verify(value: string, hash: string): Promise<boolean> };
}

export class MfaService {
  private readonly otpService: OtpService;
  private readonly store: IOtpSecretStore;
  private readonly encryptionService: MfaServiceOptions['encryptionService'];
  private readonly userRepository: MfaServiceOptions['userRepository'];
  private readonly hasher: MfaServiceOptions['hasher'];

  constructor(options: MfaServiceOptions) {
    this.otpService = options.otpService;
    this.store = options.store;
    this.encryptionService = options.encryptionService;
    this.userRepository = options.userRepository;
    this.hasher = options.hasher;
  }

  async enroll(userId: string, accountName: string): Promise<{ secret: string; otpauthUri: string; backupCodes: readonly string[] }> {
    const { secret, otpauthUri } = this.otpService.generateSecret(accountName);
    const encryptedSecret = await this.encryptionService.encrypt(secret);
    await this.store.saveSecret(userId, encryptedSecret);

    const backupCodes = this.otpService.generateBackupCodes();
    const codeHashes = await Promise.all(backupCodes.map((c) => this.hasher.hash(c)));
    await this.store.saveBackupCodes(userId, codeHashes);

    return { secret, otpauthUri, backupCodes };
  }

  async activate(userId: string, token: string): Promise<void> {
    const encryptedSecret = await this.store.getSecret(userId);
    if (!encryptedSecret) throw new Error('MFA enrollment not found');
    const secret = await this.encryptionService.decrypt(encryptedSecret);
    if (!this.otpService.verify(secret, token)) {
      throw new Error('Invalid verification code');
    }
    await this.userRepository.updateMfaEnabled(userId, true);
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const encryptedSecret = await this.store.getSecret(userId);
    if (!encryptedSecret) return false;
    const secret = await this.encryptionService.decrypt(encryptedSecret);

    if (this.otpService.verify(secret, token)) return true;

    // Backup codes are salted hashes, so they must be matched by verify, not by
    // re-hashing the candidate — a fresh hash would never equal the stored one.
    for (const storedHash of await this.store.getBackupCodes(userId)) {
      if (await this.hasher.verify(token, storedHash)) {
        return this.store.useBackupCode(userId, storedHash);
      }
    }
    return false;
  }

  async disable(userId: string, token: string): Promise<void> {
    const valid = await this.verify(userId, token);
    if (!valid) throw new Error('Invalid verification code');
    await this.store.deleteAll(userId);
    await this.userRepository.updateMfaEnabled(userId, false);
  }
}
