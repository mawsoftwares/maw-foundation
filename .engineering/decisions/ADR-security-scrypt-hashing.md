# ADR: scrypt for Password Hashing

## Status
Accepted

## Context
Need a password hashing algorithm that is memory-hard to resist GPU/ASIC attacks, available in Node.js core without native dependencies, and configurable for different security/performance tradeoffs.

## Decision
Use Node.js built-in `crypto.scryptSync` with parameters N=16384, r=8, p=1 and a 128-bit random salt. Output format: `scrypt$<salt-hex>$<key-hex>`.

## Rationale
- **scrypt vs bcrypt**: scrypt is memory-hard (configurable via N and r), making it more resistant to parallel hardware attacks. bcrypt is CPU-hard only.
- **scrypt vs argon2**: argon2id is the OWASP recommendation but requires a native C addon (`argon2` npm package). scrypt is built into Node.js `crypto`, keeping the dependency count at zero and simplifying deployment across platforms (Docker, serverless, React Native).
- **Parameters**: N=16384, r=8, p=1 takes ~100ms on commodity hardware — fast enough for login, slow enough to frustrate brute-force.

## Consequences
- Swapping to argon2 later requires only changing the `IHasher` implementation and migrating hashes on next login (detect by prefix).
- The `scrypt$` prefix in stored hashes enables future algorithm migration without a flag day.
