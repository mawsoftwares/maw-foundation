#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { loadEnvironmentConfig } = require('./utils/config')
const { createDeploymentLogger } = require('./utils/logger')
const { validateManifest } = require('./utils/validation')
const {
  GENERATED_DIR,
  GENERATED_FILE_MAP,
  TEMPLATE_FILE_MAP,
  TEMPLATES_DIR,
} = require('./utils/constants')
const { ensureDirSync, writeFileSync } = require('./utils/fileSystem')
const { renderTemplate } = require('./utils/templateEngine')
const {
  buildNginxTemplateData,
  isFrontend,
  resolveConfigOutputRoot,
  resolveNginxTemplateName,
  resolveBackendTopology,
  resolveFrontendTopology,
} = require('./utils/topology')

const FRONTEND_SKIP_TYPES = new Set(['ecosystem', 'dockerCompose', 'dockerfile'])

function buildTemplateData(manifest) {
  const processManager = manifest.processManager || {}
  const runtime = manifest.runtime || {}
  const ports = manifest.ports || {}
  return {
    ...manifest,
    appName: processManager.name || `${manifest.name}-app`,
    branch: manifest.branch,
    backendPort: ports.backend || '',
    frontendPort: ports.frontend || '',
    deployPath: manifest.deployPath,
    domain: manifest.domain,
    envName: manifest.name,
    execMode: runtime.execMode || 'fork',
    featuresJson: JSON.stringify(manifest.features || {}, null, 2),
    maxMemoryRestart: runtime.maxMemoryRestart || '256M',
    runtimeInstances: runtime.instances || 1,
    startScript: runtime.startScript || '',
    interpreter: runtime.interpreter || '',
    interpreterArgs: runtime.interpreterArgs || '',
    server: manifest.server,
    generatedSubPath: manifest.generatedSubPath,
    deploymentEnvFile: `${resolveConfigOutputRoot(manifest)}/.env`,
  }
}

function generateRuntimeFiles(environment, options = {}) {
  const logger = options.logger || createDeploymentLogger(environment)
  const { manifest } = loadEnvironmentConfig(environment)
  const available = options.availableEnvironments || [environment]
  validateManifest(manifest, available)

  const outputDir = path.join(GENERATED_DIR, environment)
  ensureDirSync(outputDir)

  const templateData = buildTemplateData(manifest)
  const nginxTemplateData = buildNginxTemplateData(manifest, {
    sslCertsReady: Boolean(options.sslCertsReady),
  })
  const generatedFiles = []

  const frontend = isFrontend(manifest)

  for (const [type, templateName] of Object.entries(TEMPLATE_FILE_MAP)) {
    if (frontend && FRONTEND_SKIP_TYPES.has(type)) {
      continue
    }
    const resolvedTemplateName =
      type === 'nginx' ? resolveNginxTemplateName(manifest, options) : templateName
    const templatePath = path.join(TEMPLATES_DIR, resolvedTemplateName)
    const outputPath = path.join(outputDir, GENERATED_FILE_MAP[type])
    const templateContent = fs.readFileSync(templatePath, 'utf8')
    const data = type === 'nginx' ? nginxTemplateData : templateData
    const rendered = renderTemplate(templateContent, data)
    writeFileSync(outputPath, rendered)
    generatedFiles.push(outputPath)
    logger.info(`Generated ${type} config`, {
      outputPath,
      topology: frontend ? resolveFrontendTopology(manifest) : resolveBackendTopology(manifest),
      template: resolvedTemplateName,
    })
  }

  return { outputDir, generatedFiles, manifest }
}

if (require.main === module) {
  const environment = process.argv[2]
  const sslCertsReady = process.argv.includes('--ssl-ready')
  if (!environment) {
    console.error(
      'Usage: node deployment/scripts/generate-runtime-files.js <environment> [--ssl-ready]'
    )
    process.exit(1)
  }

  try {
    const result = generateRuntimeFiles(environment, { sslCertsReady })
    console.log(`Generated ${result.generatedFiles.length} files in ${result.outputDir}`)
  } catch (error) {
    console.error(error.message)
    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2))
    }
    process.exit(1)
  }
}

module.exports = {
  generateRuntimeFiles,
}
