const path = require('path')
const { DeploymentError } = require('./errors')
const { validateBackendTopology } = require('./topology')

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
  const requiredStringFields = [
    'name',
    'type',
    'branch',
    'server',
    'deployPath',
    'domain',
  ]

  requiredStringFields.forEach((field) => {
    if (typeof manifest[field] !== 'string' || !manifest[field].trim()) {
      errors.push(`Field "${field}" is required and must be a non-empty string`)
    }
  })

  if (!manifest.processManager || typeof manifest.processManager !== 'object') {
    errors.push('Field "processManager" is required and must be an object')
  } else if (
    typeof manifest.processManager.name !== 'string' ||
    !manifest.processManager.name.trim()
  ) {
    errors.push('Field "processManager.name" is required and must be a non-empty string')
  }

  if (!manifest.ports || typeof manifest.ports !== 'object') {
    errors.push('Field "ports" is required and must be an object')
  } else {
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

  if (!manifest.deployment || typeof manifest.deployment !== 'object') {
    errors.push('Field "deployment" is required and must be an object')
  } else {
    const deploymentRequired = ['projectRoot', 'pm2Command']
    deploymentRequired.forEach((field) => {
      if (typeof manifest.deployment[field] !== 'string' || !manifest.deployment[field].trim()) {
        errors.push(`Field "deployment.${field}" is required and must be a non-empty string`)
      }
    })

    if (!manifest.deployment.commands || typeof manifest.deployment.commands !== 'object') {
      errors.push('Field "deployment.commands" is required and must be an object')
    } else {
      const commandFields = ['pull', 'install', 'build', 'migrate']
      commandFields.forEach((field) => {
        if (
          typeof manifest.deployment.commands[field] !== 'string' ||
          !manifest.deployment.commands[field].trim()
        ) {
          errors.push(`Field "deployment.commands.${field}" is required and must be a non-empty string`)
        }
      })
    }
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

  errors.push(...validateBackendTopology(manifest))

  if (errors.length > 0) {
    throw new DeploymentError('Manifest validation failed', { errors })
  }
}

module.exports = {
  validateManifest,
}
