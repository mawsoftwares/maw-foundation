import type { ISecureStore } from '@mawsoftwares/sdk/contracts/ISecureStore';

let SecureStore: {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SecureStore = require('expo-secure-store') as typeof SecureStore;
} catch {
  throw new Error('expo-secure-store is required for NativeSecureStore. Install it with: npx expo install expo-secure-store');
}

export class NativeSecureStore implements ISecureStore {
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  }

  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }

  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }
}
