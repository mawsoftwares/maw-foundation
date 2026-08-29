import type { ISocialAuthProvider, SocialAuthProfile } from '../social-auth';

export interface GitHubAuthProviderOptions {
  readonly clientId: string;
  readonly clientSecret: string;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export class GitHubAuthProvider implements ISocialAuthProvider {
  readonly providerName = 'github';
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(options: GitHubAuthProviderOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<SocialAuthProfile> {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
    }

    const tokens = (await tokenResponse.json()) as GitHubTokenResponse;
    if (!tokens.access_token) {
      throw new Error('GitHub token exchange returned no access_token');
    }

    const headers = {
      Authorization: `Bearer ${tokens.access_token}`,
      Accept: 'application/vnd.github+json',
    };

    const userResponse = await fetch('https://api.github.com/user', { headers });
    if (!userResponse.ok) {
      throw new Error(`GitHub user API failed: ${userResponse.status}`);
    }
    const user = (await userResponse.json()) as GitHubUser;

    let email = user.email;
    let emailVerified = false;

    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', { headers });
      if (emailsResponse.ok) {
        const emails = (await emailsResponse.json()) as GitHubEmail[];
        const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
        if (primary) {
          email = primary.email;
          emailVerified = primary.verified;
        }
      }
    } else {
      emailVerified = true;
    }

    if (!email) {
      throw new Error('Could not retrieve email from GitHub');
    }

    return {
      provider: this.providerName,
      providerId: String(user.id),
      email,
      emailVerified,
      name: user.name ?? user.login,
      avatarUrl: user.avatar_url,
    };
  }

  getAuthorizationUrl(redirectUri: string, state: string, scopes?: string[]): string {
    const scope = (scopes ?? ['user:email']).join(' ');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }
}
