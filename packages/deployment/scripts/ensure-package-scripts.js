#!/usr/bin/env node
/**
 * When the deployment/ kit is copied into a project, npm scripts referenced by
 * app.config.json (migrate, migrate:prod, migrate:uat, seed:server, …) may be
 * missing from package.json. This fills them in without overwriting existing
 * scripts.
 *
 * Usage:
 *   node deployment/scripts/ensure-package-scripts.js
 *   node deployment/scripts/ensure-package-scripts.js --root /path/to/project
 */
const fs = require('fs')
const path = require('path')

const KNEX_MIGRATE = 'tsx node_modules/knex/bin/cli.js migrate:latest'
const KNEX_SEED = 'tsx node_modules/knex/bin/cli.js seed:run'
const KNEX_CLI = 'node_modules/knex/bin/cli.js'
const NPM_RUN_RE = /\bnpm\s+run(?:\s+-s)?\s+([A-Za-z0-9:_-]+)/g

const DEFAULT_SCRIPTS = {
  migrate: KNEX_MIGRATE,
  'migrate:server': KNEX_MIGRATE,
  'migrate:prod': KNEX_MIGRATE,
  'migrate:uat': KNEX_MIGRATE,
  'migrate:latest': KNEX_MIGRATE,
  'seed:server': KNEX_SEED,
  'db:test': 'tsx scripts/test-knex-connection.ts',
  deploy: 'node deployment/scripts/deploy.js',
  'deploy:list': 'node deployment/scripts/deploy.js list',
  'deploy:ensure-scripts': 'node deployment/scripts/ensure-package-scripts.js',
}

function parseCliArg(argv, flag) {
  const idx = argv.indexOf(flag)
  if (idx !== -1 && argv[idx + 1]) {
    return argv[idx + 1]
  }
  return null
}

function parseRootArg(argv) {
  const root = parseCliArg(argv, '--root')
  return root ? path.resolve(root) : path.resolve(__dirname, '..', '..')
}

function parseExtraScriptNames(argv) {
  const raw = parseCliArg(argv, '--scripts')
  if (!raw) {
    return []
  }
  return raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
}

function collectNpmRunNames(commands) {
  const names = new Set()
  Object.values(commands || {}).forEach((value) => {
    if (typeof value !== 'string') {
      return
    }
    NPM_RUN_RE.lastIndex = 0
    let match
    while ((match = NPM_RUN_RE.exec(value))) {
      names.add(match[1])
    }
  })
  return names
}

function scanManifestCommands(projectRoot) {
  const names = new Set()
  const envRoot = path.join(projectRoot, 'deployment', 'environments')
  if (!fs.existsSync(envRoot)) {
    return names
  }

  for (const entry of fs.readdirSync(envRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue
    }
    const manifestPath = path.join(envRoot, entry.name, 'app.config.json')
    if (!fs.existsSync(manifestPath)) {
      continue
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      collectNpmRunNames(manifest.deployment?.commands).forEach((name) => names.add(name))
    } catch (_) {
      // Ignore unreadable/invalid environment manifests.
    }
  }

  return names
}

function defaultCommandForScript(name) {
  if (DEFAULT_SCRIPTS[name]) {
    return DEFAULT_SCRIPTS[name]
  }
  if (name.startsWith('migrate')) {
    return KNEX_MIGRATE
  }
  if (name.startsWith('seed')) {
    return KNEX_SEED
  }
  return null
}

function canUseKnexScripts(projectRoot, pkg) {
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  return Boolean(
    deps.knex ||
      fs.existsSync(path.join(projectRoot, KNEX_CLI)) ||
      fs.existsSync(path.join(projectRoot, 'node_modules', 'knex')) ||
      fs.existsSync(path.join(projectRoot, 'knexfile.ts')) ||
      fs.existsSync(path.join(projectRoot, 'knexfile.js'))
  )
}

function ensurePackageScripts(projectRoot, { extraScriptNames = [] } = {}) {
  const packagePath = path.join(projectRoot, 'package.json')
  if (!fs.existsSync(packagePath)) {
    throw new Error(`package.json not found at ${packagePath}`)
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  pkg.scripts = pkg.scripts || {}

  const requiredNames = new Set([
    ...Object.keys(DEFAULT_SCRIPTS),
    ...scanManifestCommands(projectRoot),
    ...extraScriptNames,
  ])

  const skipKnex = !canUseKnexScripts(projectRoot, pkg)
  const added = []
  const skipped = []

  requiredNames.forEach((name) => {
    if (pkg.scripts[name]) {
      skipped.push(name)
      return
    }
    const command = defaultCommandForScript(name)
    if (!command) {
      return
    }
    if (skipKnex && (command === KNEX_MIGRATE || command === KNEX_SEED)) {
      return
    }
    pkg.scripts[name] = command
    added.push(name)
  })

  if (added.length > 0) {
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
  }

  return { packagePath, added, skipped }
}

function runCli() {
  const projectRoot = parseRootArg(process.argv)
  const extraScriptNames = parseExtraScriptNames(process.argv)
  const result = ensurePackageScripts(projectRoot, { extraScriptNames })
  if (result.added.length === 0) {
    console.log(`package.json already has required deploy scripts (${result.packagePath})`)
    return
  }
  console.log(`Added npm scripts to ${result.packagePath}: ${result.added.join(', ')}`)
}

if (require.main === module) {
  try {
    runCli()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = {
  DEFAULT_SCRIPTS,
  collectNpmRunNames,
  ensurePackageScripts,
}
