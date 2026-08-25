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
export interface RegistrationInput {
  readonly email: string;
  readonly password: string;
  readonly tenantId: string;
  readonly role?: string;
  readonly name?: string;
}

export interface SessionInfo {
  readonly id: string;
  readonly deviceInfo?: Record<string, unknown>;
  readonly createdAt: string;
  readonly lastActiveAt: string;
}

export interface IAccountAuth {
  signIn(credentials: Credentials): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<AuthResult>;
  signOut(refreshToken: string): Promise<void>;

  register?(input: RegistrationInput): Promise<{ userId: string; emailVerificationRequired: boolean }>;
  verifyEmail?(token: string): Promise<void>;
  forgotPassword?(tenantId: string, email: string): Promise<void>;
  resetPassword?(token: string, newPassword: string): Promise<void>;
  changePassword?(currentPassword: string, newPassword: string): Promise<void>;
  listSessions?(): Promise<readonly SessionInfo[]>;
  revokeSession?(sessionId: string): Promise<void>;
  revokeAllSessions?(exceptCurrent?: string): Promise<void>;
}
