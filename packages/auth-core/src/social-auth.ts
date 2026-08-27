import { AccountStatus } from '@mawsoftwares/sdk';
import type { IUserRepository, UserRecord } from '@mawsoftwares/sdk/contracts/IUserRepository';
import type { IHasher } from '@mawsoftwares/sdk/contracts/IHasher';

export interface SocialAuthProfile {
  readonly provider: string;
  readonly providerId: string;
  readonly email: string;
  readonly emailVerified?: boolean;
  readonly name?: string;
  readonly avatarUrl?: string;
}

export interface ISocialAuthProvider {
  readonly providerName: string;
  exchangeCode(code: string, redirectUri: string): Promise<SocialAuthProfile>;
}

export interface SocialAccountLink {
  readonly userId: string;
  readonly provider: string;
  readonly providerId: string;
  readonly linkedAt: string;
}

export interface ISocialAccountStore {
  link(userId: string, provider: string, providerId: string): Promise<void>;
  findByProvider(provider: string, providerId: string): Promise<SocialAccountLink | null>;
  findByUser(userId: string): Promise<readonly SocialAccountLink[]>;
  unlink(userId: string, provider: string): Promise<void>;
}

export class MemorySocialAccountStore implements ISocialAccountStore {
  private readonly links: SocialAccountLink[] = [];

  async link(userId: string, provider: string, providerId: string): Promise<void> {
    this.links.push({ userId, provider, providerId, linkedAt: new Date().toISOString() });
  }

  async findByProvider(provider: string, providerId: string): Promise<SocialAccountLink | null> {
    return this.links.find((l) => l.provider === provider && l.providerId === providerId) ?? null;
  }

  async findByUser(userId: string): Promise<readonly SocialAccountLink[]> {
    return this.links.filter((l) => l.userId === userId);
  }

  async unlink(userId: string, provider: string): Promise<void> {
    const idx = this.links.findIndex((l) => l.userId === userId && l.provider === provider);
    if (idx !== -1) this.links.splice(idx, 1);
  }
}

export interface SocialAuthResult {
  readonly user: UserRecord;
  readonly isNewUser: boolean;
  readonly linkedProviders: readonly string[];
}

export interface SocialAuthServiceOptions {
  readonly providers: ReadonlyMap<string, ISocialAuthProvider>;
  readonly socialAccountStore: ISocialAccountStore;
  readonly userRepository: IUserRepository;
  readonly hasher: IHasher;
  readonly defaultRole?: string;
}

export class SocialAuthService {
  private readonly providers: ReadonlyMap<string, ISocialAuthProvider>;
  private readonly socialAccountStore: ISocialAccountStore;
  private readonly userRepository: IUserRepository;
  private readonly hasher: IHasher;
  private readonly defaultRole: string;

  constructor(options: SocialAuthServiceOptions) {
    this.providers = options.providers;
    this.socialAccountStore = options.socialAccountStore;
    this.userRepository = options.userRepository;
    this.hasher = options.hasher;
    this.defaultRole = options.defaultRole ?? 'viewer';
  }

  async authenticate(
    providerName: string,
    code: string,
    redirectUri: string,
    tenantId: string,
  ): Promise<SocialAuthResult> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Unknown social auth provider: ${providerName}`);

    const profile = await provider.exchangeCode(code, redirectUri);

    const existingLink = await this.socialAccountStore.findByProvider(profile.provider, profile.providerId);
    if (existingLink) {
      const user = await this.userRepository.findById(existingLink.userId);
      if (!user) throw new Error('Linked user not found');
      const links = await this.socialAccountStore.findByUser(user.id);
      return { user, isNewUser: false, linkedProviders: links.map((l) => l.provider) };
    }

    const existingUser = await this.userRepository.findByEmail(tenantId, profile.email);
    if (existingUser) {
      await this.socialAccountStore.link(existingUser.id, profile.provider, profile.providerId);
      if (profile.emailVerified && !existingUser.emailVerified) {
        await this.userRepository.updateEmailVerified(existingUser.id, true);
      }
      const links = await this.socialAccountStore.findByUser(existingUser.id);
      return { user: existingUser, isNewUser: false, linkedProviders: links.map((l) => l.provider) };
    }

    const randomPassword = await this.hasher.hash(crypto.randomUUID());
    const newUser = await this.userRepository.create({
      tenantId,
      email: profile.email,
      passwordHash: randomPassword,
      role: this.defaultRole,
      name: profile.name,
      accountStatus: AccountStatus.ACTIVE,
    });

    if (profile.emailVerified) {
      await this.userRepository.updateEmailVerified(newUser.id, true);
    }

    await this.socialAccountStore.link(newUser.id, profile.provider, profile.providerId);
    const links = await this.socialAccountStore.findByUser(newUser.id);
    return { user: newUser, isNewUser: true, linkedProviders: links.map((l) => l.provider) };
  }

  async linkAccount(userId: string, providerName: string, code: string, redirectUri: string): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Unknown social auth provider: ${providerName}`);

    const profile = await provider.exchangeCode(code, redirectUri);
    const existing = await this.socialAccountStore.findByProvider(profile.provider, profile.providerId);
    if (existing && existing.userId !== userId) {
      throw new Error('This social account is already linked to another user');
    }
    await this.socialAccountStore.link(userId, profile.provider, profile.providerId);
  }

  async unlinkAccount(userId: string, providerName: string): Promise<void> {
    await this.socialAccountStore.unlink(userId, providerName);
  }

  async getLinkedProviders(userId: string): Promise<readonly string[]> {
    const links = await this.socialAccountStore.findByUser(userId);
    return links.map((l) => l.provider);
  }
}
