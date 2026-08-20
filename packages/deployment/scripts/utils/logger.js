const fs = require('fs')
const path = require('path')
const { LOGS_DIR } = require('./constants')
const { ensureDirSync } = require('./fileSystem')

function nowIso() {
  return new Date().toISOString()
}

function createDeploymentLogger(environment) {
  ensureDirSync(LOGS_DIR)
  const filename = `${environment}-${nowIso().replace(/[:.]/g, '-')}.log`
  const filePath = path.join(LOGS_DIR, filename)
  const write = (level, message, metadata = {}) => {
    const entry = {
      timestamp: nowIso(),
      level,
      environment,
      message,
      ...metadata,
    }
    fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf8')
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`
    console.log(`${prefix} ${message}`)
  }

  return {
    filePath,
    debug: (message, metadata) => write('debug', message, metadata),
    info: (message, metadata) => write('info', message, metadata),
    warn: (message, metadata) => write('warn', message, metadata),
    error: (message, metadata) => write('error', message, metadata),
  }
}

module.exports = {
  createDeploymentLogger,
}
