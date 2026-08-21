import type { ISecretProvider } from '@maw/sdk/contracts/ISecretProvider';

export class EnvSecretProvider implements ISecretProvider {
  async get(name: string): Promise<string | undefined> {
    return process.env[name];
  }

  async getRequired(name: string): Promise<string> {
    const value = process.env[name];
    if (value === undefined || value === '') {
      throw new Error(`Required secret "${name}" is not set in the environment`);
    }
    return value;
  }
}
