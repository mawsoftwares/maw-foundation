# MAW Foundation — Publishing Guide

## Overview

Packages are published independently to **GitHub Packages** under the `@maw` npm scope.

## Versioning Strategy

We use [Changesets](https://github.com/changesets/changesets) for independent package versioning.

### Creating a Changeset

When you make changes to a package, create a changeset:

```bash
pnpm changeset
```

This will prompt you to:
1. Select which packages changed
2. Choose the bump type (major/minor/patch)
3. Write a summary of the change

### Bumping Versions

```bash
pnpm version-packages
```

This consumes all pending changesets and updates `package.json` versions + changelogs.

### Publishing

```bash
pnpm release
```

This publishes all packages with new versions to the registry.

## Registry Authentication

Packages are published to GitHub Packages. Authentication is configured in `.npmrc`:

```
@maw:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

### CI Authentication

In GitHub Actions, `NODE_AUTH_TOKEN` is set automatically via the `GITHUB_TOKEN` secret.

### Local Authentication

For local development, create a GitHub Personal Access Token with `read:packages` scope:

```bash
export NODE_AUTH_TOKEN=ghp_xxxxxxxxxxxx
```

**Never commit tokens.** The `.env` file is in `.gitignore`.

## Package Access

All packages are currently `"private": true`. When ready to publish:

1. Set `"private": false` in the package's `package.json`
2. Set `"access": "public"` in `.changeset/config.json` (if publishing to public npm)
3. Add `"publishConfig"` if needed:
   ```json
   {
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     }
   }
   ```

## Consuming Packages

In a downstream project:

1. Add `.npmrc`:
   ```
   @maw:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
   ```

2. Install:
   ```bash
   pnpm add @mawsoftwares/core @mawsoftwares/auth @mawsoftwares/rbac
   ```
