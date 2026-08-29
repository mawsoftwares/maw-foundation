import type { User } from '../../domain/entities/User';
import type { UserResponseDto } from '../dto';

export { CreateUserUseCase } from './CreateUser';
export { GetUserUseCase }    from './GetUser';
export { ListUsersUseCase }  from './ListUsers';
export { UpdateUserUseCase } from './UpdateUser';
export { DeleteUserUseCase } from './DeleteUser';

/** Maps a persisted User row to the API response DTO. Extend as needed. */
export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id:              user.id,
    tenantId:        user.tenantId,
    firstName:       user.firstName,
    lastName:        user.lastName,
    email:           user.email,
    phone:           user.phone,
    avatar:          user.avatar,
    role:            user.role,
    status:          user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    phoneVerifiedAt: user.phoneVerifiedAt,
    lastLoginAt:     user.lastLoginAt,
    createdAt:       user.createdAt,
    updatedAt:       user.updatedAt,
  };
}
