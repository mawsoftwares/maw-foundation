# Sharing `@mawsoftwares/*` with other developers

Foundation packages are **versioned npm packages** published to **GitHub Packages** under the `@mawsoftwares` scope. Product repos install them — they do not copy-paste source.

This monorepo still links packages locally via pnpm workspaces (`workspace:*`) so foundation development stays fast. Other developers do **not** need this repo on disk.

## What is published vs not

| Published (`private: false`) | Not published (`private: true`) |
|---|---|
| `@mawsoftwares/sdk`, `core`, `config`, `platform`, `database`, … | `apps/*` (samples) |
| `@mawsoftwares/auth-core`, `rbac-core`, `tenancy`, `server-express`, … | `@maw-templates/users-module` and the other templates (copy from `templates/`) |
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

### 2b. Deploy servers and CI (every new product repo)

A server that runs `pnpm install` for a product repo needs the **same token**, because the packages are private. Without it the install stops with
`ERR_PNPM_FETCH_401 ... No authorization header was set for the request`. Do this once per server, for the user that runs the deploy (for example `deploy`):

1. **Token.** Create a classic PAT with only `read:packages`. If the org uses SSO, click *Configure SSO* next to the token and authorize `mawsoftwares`
   (without that, GitHub answers 401 even when the file is right). Prefer a machine/org account over a personal one, and use a different token per server so one can be revoked alone.
2. **Repo `.npmrc`** (committed, no token): `@mawsoftwares:registry=https://npm.pkg.github.com`. Never put a token, or a "how to" line containing one, in that file.
3. **Server `~/.npmrc`** (`/home/<deploy-user>/.npmrc`, mode 600), exactly one line, no quotes, no spaces:

   ```
   //npm.pkg.github.com/:_authToken=<TOKEN>
   ```

   Write it so the token never lands in shell history or on the clipboard next to a command. Run this on your own machine and paste the token at the prompt:

   ```bash
   read -rs -p "Paste GitHub token: " T; echo
   printf '//npm.pkg.github.com/:_authToken=%s\n' "$(printf %s "$T" | tr -d '[:space:]')" \
     | ssh -i <key> <deploy-user>@<server> 'umask 077; cat > ~/.npmrc; ls -l ~/.npmrc'
   unset T
   ```

   Do not use `pbpaste` for this: you have to copy the command to run it, which replaces the token on the clipboard, and the command text gets saved as the "token".
4. **Verify before deploying** (prints no secret). Both lookups must answer `200`:

   ```bash
   ssh -i <key> <deploy-user>@<server> 't=$(grep _authToken= ~/.npmrc | cut -d= -f2-); echo "length ${#t}, prefix ${t:0:4}";
     for p in api audit; do curl -s -o /dev/null -w "$p %{http_code}\n" -H "Authorization: Bearer $t" https://npm.pkg.github.com/@mawsoftwares%2f$p; done'
   ```

   A classic token is 40 characters starting `ghp_`; the file is about 75 bytes. `401` means a wrong or SSO-unauthorized token, `404` means the token cannot see the package.
5. **CI** (Bitbucket Pipelines, GitHub Actions): store the token as a *secured* repository variable and write the same one-line `.npmrc` in the first script step. Do not echo it.
6. **Scope and rotation.** The file is readable by every process of that user, so keep the scope to `read:packages`, rotate the token if the server or the file is ever exposed, and revoke any token that was pasted into chat, a ticket or a committed file.

Read-only check that nothing else changes: this one line only supplies a login for `npm.pkg.github.com`. It does not change any registry, so other projects on the same server are unaffected.

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

### 3b. Updating to a newer version

