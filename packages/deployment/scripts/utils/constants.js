const path = require('path')
const fs = require('fs')

// ---------------------------------------------------------------------------
// Engine root — where the shared scripts + templates live (this package)
// ---------------------------------------------------------------------------
const ENGINE_ROOT = path.resolve(__dirname, '..', '..')
const TEMPLATES_DIR = path.join(ENGINE_ROOT, 'templates')
const TOPOLOGY_DIR = path.join(ENGINE_ROOT, 'topology')

// ---------------------------------------------------------------------------
// Project root — where the consuming project's deploy/ folder lives.
//
// Resolution order:
//   1. --project-root CLI flag
//   2. DEPLOY_PROJECT_ROOT env var
//   3. Walk up from cwd looking for deploy/ or deploy.config.json
//   4. Fall back to cwd
// ---------------------------------------------------------------------------

function findProjectRoot() {
  const cliIdx = process.argv.indexOf('--project-root')
  if (cliIdx !== -1 && process.argv[cliIdx + 1]) {
    return path.resolve(process.argv[cliIdx + 1])
  }

  if (process.env.DEPLOY_PROJECT_ROOT) {
    return path.resolve(process.env.DEPLOY_PROJECT_ROOT)
  }

  let dir = process.cwd()
  const root = path.parse(dir).root
  while (dir !== root) {
    if (
      fs.existsSync(path.join(dir, 'deploy.config.json')) ||
      fs.existsSync(path.join(dir, 'deploy', 'environments'))
    ) {
      return dir
    }
    dir = path.dirname(dir)
  }

  return process.cwd()
}

function resolveDeployDir(projectRoot) {
  const configPath = path.join(projectRoot, 'deploy.config.json')
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (config.deployDir) {
        return path.resolve(projectRoot, config.deployDir)
      }
    } catch { /* ignore parse errors, use default */ }
  }
  return path.join(projectRoot, 'deploy')
}

const PROJECT_ROOT = findProjectRoot()
const DEPLOY_DIR = resolveDeployDir(PROJECT_ROOT)

// Project-specific directories (live in the project's deploy/ folder)
const ENVIRONMENTS_DIR = path.join(DEPLOY_DIR, 'environments')
const GENERATED_DIR = path.join(DEPLOY_DIR, 'generated')
const LOGS_DIR = path.join(DEPLOY_DIR, 'logs')
const HISTORY_DIR = path.join(DEPLOY_DIR, 'history')

function getEnvironmentsDir() {
  return ENVIRONMENTS_DIR
}

const GENERATED_FILE_MAP = {
  ecosystem: 'ecosystem.config.js',
  nginx: 'nginx.conf',
  runtime: 'runtime.config.js',
  dockerCompose: 'docker-compose.yml',
  dockerfile: 'Dockerfile',
}

const TEMPLATE_FILE_MAP = {
  ecosystem: 'ecosystem.template.js',
  nginx: 'nginx.template.conf',
  runtime: 'runtime.template.js',
  dockerCompose: 'docker-compose.template.yml',
  dockerfile: 'dockerfile.template',
}

const DEFAULT_HEALTH_ENDPOINT = '/health'
const DEFAULT_HEALTH_RETRIES = 8
const DEFAULT_HEALTH_RETRY_DELAY_MS = 2000
const DEFAULT_HEALTH_INITIAL_DELAY_MS = 4000
const DEFAULT_HEALTH_REQUEST_TIMEOUT_MS = 10000

module.exports = {
  DEFAULT_HEALTH_ENDPOINT,
  DEFAULT_HEALTH_INITIAL_DELAY_MS,
  DEFAULT_HEALTH_REQUEST_TIMEOUT_MS,
  DEFAULT_HEALTH_RETRIES,
  DEFAULT_HEALTH_RETRY_DELAY_MS,
  ENGINE_ROOT,
  PROJECT_ROOT,
  DEPLOY_DIR,
  ENVIRONMENTS_DIR: getEnvironmentsDir(),
  GENERATED_DIR,
  GENERATED_FILE_MAP,
  HISTORY_DIR,
  LOGS_DIR,
  TEMPLATES_DIR,
  TEMPLATE_FILE_MAP,
  TOPOLOGY_DIR,
  // Re-export for callers that need the raw value
  DEPLOYMENT_ROOT: ENGINE_ROOT,
}
