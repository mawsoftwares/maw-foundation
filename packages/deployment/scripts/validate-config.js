#!/usr/bin/env node
const path = require('path')
const { listEnvironments, loadEnvironmentConfig } = require('./utils/config')
const { validateManifest } = require('./utils/validation')
const { collectNpmRunNames, ensurePackageScripts } = require('./ensure-package-scripts')

function validateConfig(environment) {
  const environments = listEnvironments()
  const { manifest } = loadEnvironmentConfig(environment)
  validateManifest(manifest, environments)
  const scripts = ensurePackageScripts(path.resolve(__dirname, '..', '..'), {
    extraScriptNames: collectNpmRunNames(manifest.deployment?.commands),
  })
  return { environment, manifest, scripts }
}

if (require.main === module) {
  const environment = process.argv[2]
  if (!environment) {
    console.error('Usage: node deployment/scripts/validate-config.js <environment>')
    process.exit(1)
  }

  try {
    const result = validateConfig(environment)
    if (result.scripts.added.length > 0) {
      console.log(`Added npm scripts to package.json: ${result.scripts.added.join(', ')}`)
    }
    console.log(`Configuration for "${environment}" is valid.`)
  } catch (error) {
    console.error(error.message)
    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2))
    }
    process.exit(1)
  }
}

module.exports = {
  validateConfig,
}
