export function defineFactory<T>(defaults: () => T): (overrides?: Partial<T>) => T {
  return (overrides?: Partial<T>): T => ({ ...defaults(), ...overrides });
}
