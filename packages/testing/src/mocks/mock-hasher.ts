import type { IHasher } from '@mawsoftwares/sdk/contracts/IHasher';

export class MockHasher implements IHasher {
  hash(plaintext: string): string {
    return `hashed_${plaintext}`;
  }

  verify(plaintext: string, stored: string): boolean {
    return stored === `hashed_${plaintext}`;
  }
}
