const fs = require('fs')
const { DeploymentError } = require('./errors')

const PLACEHOLDER_VALUES = new Set([
  '',
  'your_db_host',
  'your_password_here',
  'changeme',
  'replace_me',
  'your_secure_production_session_secret',
])

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const env = {}
  const content = fs.readFileSync(filePath, 'utf8')

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) {
      continue
    }

    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

function isPlaceholder(value) {
  if (value === undefined || value === null) {
    return true
  }
  return PLACEHOLDER_VALUES.has(String(value).trim())
}

/**
 * Merge deployment .env with manifest.database defaults (portable across projects).
 * Only fills missing/placeholder DB_HOST and DB_PORT — never overwrites explicit values.
 */
function prepareDeployEnv(manifest, envVars) {
  const prepared = { ...envVars }
  const db = manifest.database || {}

  if (db.host && isPlaceholder(prepared.DB_HOST)) {
    prepared.DB_HOST = db.host.trim()
  }

  if (db.port && isPlaceholder(prepared.DB_PORT)) {
    prepared.DB_PORT = String(db.port)
  }

  if (db.name && isPlaceholder(prepared.DB_USER)) {
    prepared.DB_USER = db.name.trim()
  }

  return prepared
}

function validateDeployEnv(manifest, envVars) {
  const errors = []
  const warnings = []
  const db = manifest.database || {}

  if (isPlaceholder(envVars.DB_HOST)) {
    errors.push(
      `DB_HOST is missing or still a placeholder. Set it in deployment/environments/${manifest.name}/.env ` +
        `(expected host from app.config.json: "${db.host}")`
    )
  }

  if (isPlaceholder(envVars.DB_PASSWORD)) {
    errors.push(
      `DB_PASSWORD is missing or still a placeholder. Set the real database password in deployment/environments/${manifest.name}/.env`
    )
  }

  if (isPlaceholder(envVars.SESSION_SECRET)) {
    errors.push(
      `SESSION_SECRET is missing or still a placeholder. The app will crash on boot without it. Set it in deployment/environments/${manifest.name}/.env`
    )
  }

  if (isPlaceholder(envVars.DB_NAME)) {
    errors.push(`DB_NAME is missing or still a placeholder in deployment/environments/${manifest.name}/.env`)
  }

  if (
    db.host &&
    envVars.DB_HOST &&
    !isPlaceholder(envVars.DB_HOST) &&
    envVars.DB_HOST.trim() !== db.host.trim()
  ) {
    errors.push(
      `DB_HOST "${envVars.DB_HOST}" does not match app.config.json database.host "${db.host}". ` +
        'Update deployment/environments/' +
        `${manifest.name}/.env or change database.host in the manifest so they agree.`
    )
  }

  if (errors.length > 0) {
    throw new DeploymentError('Deployment environment validation failed', { errors, warnings })
  }

  return { ok: true, warnings }
}

function formatEnvFile(envVars) {
  return `${Object.entries(envVars)
    .map(([key, value]) => {
      const stringValue = String(value)
      if (/[\s#"'=]/.test(stringValue)) {
        return `${key}="${stringValue.replace(/"/g, '\\"')}"`
      }
      return `${key}=${stringValue}`
    })
    .join('\n')}\n`
}

module.exports = {
  formatEnvFile,
  isPlaceholder,
  parseEnvFile,
  prepareDeployEnv,
  validateDeployEnv,
}
