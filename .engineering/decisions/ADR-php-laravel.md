# ADR: Laravel for PHP Backend

## Status
Accepted

## Context
The MAW Foundation dual-backend architecture requires a PHP framework for the PHP backend implementation. The framework must support enterprise-grade SaaS applications with authentication, RBAC, queues, database migrations, testing, and API development.

## Decision
Use **Laravel** (latest stable) as the PHP framework.

## Evaluation

| Criterion | Laravel | Symfony | Slim |
|-----------|---------|---------|------|
| Maturity | 13+ years | 19+ years | 13+ years |
| Developer availability | Largest PHP talent pool | Large, enterprise-focused | Small |
| Built-in auth | Sanctum, Passport, Fortify | Security bundle | None |
| Queue/jobs | Native (Redis, DB, SQS) | Messenger component | None |
| Testing | PHPUnit + HTTP/DB helpers | PHPUnit + WebTestCase | PHPUnit only |
| ORM | Eloquent (Active Record) | Doctrine (Data Mapper) | None |
| Validation | Built-in Form Requests | Validator component | None |
| API development | API Resources, middleware | API Platform | Manual |
| Static analysis | Larastan (PHPStan wrapper) | PHPStan native | PHPStan |
| Deployment | Forge, Vapor, Docker | Flex, Docker | Docker |
| Learning curve | Low-moderate | Moderate-high | Low |
| Ecosystem | Largest (Spatie, packages) | Large (bundles) | Small |

## Rationale
- **Developer availability**: Laravel has the largest PHP developer pool globally, reducing hiring and onboarding friction
- **Built-in infrastructure**: Auth, queues, validation, file storage, and notifications are built-in — matching MAW Foundation's feature set without third-party packages
- **Testing ergonomics**: Laravel's HTTP testing, database assertions, and factory system make contract testing straightforward
- **Ecosystem**: Spatie packages, Larastan, Pint (formatter), and community packages cover most infrastructure needs
- **API Resources**: Laravel API Resources map cleanly to the DTOs/response shapes defined in the OpenAPI contract
- **Queue compatibility**: Laravel Queue with database driver uses the same PostgreSQL, matching the Node.js PgQueueProvider pattern

### Why not Symfony?
Symfony's Data Mapper pattern (Doctrine) offers better separation but has a steeper learning curve and smaller talent pool. The MAW Foundation's repository pattern already isolates the ORM, so Eloquent's Active Record pattern stays in the infrastructure layer.

### Why not Slim/micro-frameworks?
Too much manual wiring for a full SaaS foundation. The goal is not to build another framework.

## Consequences
- Eloquent models must stay in `Infrastructure/Persistence/` — never exposed to the application layer
- Laravel-specific code (facades, helpers) must stay at the HTTP/infrastructure layer
- Domain and Application layers must be framework-agnostic PHP
- PHPStan level 8 is enforced via CI
- PHP 8.3+ with strict types in every file
