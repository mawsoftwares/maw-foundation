#!/usr/bin/env node
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawnSync } = require('child_process')
const { listEnvironments, loadEnvironmentConfig } = require('./utils/config')
const { createDeploymentLogger } = require('./utils/logger')
const { validateManifest } = require('./utils/validation')
const { ensureDirSync } = require('./utils/fileSystem')
const {
  sshExec,
  sshMkdir,
  scpUploadWithSudoFallback,
  canUseNonInteractiveSudo,
  uploadDirectory,
  shellQuote,
} = require('./utils/ssh')
const { generateRuntimeFiles } = require('./generate-runtime-files')
const { runHealthCheck } = require('./health-check')
const { appendHistory } = require('./rollback')
const { HISTORY_DIR, GENERATED_FILE_MAP, PROJECT_ROOT } = require('./utils/constants')
const {
  formatEnvFile,
  parseEnvFile,
  prepareDeployEnv,
  validateDeployEnv,
} = require('./utils/deployEnv')
const { setupNginxIfNeeded } = require('./utils/nginxInstall')
const { collectNpmRunNames } = require('./ensure-package-scripts')
const {
  isFrontend,
  resolveConfigOutputRoot,
  resolveLocalDist,
  resolveStaticRoot,
} = require('./utils/topology')

function printHelp() {
  console.log('Usage:')
  console.log(
    '  npx @maw/deploy <environment> [--dry-run] [--skip-nginx] [--skip-build] [--yes-nginx] [--ssl-ready] [--setup-https] [--project-root <path>]'
  )
  console.log('  npx @maw/deploy list')
  console.log('  npx @maw/deploy init                     Scaffold a deploy/ folder in the current project')
  console.log('  npx @maw/deploy info                     Show resolved paths and available environments')
  console.log('')
  console.log('Options:')
  console.log('  --dry-run       Show what would happen without executing')
  console.log('  --setup-https   One-shot: HTTP bootstrap nginx → certbot → HTTPS nginx')
  console.log('  --yes-nginx     Install/reload nginx vhost without prompting')
  console.log('  --ssl-ready     Use HTTPS nginx template (certs already issued)')
  console.log('  --skip-nginx    Skip nginx install (app deploy only)')
  console.log('  --skip-build    Skip frontend local build (upload existing dist) or backend remote build')
  console.log('  --project-root  Override project root path (default: auto-detected)')
}

function executeStep({ dryRun, logger, title, command, manifest }) {
  logger.info(`STEP: ${title}`, { command, remoteDir: manifest.deployment.projectRoot })
  if (dryRun) {
    logger.info(`DRY RUN: skipped command for step "${title}"`)
    return
  }
  const remoteDir = manifest.deployment.projectRoot
  sshExec(manifest, `cd ${remoteDir} && ${command}`, { logger })
}

function parseArguments(argv) {
  const args = argv.slice(2)
  let command
  const flags = []
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--project-root') {
      i += 1
      continue
    }
    if (arg.startsWith('--')) {
      flags.push(arg)
      continue
    }
    if (!command) {
      command = arg
    }
  }
  return {
    command,
    dryRun: flags.includes('--dry-run'),
    skipNginx: flags.includes('--skip-nginx'),
    skipBuild: flags.includes('--skip-build'),
    yesNginx: flags.includes('--yes-nginx') || flags.includes('--setup-https'),
    sslCertsReady: flags.includes('--ssl-ready'),
    setupHttps: flags.includes('--setup-https'),
  }
}

function listAvailableEnvironments() {
  const environments = listEnvironments()
  if (environments.length === 0) {
    console.log('No environments found.')
    return
  }
  environments.forEach((name) => console.log(name))
}

function writeDeploymentHistory(environment, payload) {
  ensureDirSync(path.join(HISTORY_DIR, environment))
  appendHistory(environment, payload)
}

function isRemoteDirectoryEmpty(manifest, remoteDir, { logger }) {
  try {
    sshExec(
      manifest,
      `[ ! -d "${remoteDir}" ] || [ -z "$(ls -A "${remoteDir}" 2>/dev/null)" ]`,
      { logger }
    )
    return true
  } catch (_) {
    return false
  }
}

function initGitInExistingDirectory(manifest, remoteDir, repoUrl, branch, { logger }) {
  sshExec(manifest, `cd "${remoteDir}" && git init`, { logger })
  sshExec(
    manifest,
    `cd "${remoteDir}" && (git remote add origin "${repoUrl}" 2>/dev/null || git remote set-url origin "${repoUrl}")`,
    { logger }
  )
  sshExec(manifest, `cd "${remoteDir}" && git fetch origin "${branch}"`, { logger })
  sshExec(
    manifest,
    `cd "${remoteDir}" && git checkout -f -B "${branch}" "origin/${branch}"`,
    { logger }
  )
}

