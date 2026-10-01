# Contract Conformance Verification

Automated tooling to verify both Node.js and PHP backends conform to the shared OpenAPI contracts.

## Components

### Response Schemas (`response-schemas.ts`)
TypeScript definitions of every API response shape, derived from the OpenAPI specs. Used as the source of truth for validation.

### Validator (`validate.ts`)
Two functions:
- `validateResponse(body, schema)` — checks a single response against a schema (field presence, types, sensitive field leaks)
- `compareResponseShapes(nodeResp, phpResp)` — compares two responses for structural equivalence (same keys, same types, recursive)

### Validator Tests (`validate.test.ts`)
Unit tests for the validation logic itself — runs without either backend.

```bash
npx vitest run contracts/verification/validate.test.ts
```

### Cross-Backend Runner (`conformance-runner.ts`)
Hits both backends with the same requests and validates:
1. Both return the same HTTP status
2. Both match the contract schema
3. Both have the same response shape (keys + types)

```bash
# Start both backends first, then:
NODE_URL=http://localhost:3001 PHP_URL=http://localhost:8080 \
  npx tsx contracts/verification/conformance-runner.ts
```

### PHP-Side Tests
In `backend-php/tests/Contract/`:
- `ErrorCodeConformanceTest` — validates PHP exceptions use error codes from `contracts/errors/error-codes.json` with matching HTTP status
- `RouteConformanceTest` — validates PHP routes file defines all endpoints from the OpenAPI specs
- `DualBackendConformanceTest` — validates PHP entity `toResponse()` output matches Node.js JSON shapes
- `AuthContractTest`, `UserContractTest`, `RbacContractTest` — validate response structures match their respective OpenAPI specs

```bash
cd backend-php && composer test:contract
```

## What Gets Verified

| Check | Tool | Runs Without Backend |
|-------|------|---------------------|
| Response field presence | `validateResponse` | Yes |
| Response field types | `validateResponse` | Yes |
| Sensitive field leaks | `validateResponse` | Yes |
| Error code → HTTP status | `ErrorCodeConformanceTest` | Yes |
| Route coverage | `RouteConformanceTest` | Yes |
| Entity response shapes | `DualBackendConformanceTest` | Yes |
| Two-backend shape parity | `conformance-runner.ts` | No (needs both running) |
| Response convention consistency | `RouteConformanceTest` | Yes |
