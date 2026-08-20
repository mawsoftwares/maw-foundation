#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { HISTORY_DIR } = require('./utils/constants')
const { ensureDirSync } = require('./utils/fileSystem')
const { createDeploymentLogger } = require('./utils/logger')

function getHistoryPath(environment) {
  return path.join(HISTORY_DIR, environment, 'history.json')
}

function readHistory(environment) {
  const historyPath = getHistoryPath(environment)
  if (!fs.existsSync(historyPath)) {
    return []
  }
  return JSON.parse(fs.readFileSync(historyPath, 'utf8'))
}

function appendHistory(environment, record) {
  const historyPath = getHistoryPath(environment)
  ensureDirSync(path.dirname(historyPath))
  const history = readHistory(environment)
  history.push(record)
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8')
}

function rollback(environment) {
  const logger = createDeploymentLogger(environment)
  const history = readHistory(environment)
  const latest = [...history].reverse().find((item) => item.type === 'deployment' && item.success)

  if (!latest) {
    logger.warn('No successful deployment available for rollback')
    return {
      ok: false,
      message: 'No successful deployment record found',
    }
  }

  const rollbackRecord = {
    id: `rollback-${Date.now()}`,
    type: 'rollback',
    timestamp: new Date().toISOString(),
    sourceDeploymentId: latest.id,
    status: 'planned',
    notes: 'Rollback execution is scaffolded for future artifact-based implementation.',
  }

  appendHistory(environment, rollbackRecord)
  logger.info('Rollback record created', rollbackRecord)
  return {
    ok: true,
    message: 'Rollback structure is ready. Implement artifact restore steps when needed.',
    rollbackRecord,
  }
}

if (require.main === module) {
  const environment = process.argv[2]
  if (!environment) {
    console.error('Usage: node deployment/scripts/rollback.js <environment>')
    process.exit(1)
  }

  try {
    const result = rollback(environment)
    console.log(result.message)
    process.exit(result.ok ? 0 : 1)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = {
  appendHistory,
  readHistory,
  rollback,
}