Do this in the **product** repo whenever the foundation team announces a release (the release notes are each package's `CHANGELOG.md`, also visible on the GitHub Packages page).

1. **Check what is available** and what you have:

   ```bash
   pnpm outdated '@mawsoftwares/*'
   ```

2. **Read the changelogs** of every package you will bump, especially entries marked *minor* or *major* (while versions are `0.x`, a minor bump can contain breaking changes). Each changelog is at `node_modules/@mawsoftwares/<name>/CHANGELOG.md` after install, or on the package page.

3. **Bump together.** Packages share types, so move related ones in one go (for example `sdk` with `server-express`, or `ui-web` with `theme`). Pin exact versions, no `^`, no `*`:

   ```bash
   pnpm add @mawsoftwares/sdk@0.3.0 @mawsoftwares/server-express@0.2.0 @mawsoftwares/api-client@0.2.2
   # or move every foundation package to its latest published version:
   pnpm up '@mawsoftwares/*' --latest
   ```

   Your `~/.npmrc` needs a token with `read:packages` (see section 2). `401` means the token is missing or not SSO-authorized.

4. **Apply any breaking-change notes** from the changelogs, then verify:

   ```bash
   pnpm install
   pnpm typecheck && pnpm lint && pnpm test
   ```

5. **Smoke-test the app** (sign in, one list page, one create), commit `package.json` **and** `pnpm-lock.yaml`, and deploy. CI and servers install with `--frozen-lockfile`, so a missing lockfile change fails the build.

6. **Roll back** if something breaks: `pnpm add @mawsoftwares/<name>@<previous-version>` and commit the lockfile again.

Things that are **not** delivered by a package update:

- `apps/sample-*` features (Menu Management, the sample shell). They are reference apps and are never published. To adopt a change, copy it from the foundation repo into the product by hand.
- `templates/*` (users module and other domain templates). Copy again if you want the new version, then re-apply your own edits.

### 4. TypeScript runtime

Packages ship **TypeScript source** (`src/index.ts`) — the same format this repo uses.

| App type | How to run |
|---|---|
| Vite / Next (web) | Works — the bundler compiles `node_modules/@mawsoftwares/*` |
| Node backend | Run with `tsx` (same as `apps/sample-server`) |
| Production Node | Keep using `tsx`, or bundle with esbuild/tsup including `@mawsoftwares/*` |

Plain `node dist/server.js` will not load `.ts` files from `node_modules`. Use tsx or a bundler.

### 5. Users / other domain modules

There is no users package. Copy [`templates/users-module`](../templates/users-module) into the product and own the code. See [`docs/module-architecture.md`](./module-architecture.md).

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

Copy `.npmrc.example` to `.npmrc` (gitignored) so `@mawsoftwares` maps to GitHub Packages. For **local publish**, put a `write:packages` token in `~/.npmrc`:

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
| New version exists for you but a developer cannot install it (`404`, or `No matching version found`) | Their token cannot see the package (org membership, SSO not authorized, or package access not granted), or a stale metadata cache. See *Developer cannot see a published version* below |
| `workspace:*` in a product `package.json` | That protocol only works inside this monorepo. Use a semver (`0.1.0`) |
| `ERR_UNKNOWN_FILE_EXTENSION .ts` | Running plain `node` on a file that imports a Foundation package. Use `tsx` or a bundler |

### Developer cannot see a published version

You can publish and see `0.3.0`, but another developer gets `404` or `No matching version found`. The packages are **restricted**, so GitHub answers `404` for anything the caller's token cannot read. Check in this order.

**Developer side**

1. Registry mapping in the product repo `.npmrc`: `@mawsoftwares:registry=https://npm.pkg.github.com`.
2. Token in their own `~/.npmrc` (one line, no quotes): `//npm.pkg.github.com/:_authToken=<token>`. It must be a **classic** PAT with `read:packages`. If the org uses SSO, open the token in GitHub and click *Configure SSO* -> *Authorize* `mawsoftwares`. Without that step GitHub reports `404`/`401` even though the token looks right.
3. Ask the registry directly (prints no secret). `200` means access is fine, `401` a bad or unauthorized token, `404` no access to that package:

   ```bash
   t=$(grep _authToken= ~/.npmrc | cut -d= -f2-)
   curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $t" https://npm.pkg.github.com/@mawsoftwares%2fsdk
   npm view @mawsoftwares/sdk versions --registry=https://npm.pkg.github.com
   ```

4. Stale cache: `pnpm store prune`, delete the lockfile entry for the package (or run `pnpm up @mawsoftwares/sdk@0.3.0`), and retry with `pnpm install --force`.
5. Wrong pin: `0.3.0` is a minor bump, so a range such as `~0.2.0` will never pick it up. Set the exact version.

**Owner side (GitHub org admin)**

1. The developer is in the `mawsoftwares` org, or has been added as an outside collaborator on the package.
2. Each package page -> *Package settings* -> *Manage access*: add the team or person with at least **Read**, or enable inheriting access from the repository. New packages published by CI can start with no access beyond the publisher.
3. Org *Settings* -> *Packages*: check that members are allowed to see private packages.
4. Packages published from CI with `GITHUB_TOKEN` are linked to the repository; if they are not, link them so repo permissions apply.
