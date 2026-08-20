#!/usr/bin/env node
const {
  DEFAULT_HEALTH_ENDPOINT,
  DEFAULT_HEALTH_INITIAL_DELAY_MS,
  DEFAULT_HEALTH_REQUEST_TIMEOUT_MS,
  DEFAULT_HEALTH_RETRIES,
  DEFAULT_HEALTH_RETRY_DELAY_MS,
} = require('./utils/constants')
const { sshExecSoft, shellQuote } = require('./utils/ssh')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function localHealthUrl(manifest) {
  const endpoint = manifest.health?.endpoint || DEFAULT_HEALTH_ENDPOINT
  const port = manifest.ports.backend
  return `http://127.0.0.1:${port}${endpoint}`
}

function probeHealthOnce(manifest, timeoutMs = DEFAULT_HEALTH_REQUEST_TIMEOUT_MS, logger) {
  return new Promise((resolve, reject) => {
    const url = localHealthUrl(manifest)
    const seconds = Math.max(1, Math.ceil(timeoutMs / 1000))
    const command = `curl -sf --max-time ${seconds} ${shellQuote(url)}`
    const result = sshExecSoft(manifest, command, { logger })
    if (result.status === 0) {
      resolve({ ok: true, statusCode: 200, url })
      return
    }
    reject(
      new Error(
        `Health check failed at ${url} (remote curl exit ${result.status}). ` +
          `If the process is crashing, run: pm2 logs ${manifest.processManager?.name || ''} --lines 80`
      )
    )
  })
}

/**
 * Poll the backend health endpoint after PM2 restart.
 * Retries handle slow startup and brief ECONNREFUSED windows.
 */
async function runHealthCheck(manifest, options = {}) {
  const logger = options.logger
  const url = localHealthUrl(manifest)
  const processName = manifest.processManager?.name || 'backend'

  const maxAttempts = manifest.health?.retries ?? options.retries ?? DEFAULT_HEALTH_RETRIES
  const retryDelayMs =
    manifest.health?.retryDelayMs ?? options.retryDelayMs ?? DEFAULT_HEALTH_RETRY_DELAY_MS
  const initialDelayMs =
    manifest.health?.initialDelayMs ?? options.initialDelayMs ?? DEFAULT_HEALTH_INITIAL_DELAY_MS
  const requestTimeoutMs =
    manifest.health?.timeoutMs ?? options.timeoutMs ?? DEFAULT_HEALTH_REQUEST_TIMEOUT_MS

  if (initialDelayMs > 0) {
    if (logger) {
      logger.info('Waiting before health check', { initialDelayMs, url })
    }
    await sleep(initialDelayMs)
  }

  let lastError = new Error('Health check did not run')

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (logger) {
        logger.info('Health check attempt', { attempt, maxAttempts, url })
      }
      const result = await probeHealthOnce(manifest, requestTimeoutMs, logger)
      if (logger && attempt > 1) {
        logger.info('Health check succeeded after retry', { attempt, url })
      }
      return { ...result, attempts: attempt }
    } catch (error) {
      lastError = error
      if (logger) {
        logger.warn('Health check attempt failed', {
          attempt,
          maxAttempts,
          url,
          error: error.message,
        })
      }
      if (attempt < maxAttempts) {
        await sleep(retryDelayMs)
      }
    }
  }

  throw new Error(
    `Health check failed after ${maxAttempts} attempts at ${url}: ${lastError.message}. ` +
      `Check PM2 logs: pm2 logs ${processName} --lines 80`
  )
}

if (require.main === module) {
  console.error(
    'This module is intended to be used by deployment scripts. Use node deployment/scripts/deploy.js <environment>.'
  )
}

module.exports = {
  probeHealthOnce,
  runHealthCheck,
}
