const path = require('path')
const { DeploymentError } = require('./errors')
const {
  isFrontend,
  validateBackendTopology,
  validateFrontendTopology,
} = require('./topology')

function isValidPort(port) {
  return Number.isInteger(port) && port >= 1024 && port <= 65535
}

function isSafeRelativePath(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }
  return !value.includes('..') && !path.isAbsolute(value)
}

function validateManifest(manifest, availableEnvironments) {
  const errors = []
  const frontend = isFrontend(manifest)
  const requiredStringFields = frontend
    ? ['name', 'type', 'server', 'deployPath', 'domain']
    : ['name', 'type', 'branch', 'server', 'deployPath', 'domain']

  requiredStringFields.forEach((field) => {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) {
      errors.push(`Field "${field}" is required and must be a non-empty string`)
    }
  })


  if (manifest.ports && typeof manifest.ports === 'object') {
    const entries = Object.entries(manifest.ports)
    const values = entries.map(([, value]) => value)
    const duplicatePorts = values.filter((value, index) => values.indexOf(value) !== index)

    entries.forEach(([key, value]) => {
      if (!isValidPort(value)) {
        errors.push(`Port "${key}" must be an integer in range 1024-65535`)
      }
    })

    if (duplicatePorts.length > 0) {
      errors.push(`Ports must be unique. Duplicate values: ${[...new Set(duplicatePorts)].join(', ')}`)
    }
  } else if (!frontend) {
    errors.push('Field "ports" is required and must be an object')
  }

  if (frontend) {
    errors.push(...validateFrontendManifest(manifest))
  } else {
    errors.push(...validateBackendManifest(manifest))
  }

  if (typeof manifest.deployPath === 'string') {
    if (!manifest.deployPath.startsWith('/')) {
      errors.push('Field "deployPath" must be an absolute server path')
    }
  }

  if (!isSafeRelativePath(manifest.generatedSubPath || '')) {
    errors.push('Field "generatedSubPath" is required and must be a safe relative path')
  }

  if (manifest.name && !availableEnvironments.includes(manifest.name)) {
    errors.push(
      `Manifest name "${manifest.name}" must match one of available environment directories (${availableEnvironments.join(', ')})`
    )
  }

  errors.push(...(frontend ? validateFrontendTopology(manifest) : validateBackendTopology(manifest)))

  if (errors.length > 0) {
    throw new DeploymentError('Manifest validation failed', { errors })
  }
}

function validateBackendManifest(manifest) {
  const errors = []

  if (!manifest.processManager || typeof manifest.processManager !== 'object') {
    errors.push('Field "processManager" is required and must be an object')
  } else if (
    typeof manifest.processManager.name !== 'string' ||
    !manifest.processManager.name.trim()
  ) {
    errors.push('Field "processManager.name" is required and must be a non-empty string')
  }

  if (!manifest.database || typeof manifest.database !== 'object') {
    errors.push('Field "database" is required and must be an object')
  } else {
    const dbRequired = ['name', 'host']
    dbRequired.forEach((field) => {
      if (typeof manifest.database[field] !== 'string' || !manifest.database[field].trim()) {
        errors.push(`Field "database.${field}" is required and must be a non-empty string`)
      }
    })
    if (!isValidPort(manifest.database.port)) {
      errors.push('Field "database.port" must be an integer in range 1024-65535')
    }
  }

  if (!manifest.features || typeof manifest.features !== 'object') {
    errors.push('Field "features" is required and must be an object')
  }

  if (!manifest.runtime || typeof manifest.runtime !== 'object') {
    errors.push('Field "runtime" is required and must be an object')
  } else {
    if (typeof manifest.runtime.startScript !== 'string' || !manifest.runtime.startScript.trim()) {
      errors.push('Field "runtime.startScript" is required and must be a non-empty string')
    }
    const instanceValue = manifest.runtime.instances
    if (!Number.isInteger(instanceValue) || instanceValue < 1) {
      errors.push('Field "runtime.instances" is required and must be an integer >= 1')
    }
    if (typeof manifest.runtime.execMode !== 'string' || !manifest.runtime.execMode.trim()) {
      errors.push('Field "runtime.execMode" is required and must be a non-empty string')
    }
    if (typeof manifest.runtime.maxMemoryRestart !== 'string' || !manifest.runtime.maxMemoryRestart.trim()) {
      errors.push('Field "runtime.maxMemoryRestart" is required and must be a non-empty string')
    }
  }

  errors.push(...validateDeploymentBlock(manifest, ['pull', 'install', 'build', 'migrate'], true))
  return errors
}

function validateFrontendManifest(manifest) {
  const errors = []
  if (!manifest.deployment || typeof manifest.deployment !== 'object') {
    errors.push('Field "deployment" is required and must be an object')
    return errors
  }
  if (typeof manifest.deployment.repoUrl === 'string' && manifest.deployment.repoUrl.trim()) {
    errors.push(
      'Frontend deploy publishes dist/ only — omit deployment.repoUrl (no git clone on the server)'
    )
  }
  const build = manifest.deployment.commands?.build
  if (build !== undefined && (typeof build !== 'string' || !build.trim())) {
    errors.push('Field "deployment.commands.build" must be a non-empty string when set')
  }
  return errors
}

function validateDeploymentBlock(manifest, commandFields, requirePm2) {
  const errors = []

  if (!manifest.deployment || typeof manifest.deployment !== 'object') {
    errors.push('Field "deployment" is required and must be an object')
    return errors
  }

  if (typeof manifest.deployment.projectRoot !== 'string' || !manifest.deployment.projectRoot.trim()) {
    errors.push('Field "deployment.projectRoot" is required and must be a non-empty string')
  }

  if (requirePm2) {
    if (typeof manifest.deployment.pm2Command !== 'string' || !manifest.deployment.pm2Command.trim()) {
      errors.push('Field "deployment.pm2Command" is required and must be a non-empty string')
    }
  }

  if (!manifest.deployment.commands || typeof manifest.deployment.commands !== 'object') {
    errors.push('Field "deployment.commands" is required and must be an object')
  } else {
    commandFields.forEach((field) => {
      if (
        typeof manifest.deployment.commands[field] !== 'string' ||
        !manifest.deployment.commands[field].trim()
      ) {
        errors.push(`Field "deployment.commands.${field}" is required and must be a non-empty string`)
      }
    })
  }

  return errors
}

module.exports = {
  validateManifest,
}
