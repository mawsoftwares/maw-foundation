export interface IEncryptionService {
  encrypt(plaintext: string, key?: string): Promise<string>;
  decrypt(ciphertext: string, key?: string): Promise<string>;
  generateKey(): Promise<string>;
}
