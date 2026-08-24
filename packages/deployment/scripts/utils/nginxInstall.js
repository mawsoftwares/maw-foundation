const path = require('path')
const { confirmPrompt } = require('./confirm')
const { GENERATED_FILE_MAP } = require('./constants')
const {
  isDedicatedDomainTopology,
  isFrontendSharedSubpath,
  isPublicVhostTopology,
  resolveConfigOutputRoot,
  resolveNginxSettings,
  resolveNginxTemplateName,
} = require('./topology')
const { sshExec, sshExecSoft, sshMkdir, remotePathExists, shellQuote } = require('./ssh')

function resolveVhostRemotePath(manifest) {
  const nginx = resolveNginxSettings(manifest)
  return path.posix.join(nginx.vhostDir, `${manifest.domain}.conf`)
}

function resolveRemoteNginxSourcePath(manifest) {
  return path.posix.join(resolveConfigOutputRoot(manifest), GENERATED_FILE_MAP.nginx)
}

function resolveCertbotEmail(manifest) {
  if (process.env.CERTBOT_EMAIL && process.env.CERTBOT_EMAIL.trim()) {
    return process.env.CERTBOT_EMAIL.trim()
  }
  const email = resolveNginxSettings(manifest).certbot?.email
  return typeof email === 'string' && email.trim() ? email.trim() : null
}

function shouldAutoInstallNginx(manifest) {
  const nginx = resolveNginxSettings(manifest)
  if (nginx.enabled === false) {
    return false
  }
  if (isFrontendSharedSubpath(manifest)) {
    return nginx.autoInstall !== false && Boolean(nginx.snippetDir)
  }
  if (!isPublicVhostTopology(manifest)) {
    return false
  }
  return nginx.autoInstall === true
}

function resolveSnippetRemotePath(manifest) {
  const nginx = resolveNginxSettings(manifest)
  return path.posix.join(nginx.snippetDir, `${nginx.snippetName}.conf`)
}

/**
 * Install generated nginx.conf into the deploy-owned vhost dir, enable the site, reload.
 */
function installNginxVhost(manifest, { logger, dryRun = false } = {}) {
  const nginx = resolveNginxSettings(manifest)
  const vhostPath = resolveVhostRemotePath(manifest)
  const sourcePath = resolveRemoteNginxSourcePath(manifest)
  const sitesEnabled = nginx.sitesEnabled
  const enabledLink = path.posix.join(sitesEnabled, `${manifest.domain}.conf`)
  const acmeRoot = nginx.ssl?.acmeChallengeRoot || `/home/deploy/${manifest.name}/acme-challenge`

  if (dryRun) {
    logger.info('DRY RUN: would install nginx vhost', { sourcePath, vhostPath, enabledLink })
    return { dryRun: true, vhostPath, enabledLink, reloadOk: false }
  }

  sshMkdir(manifest, path.posix.dirname(vhostPath), { logger })
  sshMkdir(manifest, acmeRoot, { logger })

  sshExec(
    manifest,
    `cp ${shellQuote(sourcePath)} ${shellQuote(vhostPath)} && chmod 644 ${shellQuote(vhostPath)}`,
    { logger }
  )

  const linkResult = sshExecSoft(
    manifest,
    `sudo ln -sf ${shellQuote(vhostPath)} ${shellQuote(enabledLink)}`,
    { logger }
  )
  if (linkResult.status !== 0) {
    logger.warn(
      'Nginx site symlink failed — create once as root: ' +
        `sudo ln -sf ${vhostPath} ${enabledLink}`
    )
  }

  const reloadResult = sshExecSoft(manifest, 'sudo nginx -t && sudo systemctl reload nginx', {
    logger,
  })
  if (reloadResult.status !== 0) {
    logger.warn(
      'Nginx reload failed — run manually: sudo nginx -t && sudo systemctl reload nginx',
      { vhostPath }
    )
    return {
      vhostPath,
      enabledLink,
      writeOk: true,
      symlinkOk: linkResult.status === 0,
      reloadOk: false,
    }
  }

  logger.info('Nginx vhost installed and reloaded', { vhostPath, enabledLink })
  return {
    vhostPath,
    enabledLink,
    writeOk: true,
    symlinkOk: linkResult.status === 0,
    reloadOk: true,
  }
}

