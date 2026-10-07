import type { ListParams, ListResult } from '@mawsoftwares/ui-web';
import type { AccountStatusValue } from '@mawsoftwares/sdk/security/AccountStatus';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';

/**
 * Web-side user contract. Keep in step with `server/application/dto/index.ts` when you add or rename fields — the
 * web module deliberately does not import server code, so it can be copied into a front-end-only app on its own.
 */
export interface UserResponseDto {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status: AccountStatusValue;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  /** Auth role code (preferred). */
  role?: string;
  /** Profile image URL (e.g. from /files/upload). */
  avatar?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  role?: string;
  status?: AccountStatusValue;
}

export interface UsersListResult {
  items: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RoleOption {
  readonly code: string;
  readonly name: string;
}

export interface IUserApiService {
  list(params: ListParams): Promise<ListResult<UserResponseDto>>;
  get(id: string): Promise<UserResponseDto>;
  create(data: CreateUserDto): Promise<UserResponseDto>;
  update(id: string, data: UpdateUserDto): Promise<UserResponseDto>;
  delete(id: string): Promise<void>;
  activate(id: string): Promise<UserResponseDto>;
  deactivate(id: string): Promise<UserResponseDto>;
  listRoles?(): Promise<readonly RoleOption[]>;
  uploadAvatar?(file: File, onProgress: (percent: number) => void): Promise<StoredFile>;
}
