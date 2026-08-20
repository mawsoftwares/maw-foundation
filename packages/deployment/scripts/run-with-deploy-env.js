#!/usr/bin/env node
/**
 * Load a deployment .env file (dotenv parser) and run a shell command.
 * Usage: node deployment/scripts/run-with-deploy-env.js <envFile> <command...>
 * Example: node deployment/scripts/run-with-deploy-env.js deployment-config/.env npm run migrate:uat
 */
const path = require('path')
const { spawnSync } = require('child_process')
const dotenv = require('dotenv')

const envFileArg = process.argv[2]
const commandParts = process.argv.slice(3)

if (!envFileArg || commandParts.length === 0) {
  console.error(
    'Usage: node deployment/scripts/run-with-deploy-env.js <envFile> <command> [args...]'
  )
  process.exit(1)
}

const envFilePath = path.resolve(process.cwd(), envFileArg)
const loaded = dotenv.config({ path: envFilePath })

if (loaded.error) {
  console.error(`Failed to load env file: ${envFilePath}`)
  console.error(loaded.error.message)
  process.exit(1)
}

const command = commandParts.join(' ')
const result = spawnSync(command, {
  shell: true,
  stdio: 'inherit',
  env: process.env,
})

process.exit(result.status === null ? 1 : result.status)