function installNginxSnippet(manifest, { logger, dryRun = false } = {}) {
  const snippetPath = resolveSnippetRemotePath(manifest)
  const sourcePath = resolveRemoteNginxSourcePath(manifest)

  if (dryRun) {
    logger.info('DRY RUN: would install nginx snippet', { sourcePath, snippetPath })
    return { dryRun: true, snippetPath, reloadOk: false }
  }

  sshMkdir(manifest, path.posix.dirname(snippetPath), { logger })
  sshExec(
    manifest,
    `cp ${shellQuote(sourcePath)} ${shellQuote(snippetPath)} && chmod 644 ${shellQuote(snippetPath)}`,
    { logger }
  )

  const reloadResult = sshExecSoft(manifest, 'sudo nginx -t && sudo systemctl reload nginx', {
    logger,
  })
  if (reloadResult.status !== 0) {
    logger.warn(
      'Nginx reload failed after snippet install — run: sudo nginx -t && sudo systemctl reload nginx',
      { snippetPath }
    )
    return { snippetPath, writeOk: true, reloadOk: false }
  }

  logger.info('Nginx snippet installed and reloaded', { snippetPath })
  return { snippetPath, writeOk: true, reloadOk: true }
}

/**
 * Issue (or renew) a Let's Encrypt cert via webroot.
 */
function issueCertificate(manifest, { logger, dryRun = false } = {}) {
  const domain = manifest.domain
  const nginx = resolveNginxSettings(manifest)
  const acmeRoot = nginx.ssl?.acmeChallengeRoot || `/home/deploy/${manifest.name}/acme-challenge`
  const email = resolveCertbotEmail(manifest)

  if (!email) {
    throw new Error(
      'Certbot requires an email. Set nginx.certbot.email in app.config.json or CERTBOT_EMAIL in the environment.'
    )
  }

  const command = [
    'sudo certbot certonly --webroot',
    `-w ${shellQuote(acmeRoot)}`,
    `-d ${shellQuote(domain)}`,
    `--email ${shellQuote(email)}`,
    '--agree-tos',
    '--non-interactive',
    '--keep-until-expiring',
  ].join(' ')

  if (dryRun) {
    logger.info('DRY RUN: would run certbot', { domain, acmeRoot, email })
    return { dryRun: true, domain, issued: false }
  }

  logger.info('Issuing TLS certificate with certbot', { domain, acmeRoot })
  const result = sshExecSoft(manifest, command, { logger })
  if (result.status !== 0) {
    throw new Error(
      `Certbot failed for ${domain}. Ensure DNS points here, HTTP bootstrap nginx is live, and deploy has passwordless sudo for certbot/nginx.`
    )
  }

  const certPath =
    nginx.ssl?.certificate || `/etc/letsencrypt/live/${domain}/fullchain.pem`
  const present = remotePathExists(manifest, certPath, { logger })
  if (!present) {
    throw new Error(`Certbot finished but certificate not found at ${certPath}`)
  }

  logger.info('TLS certificate ready', { domain, certPath })
  return { domain, issued: true, certPath }
}

/**
 * After PM2 health check: optionally install nginx (bootstrap or SSL) and/or run certbot.
 *
 * Flags:
 * - skipNginx / yesNginx / sslCertsReady / setupHttps
 *
 * `--setup-https` = install HTTP bootstrap → certbot → regenerate SSL nginx → install again.
 */
