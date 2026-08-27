import type { ListParams, ListResult } from '@mawsoftwares/ui-web';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '@mawsoftwares/users';
import type { StoredFile } from '@mawsoftwares/sdk/contracts/IFileStorage';

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
