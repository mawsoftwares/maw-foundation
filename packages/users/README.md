# @mawsoftwares/users

Production-ready, reusable User Management Module for the MAW Foundation.

## Overview
This module handles user profile/account management, lifecycle events, and password operations using the foundation's existing core modules (`@mawsoftwares/database`, `@mawsoftwares/auth-core`, `@mawsoftwares/sdk`). It provides framework-agnostic Use Cases and Controllers which can be adapted to any framework (e.g., Express, Hono).

## Features
- Framework-agnostic application layer
- Multi-tenant data isolation by default
- Soft deletes & audit tracking built-in
- Standardized DTOs and Validation
- Reusable domain events
- Database migrations

## Architecture
- **Domain**: Entities (`User.ts`) and Events (`UserEvents.ts`).
- **Application**: DTOs and Use Cases (`CreateUser`, `UpdateUser`, `DeleteUser`, `ListUsers`, `PasswordOperations`).
- **Infrastructure**: Repositories (`UserRepository` extending `TenantScopedRepository`) and Migrations.
- **API**: Framework-agnostic `UsersController` bridging HTTP requests to Use Cases.

## Installation / Usage
See foundation guidelines for adding to an app. This package relies on database and SDK context properly initialized at the root platform level.