async function setupNginxIfNeeded(manifest, options = {}) {
  const {
    logger,
    dryRun = false,
    skipNginx = false,
    yesNginx = false,
    sslCertsReady = false,
    setupHttps = false,
    environment,
    generateRuntimeFiles,
    uploadNginxConfig,
  } = options

  if (skipNginx || !shouldAutoInstallNginx(manifest)) {
    return { skipped: true, reason: skipNginx ? 'skipped by flag' : 'nginx.autoInstall not enabled' }
  }

  const nginx = resolveNginxSettings(manifest)

  if (isFrontendSharedSubpath(manifest)) {
    const snippetPath = resolveSnippetRemotePath(manifest)
    const requiresConfirmation = nginx.confirmBeforeInstall !== false
    let approved = yesNginx
    if (!approved && requiresConfirmation) {
      approved = await confirmPrompt(
        `Install nginx snippet for ${manifest.static?.basePath || manifest.name} at ${snippetPath} on ${manifest.server}?`
      )
    }
    if (!approved) {
      logger.warn('Nginx snippet install skipped — operator did not confirm', { snippetPath })
      return { skipped: true, reason: 'not confirmed', snippetPath }
    }
    const snippetInstall = installNginxSnippet(manifest, { logger, dryRun })
    return {
      skipped: false,
      kind: 'snippet',
      ...snippetInstall,
      template: resolveNginxTemplateName(manifest, options),
    }
  }

  if (!isPublicVhostTopology(manifest)) {
    return { skipped: true, reason: 'not a public vhost topology' }
  }

  const vhostPath = resolveVhostRemotePath(manifest)
  const requiresConfirmation = nginx.confirmBeforeInstall !== false
  const failOnError = nginx.failOnError === true
  let approved = yesNginx || setupHttps

  if (!approved && requiresConfirmation) {
    const mode = setupHttps
      ? 'HTTP bootstrap + certbot + HTTPS nginx'
      : sslCertsReady
        ? 'HTTPS nginx'
        : 'HTTP bootstrap nginx'
    approved = await confirmPrompt(
      `Install ${mode} for ${manifest.domain} at ${vhostPath} on ${manifest.server}?`
    )
  }

  if (!approved) {
    logger.warn('Nginx install skipped — operator did not confirm', { vhostPath })
    return { skipped: true, reason: 'not confirmed', vhostPath }
  }

  const runInstall = async (label) => {
    try {
      return installNginxVhost(manifest, { logger, dryRun })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (failOnError) {
        throw error
      }
      logger.warn(`Nginx install failed (${label})`, { error: message, vhostPath })
      return { writeOk: false, reloadOk: false, vhostPath, error: message }
    }
  }

  // Phase 1: ensure bootstrap is live when issuing certs or when certs are not ready yet
  let certsReady = Boolean(sslCertsReady)

  if (!certsReady && !setupHttps && nginx.ssl?.enabled) {
    const certPath =
      nginx.ssl.certificate ||
      `/etc/letsencrypt/live/${manifest.domain}/fullchain.pem`
    certsReady = remotePathExists(manifest, certPath, { logger })
    if (certsReady) {
      logger.info('Existing TLS certificate detected — using HTTPS nginx template', { certPath })
    }
  }

  if (setupHttps || !certsReady) {
    // Re-generate bootstrap if current generated file is SSL (e.g. prior --ssl-ready run)
    if (typeof generateRuntimeFiles === 'function' && environment) {
      const generated = generateRuntimeFiles(environment, {
        sslCertsReady: false,
        logger,
      })
      if (typeof uploadNginxConfig === 'function' && !dryRun) {
        const localNginx = generated.generatedFiles.find((file) =>
          file.endsWith(GENERATED_FILE_MAP.nginx)
        )
        if (localNginx) {
          uploadNginxConfig(localNginx)
        }
      }
    }

    const bootstrapInstall = await runInstall('bootstrap')
    if (bootstrapInstall.writeOk === false && failOnError) {
      return { skipped: false, ...bootstrapInstall, phase: 'bootstrap' }
    }

    if (setupHttps) {
      try {
        const certResult = issueCertificate(manifest, { logger, dryRun })
        certsReady = true

        if (typeof generateRuntimeFiles === 'function' && environment) {
          const sslGenerated = generateRuntimeFiles(environment, {
            sslCertsReady: true,
            logger,
          })
          if (typeof uploadNginxConfig === 'function' && !dryRun) {
            const localNginx = sslGenerated.generatedFiles.find((file) =>
              file.endsWith(GENERATED_FILE_MAP.nginx)
            )
            if (localNginx) {
              uploadNginxConfig(localNginx)
            }
          }
        }

        const sslInstall = await runInstall('ssl')
        return {
          skipped: false,
          setupHttps: true,
          certbot: certResult,
          bootstrap: bootstrapInstall,
          ssl: sslInstall,
          template: resolveNginxTemplateName(manifest, { sslCertsReady: true }),
        }
      } catch (error) {
        if (failOnError) {
          throw error
        }
        const message = error instanceof Error ? error.message : String(error)
        logger.warn('HTTPS setup incomplete — HTTP bootstrap may still be active', {
          error: message,
        })
        return {
          skipped: false,
          setupHttps: true,
          bootstrap: bootstrapInstall,
          error: message,
        }
      }
    }

    return {
      skipped: false,
      phase: 'bootstrap',
      ...bootstrapInstall,
      template: resolveNginxTemplateName(manifest, { sslCertsReady: false }),
      hint: 'After DNS works, run: npm run deploy -- production --setup-https',
    }
  }

  // Certs ready — install HTTPS vhost
  if (typeof generateRuntimeFiles === 'function' && environment) {
    const sslGenerated = generateRuntimeFiles(environment, {
      sslCertsReady: true,
      logger,
    })
    if (typeof uploadNginxConfig === 'function' && !dryRun) {
      const localNginx = sslGenerated.generatedFiles.find((file) =>
        file.endsWith(GENERATED_FILE_MAP.nginx)
      )
      if (localNginx) {
        uploadNginxConfig(localNginx)
      }
    }
  }

  const sslInstall = await runInstall('ssl')
  return {
    skipped: false,
    phase: 'ssl',
    ...sslInstall,
    template: resolveNginxTemplateName(manifest, { sslCertsReady: true }),
  }
}

module.exports = {
  installNginxSnippet,
  installNginxVhost,
  issueCertificate,
  resolveCertbotEmail,
  resolveSnippetRemotePath,
  resolveVhostRemotePath,
  setupNginxIfNeeded,
  shouldAutoInstallNginx,
}
