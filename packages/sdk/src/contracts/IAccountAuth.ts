import type { Session } from './identity';

/** Credentials presented at sign-in. `audience` selects the app (admin/operator/…). */
export interface Credentials {
  readonly email: string;
  readonly password: string;
  readonly audience?: string;
  readonly deviceId?: string;
}

/** The token pair returned by the auth transport. */
export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
}

/** A successful authentication: the resolved session plus its tokens. */
export interface AuthResult {
  readonly session: Session;
  readonly tokens: TokenPair;
}

/**
 * Account (server) authentication port — transport only, persists nothing. Implemented
 * by the product's API layer / `@maw/api-client`; the token-issuing side lives in
 * `@maw/auth-core`.
 */
export interface IAccountAuth {
  signIn(credentials: Credentials): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<AuthResult>;
  signOut(refreshToken: string): Promise<void>;
}
