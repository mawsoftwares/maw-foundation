// Users — owned module (not a workspace package). Originally sourced from
// the @mawsoftwares/users Foundation template ("copy to your project's
// modules/users directory and own the code" per that package's own
// description) — copied here so this project can customize it freely
// without dragging every other consumer of the template along. The
// concrete repository (AuthSchemaUsersRepository, bound to the shared
// auth `users` table) lives at ../../users-from-auth-pg.ts, one level up.
export * from './api/controllers';
export * from './application/dto';
export * from './application/use-cases';
export * from './domain/entities/User';
export * from './domain/events/UserEvents';
export * from './infrastructure/repositories';
export * from './errors';
