import type { ISocialAuthProvider, SocialAuthProfile } from '../social-auth';

export interface GoogleAuthProviderOptions {
  readonly clientId: string;
  readonly clientSecret: string;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

export class GoogleAuthProvider implements ISocialAuthProvider {
  readonly providerName = 'google';
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(options: GoogleAuthProviderOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SocialAuthProfile> {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      throw new Error(`Google token exchange failed: ${tokenResponse.status} ${body}`);
    }

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error(`Google userinfo failed: ${userInfoResponse.status}`);
    }

    const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

    return {
      provider: this.providerName,
      providerId: userInfo.sub,
      email: userInfo.email,
      emailVerified: userInfo.email_verified,
      name: userInfo.name,
      avatarUrl: userInfo.picture,
    };
  }

  getAuthorizationUrl(redirectUri: string, state: string, scopes?: string[]): string {
    const scope = (scopes ?? ['openid', 'email', 'profile']).join(' ');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}
