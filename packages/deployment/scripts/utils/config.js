const fs = require('fs')
const path = require('path')
const { ENVIRONMENTS_DIR } = require('./constants')
const { DeploymentError } = require('./errors')
const { readJsonFileSync } = require('./fileSystem')

function listEnvironments() {
  if (!fs.existsSync(ENVIRONMENTS_DIR)) {
    return []
  }

  return fs
    .readdirSync(ENVIRONMENTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function getEnvironmentDir(environment) {
  return path.join(ENVIRONMENTS_DIR, environment)
}

function loadEnvironmentConfig(environment) {
  const envDir = getEnvironmentDir(environment)
  const manifestPath = path.join(envDir, 'app.config.json')
  const envFilePath = path.join(envDir, '.env')
  const envExamplePath = path.join(envDir, '.env.example')

  if (!fs.existsSync(envDir)) {
    throw new DeploymentError(`Unknown environment "${environment}"`, {
      availableEnvironments: listEnvironments(),
    })
  }

  if (!fs.existsSync(manifestPath)) {
    throw new DeploymentError(`Missing manifest file for "${environment}"`, {
      expectedPath: manifestPath,
    })
  }

  const resolvedEnvPath = fs.existsSync(envFilePath)
    ? envFilePath
    : fs.existsSync(envExamplePath)
      ? envExamplePath
      : null

  if (!resolvedEnvPath) {
    throw new DeploymentError(`Missing .env file for "${environment}"`, {
      expectedPath: envFilePath,
    })
  }

  const manifest = readJsonFileSync(manifestPath)
  return {
    environment,
    envDir,
    envFilePath: resolvedEnvPath,
    usingExampleEnv: resolvedEnvPath === envExamplePath,
    manifest,
    manifestPath,
  }
}

module.exports = {
  getEnvironmentDir,
  listEnvironments,
  loadEnvironmentConfig,
}
