import type { IEncryptionService } from '@mawsoftwares/sdk/contracts/IEncryptionService';
import { storageErrors } from '../core/storage.errors';
import type { StorageCredentials } from '../types/storage.types';

/** Encrypts provider credentials at rest. Plaintext exists only inside these two methods' callers. */
export class StorageCredentialCipher {
  constructor(private readonly encryption: IEncryptionService) {}

  async encrypt(credentials: StorageCredentials): Promise<string> {
    return this.encryption.encrypt(JSON.stringify({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    }));
  }

  async decrypt(ciphertext: string): Promise<StorageCredentials> {
    try {
      const parsed = JSON.parse(await this.encryption.decrypt(ciphertext)) as Partial<StorageCredentials>;
      if (typeof parsed.accessKeyId !== 'string' || typeof parsed.secretAccessKey !== 'string') {
        throw new Error('malformed');
      }
      return { accessKeyId: parsed.accessKeyId, secretAccessKey: parsed.secretAccessKey };
    } catch {
      throw storageErrors.providerError('Stored credentials could not be decrypted');
    }
  }
}
