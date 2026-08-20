const { execFileSync, spawnSync } = require('child_process')
const os = require('os')
const path = require('path')

function resolveKeyPath(keyPath) {
  return keyPath.replace(/^~/, os.homedir())
}

function buildSshArgs(manifest) {
  const { user, keyPath } = manifest.ssh
  const key = resolveKeyPath(keyPath)
  return { user, host: manifest.server, key }
}

const SSH_BASE_ARGS = ['-o', 'StrictHostKeyChecking=no', '-o', 'AddKeysToAgent=yes']

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

/**
 * Optional manifest.ssh.shellInit runs before every remote command (e.g. nvm on non-login shells).
 */
function withRemoteShellInit(manifest, command) {
  const init = manifest.ssh?.shellInit
  if (typeof init !== 'string' || !init.trim()) {
    return command
  }
  return `${init.trim()} && ${command}`
}

/**
 * Run a command on the remote server over SSH.
 * Uses execFileSync so $(...) and other shell syntax run on the remote host only.
 */
function sshExec(manifest, command, { logger } = {}) {
  const { user, host, key } = buildSshArgs(manifest)
  const remoteCommand = withRemoteShellInit(manifest, command)
  if (logger) logger.info(`SSH remote: ${remoteCommand}`)
  execFileSync('ssh', ['-i', key, ...SSH_BASE_ARGS, `${user}@${host}`, remoteCommand], {
    stdio: 'inherit',
  })
}

/**
 * Soft SSH exec — returns spawn result instead of throwing on non-zero exit.
 */
function sshExecSoft(manifest, command, { logger } = {}) {
  const { user, host, key } = buildSshArgs(manifest)
  const remoteCommand = withRemoteShellInit(manifest, command)
  if (logger) logger.info(`SSH remote: ${remoteCommand}`)
  return spawnSync('ssh', ['-i', key, ...SSH_BASE_ARGS, `${user}@${host}`, remoteCommand], {
    stdio: 'inherit',
  })
}

/**
 * Ensure a directory exists on the remote server.
 */
function sshMkdir(manifest, remotePath, { logger } = {}) {
  sshExec(manifest, `mkdir -p ${remotePath}`, { logger })
}

/**
 * Copy a local file to a remote path via SCP.
 */
function scpUpload(manifest, localPath, remotePath, { logger } = {}) {
  const { user, host, key } = buildSshArgs(manifest)
  if (logger) logger.info(`SCP: ${localPath} → ${user}@${host}:${remotePath}`)
  execFileSync(
    'scp',
    ['-i', key, ...SSH_BASE_ARGS, localPath, `${user}@${host}:${remotePath}`],
    { stdio: 'inherit' }
  )
}

function canUseNonInteractiveSudo(manifest, { logger } = {}) {
  try {
    sshExec(manifest, 'sudo -n true', { logger })
    return true
  } catch (_) {
    return false
  }
}

function remotePathExists(manifest, remotePath, { logger } = {}) {
  const result = sshExecSoft(manifest, `test -f ${shellQuote(remotePath)}`, { logger })
  return result.status === 0
}

/**
 * Upload a file to the remote host.
 * If direct SCP to the destination path fails (e.g. root-owned target),
 * retry by uploading to /tmp and moving into place with sudo.
 */
function scpUploadWithSudoFallback(
  manifest,
  localPath,
  remotePath,
  { logger, canUseSudoFallback = true } = {}
) {
  try {
    scpUpload(manifest, localPath, remotePath, { logger })
    return
  } catch (_) {
    if (!canUseSudoFallback) {
      throw new Error(
        `Direct SCP upload failed for "${remotePath}" and non-interactive sudo is not available. ` +
          'Grant write permission to the destination or configure passwordless sudo for deployment.'
      )
    }

    if (logger) {
      logger.warn('Direct SCP upload failed, retrying via /tmp + sudo move', {
        localPath,
        remotePath,
      })
    }

    const tempRemotePath = path.posix.join(
      '/tmp',
      `${path.posix.basename(remotePath)}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`
    )
    const remoteDir = path.posix.dirname(remotePath)
    scpUpload(manifest, localPath, tempRemotePath, { logger })
    sshExec(
      manifest,
      `sudo mkdir -p ${shellQuote(remoteDir)} && sudo mv ${shellQuote(tempRemotePath)} ${shellQuote(remotePath)}`,
      { logger }
    )
    if (logger) {
      logger.info('Uploaded file via /tmp and moved into destination with sudo', {
        localPath,
        remotePath,
      })
    }
    return
  }
}

module.exports = {
  sshExec,
  sshExecSoft,
  sshMkdir,
  scpUpload,
  scpUploadWithSudoFallback,
  canUseNonInteractiveSudo,
  remotePathExists,
  shellQuote,
}
