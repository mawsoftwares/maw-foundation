# Sharing `@mawsoftwares/*` with other developers

Foundation packages are **versioned npm packages** published to **GitHub Packages** under the `@mawsoftwares` scope. Product repos install them — they do not copy-paste source.

This monorepo still links packages locally via pnpm workspaces (`workspace:*`) so foundation development stays fast. Other developers do **not** need this repo on disk.

## What is published vs not

| Published (`private: false`) | Not published (`private: true`) |
|---|---|
| `@mawsoftwares/sdk`, `core`, `config`, `platform`, `database`, … | `apps/*` (samples) |
| `@mawsoftwares/auth-core`, `rbac-core`, `tenancy`, `server-express`, … | `@mawsoftwares/users`, `@mawsoftwares/ui-users` (copy from `templates/`) |
| `@mawsoftwares/ui-web`, `ui-auth`, `theme`, `api-client`, … | `@maw-templates/*` (copy into the product) |

`@mawsoftwares/ui-native` is excluded from the pnpm workspace (Expo install), so the release workflow does not publish it. Publish it from `packages/ui-native` separately if a mobile product needs it.

See [`docs/packages.md`](./packages.md) for the full list. Domain modules that differ per product stay as **source templates**, not packages.

## How another developer consumes the packages

### 1. GitHub access

The packages are **restricted** (org-private). The developer needs:

- Membership in the [mawsoftwares](https://github.com/mawsoftwares) GitHub org, **or**
- A Personal Access Token with `read:packages` (and SSO authorized for the org if SSO is enabled)

Create a classic PAT: GitHub → Settings → Developer settings → Personal access tokens → `read:packages`.

### 2. Project `.npmrc`

In the **product** repo (not this one):

```
@mawsoftwares:registry=https://npm.pkg.github.com
```

Auth cannot live in a committed `.npmrc` (pnpm will not expand `${NODE_AUTH_TOKEN}` there). Put the token in **user-level** `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxx
```

Or export it only for a one-off command after adding the line to `~/.npmrc` via:

```bash
pnpm config set //npm.pkg.github.com/:_authToken ghp_xxxxxxxxxxxx
```

Never commit the token.

### 3. Install

```bash
# Backend
pnpm add @mawsoftwares/sdk @mawsoftwares/database @mawsoftwares/auth-core \
  @mawsoftwares/rbac-core @mawsoftwares/tenancy @mawsoftwares/server-express \
  @mawsoftwares/observability @mawsoftwares/communication @mawsoftwares/queue

# Frontend
pnpm add @mawsoftwares/sdk @mawsoftwares/theme @mawsoftwares/ui-web \
  @mawsoftwares/ui-auth @mawsoftwares/api-client
```

Pin versions (`0.1.0`, not `*`). Do **not** use `workspace:*` outside this monorepo.

### 4. TypeScript runtime

Packages ship **TypeScript source** (`src/index.ts`) — the same format this repo uses.

| App type | How to run |
|---|---|
| Vite / Next (web) | Works — the bundler compiles `node_modules/@mawsoftwares/*` |
| Node backend | Run with `tsx` (same as `apps/sample-server`) |
| Production Node | Keep using `tsx`, or bundle with esbuild/tsup including `@mawsoftwares/*` |

Plain `node dist/server.js` will not load `.ts` files from `node_modules`. Use tsx or a bundler.

### 5. Users / other domain modules

Do **not** `pnpm add @mawsoftwares/users`. Copy [`templates/users-module`](../templates/users-module) into the product and own the code. See [`docs/module-architecture.md`](./module-architecture.md).

Full wiring walkthrough: [`.engineering/platform-reuse.md`](../.engineering/platform-reuse.md).

---

## How the foundation team publishes

Versioning uses [Changesets](https://github.com/changesets/changesets). Each package versions independently.

### Everyday change

```bash
pnpm changeset           # select packages + bump type + summary
# commit the generated .changeset/*.md with your PR
```

On merge to `main`, GitHub Actions either:

1. Opens a **Version packages** PR, or
2. Publishes to GitHub Packages when that version PR is merged

### Manual publish (first release or hotfix)

```bash
pnpm config set //npm.pkg.github.com/:_authToken ghp_xxxxxxxxxxxx   # write:packages
pnpm version-packages                    # if you have pending changesets
pnpm release                             # changeset publish
```

The first publish of `0.1.0` does not need a changeset — `pnpm release` publishes any version that is not yet on the registry.

### Local auth for this repo

This repo’s `.npmrc` maps `@mawsoftwares` to GitHub Packages. For **local publish**, put a `write:packages` token in `~/.npmrc`:

```bash
pnpm config set //npm.pkg.github.com/:_authToken ghp_xxxxxxxxxxxx
```

CI uses `GITHUB_TOKEN` with `packages: write`. If org settings block package creation with `GITHUB_TOKEN`, add a PAT as the `NODE_AUTH_TOKEN` repository secret.

## CI authentication for product repos

In the product’s GitHub Actions:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    registry-url: https://npm.pkg.github.com
    scope: '@mawsoftwares'
- run: pnpm install --frozen-lockfile
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NODE_AUTH_TOKEN }}
```

The secret must be a PAT (or GitHub App token) with `read:packages`. `GITHUB_TOKEN` from a **different** repo cannot read packages published by `mawsoftwares/maw-foundation` unless the package is granted access.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `401 Unauthorized` from `npm.pkg.github.com` | Token missing from `~/.npmrc`, expired, or lacks `read:packages` |
| `404 Not Found` for `@mawsoftwares/sdk` | Package not published yet, or the token cannot see org packages (SSO / package access) |
| `workspace:*` in a product `package.json` | That protocol only works inside this monorepo. Use a semver (`0.1.0`) |
| `ERR_UNKNOWN_FILE_EXTENSION .ts` | Running plain `node` on a file that imports a Foundation package. Use `tsx` or a bundler |
