import type { ListParams, ListResult } from '@maw/ui-web';
import type { UserResponseDto, CreateUserDto, UpdateUserDto } from '@maw/users';

export interface IUserApiService {
  list(params: ListParams): Promise<ListResult<UserResponseDto>>;
  get(id: string): Promise<UserResponseDto>;
  create(data: CreateUserDto): Promise<UserResponseDto>;
  update(id: string, data: UpdateUserDto): Promise<UserResponseDto>;
  delete(id: string): Promise<void>;
  activate(id: string): Promise<UserResponseDto>;
  deactivate(id: string): Promise<UserResponseDto>;
}