/**
 * Clone the repo on first deploy only. If `.git` already exists, skip entirely
 * and let the later pull step update the checkout.
 */
function ensureRemoteGitRepo(manifest, { logger, dryRun }) {
  const remoteDir = manifest.deployment.projectRoot
  const repoUrl = manifest.deployment.repoUrl
  const branch = manifest.branch

  if (dryRun) {
    logger.info('DRY RUN: skipped ensure git repo step', { remoteDir, repoUrl, branch })
    return
  }

  if (!repoUrl) {
    throw new Error('deployment.repoUrl is required for remote deployment')
  }

  try {
    sshExec(manifest, `test -d "${remoteDir}/.git"`, { logger })
    logger.info('Repository already cloned, skipping clone', { remoteDir })
    return
  } catch (_) {
    // Not cloned yet — bootstrap below.
  }

  sshMkdir(manifest, remoteDir, { logger })

  if (isRemoteDirectoryEmpty(manifest, remoteDir, { logger })) {
    logger.info('Cloning repository on server (first deploy)', { remoteDir, repoUrl, branch })
    sshExec(
      manifest,
      `git clone --branch "${branch}" "${repoUrl}" "${remoteDir}"`,
      { logger }
    )
    return
  }

  logger.info('Initializing git in existing directory (first deploy)', { remoteDir, repoUrl, branch })
  initGitInExistingDirectory(manifest, remoteDir, repoUrl, branch, { logger })
}

function runLocalFrontendBuild(manifest, envVars, { logger, dryRun, skipBuild }) {
  const localDist = resolveLocalDist(manifest, PROJECT_ROOT)
  const command = manifest.deployment?.commands?.build || 'npm run build'

  if (skipBuild) {
    logger.info('Skipping local frontend build (--skip-build)', { localDist })
  } else {
    logger.info('STEP: Build frontend locally', {
      command,
      cwd: PROJECT_ROOT,
      output: localDist,
    })
    if (dryRun) {
      logger.info('DRY RUN: skipped local frontend build')
    } else {
      const result = spawnSync(command, {
        shell: true,
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        env: { ...process.env, ...envVars },
      })
      if (result.status !== 0) {
        throw new Error(`Local frontend build failed (exit ${result.status ?? 'null'})`)
      }
    }
  }

  if (!dryRun) {
    const indexHtml = path.join(localDist, 'index.html')
    if (!fs.existsSync(indexHtml)) {
      throw new Error(`Frontend dist is missing index.html at ${indexHtml}`)
    }
  }

  return localDist
}

