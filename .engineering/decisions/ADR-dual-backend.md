# ADR: Dual Backend Architecture (Node.js + PHP)

## Status
Accepted

## Context
MAW Foundation is a business application foundation used across SaaS, ERP, CRM, and admin applications. Different client projects have different team skill sets and hosting environments. Some teams are Node.js-native; others are PHP-native. Requiring a single backend runtime limits adoption and forces teams to learn unfamiliar technology stacks.

## Decision
Evolve MAW Foundation into a backend-agnostic platform where a project chooses **either** Node.js **or** PHP (Laravel) as its backend runtime, without changing the frontend or API contracts.

### Architecture
- **Shared**: OpenAPI contracts (`contracts/`), database schema (PostgreSQL), frontend (React/RN), SDK types, API client
- **Node.js backend**: Existing `packages/server-express`, `packages/server-hono`, `apps/sample-server`
- **PHP backend**: New `backend-php/` (Laravel), implementing the same OpenAPI contract against the same database

### Key constraints
- The Node.js backend is **not modified** as part of this work
- Both backends use the **same PostgreSQL schema** and migrations
- Both backends conform to the **same OpenAPI contract**
- The frontend (`api-client`) is **backend-agnostic** — it talks to the contract, not the implementation
- A project deploys **one** backend, not both

## Rationale
- **Team flexibility**: PHP teams (large talent pool, especially in South Asia) can use MAW Foundation without learning Node.js
- **Hosting flexibility**: PHP deployments (shared hosting, LAMP stacks) are simpler for some client environments
- **No duplication**: Business rules live in the contracts and database — backends are adapters
- **Incremental**: PHP backend can be built module-by-module without touching the working Node.js codebase
- **Contract-first**: OpenAPI as the single source of truth prevents drift between implementations

## Consequences
- Two codebases to maintain (mitigated by contract tests catching drift)
- Password hashing must use identical parameters (scrypt N=16384, r=8, p=1)
- JWT signing must use identical algorithm and secret (HS256)
- Migration ownership stays with SQL files — both backends consume, neither generates
- Each backend has its own testing, deployment, and CI pipeline
