export interface ISecretProvider {
  get(name: string): Promise<string | undefined>;
  getRequired(name: string): Promise<string>;
}