async function deploy(environment, options = {}) {
  const dryRun = Boolean(options.dryRun)
  const skipNginx = Boolean(options.skipNginx)
  const skipBuild = Boolean(options.skipBuild)
  const yesNginx = Boolean(options.yesNginx)
  const sslCertsReady = Boolean(options.sslCertsReady)
  const setupHttps = Boolean(options.setupHttps)
  const logger = createDeploymentLogger(environment)
  const startedAt = new Date().toISOString()
  const availableEnvironments = listEnvironments()
  const { manifest, envFilePath, usingExampleEnv } = loadEnvironmentConfig(environment)
  validateManifest(manifest, availableEnvironments)

  const frontend = isFrontend(manifest)
  if (usingExampleEnv) {
    logger.warn('Using .env.example because .env is missing. Copy it to .env before a real deploy.')
  }

  const rawEnvVars = parseEnvFile(envFilePath)
  const preparedEnvVars = prepareDeployEnv(manifest, rawEnvVars)
  const envValidation = validateDeployEnv(manifest, preparedEnvVars, {
    allowPlaceholders: dryRun,
  })
  envValidation.warnings.forEach((warning) => logger.warn(warning))

  const preparedEnvPath = path.join(os.tmpdir(), `deploy-env-${environment}-${Date.now()}.env`)
  fs.writeFileSync(preparedEnvPath, formatEnvFile(preparedEnvVars), 'utf8')

  logger.info('Prepared deployment environment', {
    dbHost: preparedEnvVars.DB_HOST,
    dbPort: preparedEnvVars.DB_PORT || '5432',
    dbName: preparedEnvVars.DB_NAME,
    manifestDbHost: manifest.database?.host,
  })

  const generated = generateRuntimeFiles(environment, {
    availableEnvironments,
    logger,
    sslCertsReady,
  })
  const deployRoot = manifest.deployPath
  const configOutputRoot = resolveConfigOutputRoot(manifest)
  const ecosystemPath = path.posix.join(configOutputRoot, 'ecosystem.config.js')
  let sudoAvailable = false
  const deploymentRecord = {
    id: `deploy-${Date.now()}`,
    type: 'deployment',
    environment,
    dryRun,
    timestamp: startedAt,
    branch: manifest.branch,
    deployPath: deployRoot,
    generatedFiles: generated.generatedFiles,
    success: false,
  }

  const uploadNginxConfig = (localNginxPath) => {
    scpUploadWithSudoFallback(
      manifest,
      localNginxPath,
      path.posix.join(configOutputRoot, GENERATED_FILE_MAP.nginx),
      { logger, canUseSudoFallback: sudoAvailable }
    )
  }

  try {
    const plannedSteps = frontend
      ? [
          'load manifest',
          'validate config',
          'generate nginx config',
          skipBuild ? 'skip local build' : 'build locally',
          'upload dist/',
          'upload nginx config',
          'optional nginx / HTTPS setup',
        ]
      : [
          'load manifest',
          'validate config',
          'generate runtime files',
          'ensure git repository',
          'upload env/config',
          'pull configured branch',
          'install dependencies',
          skipBuild ? 'skip build' : 'build project',
          'ensure package.json migrate/seed scripts',
          'test database connectivity',
          'run migrations',
          'restart PM2',
          'run health check',
          'optional nginx / HTTPS setup',
        ]
    logger.info('Deployment plan', {
      kind: frontend ? 'frontend' : 'backend',
      steps: plannedSteps,
      dryRun,
      setupHttps,
      sslCertsReady,
    })

    if (frontend) {
      const localDist = runLocalFrontendBuild(manifest, preparedEnvVars, {
        logger,
        dryRun,
        skipBuild,
      })
      const staticRoot = resolveStaticRoot(manifest)

      if (dryRun) {
        logger.info('DRY RUN: skipped upload dist/ and nginx config', {
          localDist,
          staticRoot,
          configOutputRoot,
          generatedPreview: generated.generatedFiles,
        })
      } else {
        sudoAvailable = canUseNonInteractiveSudo(manifest, { logger })
        if (sudoAvailable) {
          logger.info('Preflight: non-interactive sudo is available for upload fallback')
        } else {
          logger.warn(
            'Preflight: non-interactive sudo is not available; uploads require direct write access; nginx enable/reload/certbot need passwordless sudo'
          )
        }

        logger.info('Creating remote config directory', { path: configOutputRoot })
        sshMkdir(manifest, configOutputRoot, { logger })
        generated.generatedFiles.forEach((filePath) => {
          scpUploadWithSudoFallback(
            manifest,
            filePath,
            path.posix.join(configOutputRoot, path.basename(filePath)),
            { logger, canUseSudoFallback: sudoAvailable }
          )
        })
        scpUploadWithSudoFallback(manifest, preparedEnvPath, path.posix.join(configOutputRoot, '.env'), {
          logger,
          canUseSudoFallback: sudoAvailable,
        })

        logger.info('Uploading local dist/ to server', { localDist, staticRoot })
        uploadDirectory(manifest, localDist, staticRoot, { logger })
        sshExec(manifest, `test -f ${shellQuote(`${staticRoot}/index.html`)}`, { logger })
        logger.info('Published frontend dist', { staticRoot })
      }
    } else {
      ensureRemoteGitRepo(manifest, { logger, dryRun })

      if (!dryRun) {
        sudoAvailable = canUseNonInteractiveSudo(manifest, { logger })
        if (sudoAvailable) {
          logger.info('Preflight: non-interactive sudo is available for upload fallback')
        } else {
          logger.warn(
            'Preflight: non-interactive sudo is not available; uploads require direct write access; nginx enable/reload/certbot need passwordless sudo'
          )
        }

        logger.info('Creating remote deployment-config directory', { path: configOutputRoot })
        sshMkdir(manifest, configOutputRoot, { logger })
        generated.generatedFiles.forEach((filePath) => {
          scpUploadWithSudoFallback(
            manifest,
            filePath,
            path.posix.join(configOutputRoot, path.basename(filePath)),
            { logger, canUseSudoFallback: sudoAvailable }
          )
        })
        scpUploadWithSudoFallback(manifest, preparedEnvPath, path.posix.join(configOutputRoot, '.env'), {
          logger,
          canUseSudoFallback: sudoAvailable,
        })
        logger.info('Uploaded environment and generated config files', { target: configOutputRoot })
      } else {
        logger.info('DRY RUN: skipped upload env/config step', {
          target: configOutputRoot,
          generatedPreview: generated.generatedFiles,
          preparedDbHost: preparedEnvVars.DB_HOST,
        })
      }

      executeStep({
        dryRun,
        logger,
        manifest,
        title: `Pull branch ${manifest.branch}`,
        command: manifest.deployment.commands.pull,
      })
      executeStep({
        dryRun,
        logger,
        manifest,
        title: 'Install dependencies',
        command: manifest.deployment.commands.install,
      })
      if (skipBuild) {
        logger.info('Skipping build step (--skip-build)')
      } else {
        executeStep({
          dryRun,
          logger,
          manifest,
          title: 'Build project',
          command: manifest.deployment.commands.build,
        })
      }

      const extraScriptNames = [...collectNpmRunNames(manifest.deployment.commands), 'db:test']
      const ensureScriptPath = path.join(__dirname, 'ensure-package-scripts.js')
      logger.info('STEP: Ensure remote package.json has migrate/seed scripts', {
        dryRun,
        extraScriptNames,
      })
      if (dryRun) {
        logger.info('DRY RUN: skipped remote package.json script ensure step')
      } else {
        const remoteEnsurePath = `/tmp/ensure-package-scripts-${Date.now()}.js`
        scpUploadWithSudoFallback(manifest, ensureScriptPath, remoteEnsurePath, {
          logger,
          canUseSudoFallback: sudoAvailable,
        })
        const extraArg = extraScriptNames.filter(Boolean).join(',')
        sshExec(
          manifest,
          `node ${remoteEnsurePath} --root ${manifest.deployment.projectRoot}${extraArg ? ` --scripts ${extraArg}` : ''} && rm -f ${remoteEnsurePath}`,
          { logger }
        )
      }

      executeStep({
        dryRun,
        logger,
        manifest,
        title: 'Test database connectivity',
        command: `node packages/deployment/scripts/run-with-deploy-env.js ${manifest.generatedSubPath}/.env npm run db:test`,
      })
      executeStep({
        dryRun,
        logger,
        manifest,
        title: 'Run database migrations',
        command: manifest.deployment.commands.migrate,
      })
      if (
        typeof manifest.deployment.commands.seed === 'string' &&
        manifest.deployment.commands.seed.trim()
      ) {
        executeStep({
          dryRun,
          logger,
          manifest,
          title: 'Run database seeds',
          command: manifest.deployment.commands.seed,
        })
      }
      executeStep({
        dryRun,
        logger,
        manifest,
        title: 'Restart PM2 process',
        command: manifest.deployment.pm2Command.replace('{{ecosystemPath}}', ecosystemPath),
      })

      if (dryRun) {
        logger.info('DRY RUN: skipped health check')
      } else {
        const health = await runHealthCheck(manifest, { logger })
        logger.info('Health check passed', health)
        deploymentRecord.healthCheck = health
      }
    }

    const nginxResult = await setupNginxIfNeeded(manifest, {
      logger,
      dryRun,
      skipNginx,
      yesNginx,
      sslCertsReady,
      setupHttps,
      environment,
      generateRuntimeFiles,
      uploadNginxConfig: dryRun ? undefined : uploadNginxConfig,
    })
    deploymentRecord.nginx = nginxResult
    if (!nginxResult.skipped) {
      logger.info('Nginx / HTTPS step finished', nginxResult)
    }

    deploymentRecord.success = true
    deploymentRecord.completedAt = new Date().toISOString()
    writeDeploymentHistory(environment, deploymentRecord)
    logger.info('Deployment completed successfully', {
      historyStoredAt: path.join(HISTORY_DIR, environment, 'history.json'),
    })
    return deploymentRecord
  } catch (error) {
    deploymentRecord.success = false
    deploymentRecord.completedAt = new Date().toISOString()
    deploymentRecord.error = error.message
    writeDeploymentHistory(environment, deploymentRecord)
    logger.error('Deployment failed', { error: error.message })
    throw error
  } finally {
    if (fs.existsSync(preparedEnvPath)) {
      fs.unlinkSync(preparedEnvPath)
    }
  }
}

async function runCli() {
  const { command, dryRun, skipNginx, skipBuild, yesNginx, sslCertsReady, setupHttps } =
    parseArguments(process.argv)

  if (!command) {
    printHelp()
    process.exit(1)
  }

  if (command === 'list') {
    listAvailableEnvironments()
    return
  }

  const availableEnvironments = listEnvironments()
  if (!availableEnvironments.includes(command)) {
    console.error(`Invalid environment "${command}"`)
    console.error(`Available: ${availableEnvironments.join(', ')}`)
    process.exit(1)
  }

  try {
    await deploy(command, { dryRun, skipNginx, skipBuild, yesNginx, sslCertsReady, setupHttps })
    console.log(`Deployment command completed for "${command}"${dryRun ? ' (dry run)' : ''}.`)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  runCli()
}

module.exports = {
  deploy,
  runCli,
}
