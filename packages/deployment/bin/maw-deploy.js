#!/usr/bin/env node

/**
 * CLI entry point for @mawsoftwares/deploy.
 *
 * Usage (from any project that has a deploy/ folder):
 *   npx @mawsoftwares/deploy list
 *   npx @mawsoftwares/deploy staging
 *   npx @mawsoftwares/deploy production --dry-run
 *   npx @mawsoftwares/deploy production --setup-https
 *
 * The engine resolves project-specific paths (environments, generated, logs)
 * from the project root — no need to copy the deployment package into every repo.
 *
 * Quick setup for a new project:
 *   npx @mawsoftwares/deploy init
 */
const path = require('path')
const fs = require('fs')
const { PROJECT_ROOT, DEPLOY_DIR, ENVIRONMENTS_DIR, ENGINE_ROOT } = require('../scripts/utils/constants')

const command = process.argv[2]

if (command === 'init') {
  initProject()
  process.exit(0)
}

if (command === 'info') {
  console.log('Engine root:       ', ENGINE_ROOT)
  console.log('Project root:      ', PROJECT_ROOT)
  console.log('Deploy dir:        ', DEPLOY_DIR)
  console.log('Environments dir:  ', ENVIRONMENTS_DIR)
  console.log('')
  const envs = fs.existsSync(ENVIRONMENTS_DIR)
    ? fs.readdirSync(ENVIRONMENTS_DIR, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
    : []
  console.log('Environments:      ', envs.length > 0 ? envs.join(', ') : '(none — run `npx @mawsoftwares/deploy init`)')
  process.exit(0)
}

// Forward to the main deploy script for all other commands
const { runCli } = require('../scripts/deploy')
runCli()

// ---------------------------------------------------------------------------
// init — scaffold a deploy/ folder in the current project
// ---------------------------------------------------------------------------
function initProject() {
  const dirs = [
    path.join(DEPLOY_DIR, 'environments', 'staging'),
    path.join(DEPLOY_DIR, 'environments', 'production'),
    path.join(DEPLOY_DIR, 'generated'),
    path.join(DEPLOY_DIR, 'logs'),
    path.join(DEPLOY_DIR, 'history'),
  ]

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // .gitignore for deploy/
  const gitignorePath = path.join(DEPLOY_DIR, '.gitignore')
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, [
      'generated/',
      'logs/',
      '# Keep .env.example, ignore actual .env files',
      'environments/**/.env',
      '!environments/**/.env.example',
    ].join('\n') + '\n')
  }

  // Sample staging app.config.json
  const stagingConfig = path.join(DEPLOY_DIR, 'environments', 'staging', 'app.config.json')
  if (!fs.existsSync(stagingConfig)) {
    fs.writeFileSync(stagingConfig, JSON.stringify({
      name: 'staging',
      type: 'staging',
      hosting: { topology: 'proxied-subpath' },
      branch: 'release/staging',
      server: 'YOUR_SERVER_IP',
      deployPath: '/home/deploy/staging/your-app',
      generatedSubPath: 'deployment-config',
      processManager: { name: 'your-app-staging' },
      ports: { backend: 4001, frontend: 3001 },
      domain: 'your-domain.com',
      database: { name: 'your_db_staging', host: 'localhost', port: 5432 },
      features: {},
      runtime: {
        startScript: 'dist/server.js',
        instances: 1,
        execMode: 'fork',
        maxMemoryRestart: '500M',
      },
      ssh: {
        user: 'deploy',
        keyPath: '~/.ssh/id_rsa',
        shellInit: 'source ~/.nvm/nvm.sh',
      },
      deployment: {
        projectRoot: '/home/deploy/staging/your-app',
        repoUrl: 'git@github.com:your-org/your-repo.git',
        pm2Command: 'pm2 startOrReload {{ecosystemPath}}',
        commands: {
          pull: 'git fetch origin && git checkout -B release/staging origin/release/staging',
          install: 'npm install',
          build: 'npm run build',
          migrate: 'npm run db:migrate',
        },
      },
      health: { protocol: 'http', endpoint: '/health' },
    }, null, 2) + '\n')
  }

  // Sample .env.example
  const envExample = path.join(DEPLOY_DIR, 'environments', 'staging', '.env.example')
  if (!fs.existsSync(envExample)) {
    fs.writeFileSync(envExample, [
      '# Database',
      'DB_HOST=localhost',
      'DB_PORT=5432',
      'DB_NAME=your_db_staging',
      'DB_USER=your_user',
      'DB_PASSWORD=',
      '',
      '# App',
      'JWT_SECRET=change-me',
      'NODE_ENV=staging',
      'PORT=4001',
    ].join('\n') + '\n')
  }

  // deploy.config.json at project root (optional, for custom deploy dir name)
  const deployConfig = path.join(PROJECT_ROOT, 'deploy.config.json')
  if (!fs.existsSync(deployConfig)) {
    fs.writeFileSync(deployConfig, JSON.stringify({
      deployDir: 'deploy',
      description: 'Deployment config for @mawsoftwares/deploy. The deployDir points to the folder containing environments/, generated/, logs/.',
    }, null, 2) + '\n')
  }

  console.log('Initialized deploy/ folder:')
  console.log('')
  console.log('  deploy/')
  console.log('  ├── environments/')
  console.log('  │   ├── staging/')
  console.log('  │   │   ├── app.config.json   ← edit this')
  console.log('  │   │   └── .env.example       ← copy to .env, fill secrets')
  console.log('  │   └── production/            ← add when ready')
  console.log('  ├── generated/                 (gitignored)')
  console.log('  ├── logs/                      (gitignored)')
  console.log('  ├── history/')
  console.log('  └── .gitignore')
  console.log('')
  console.log('Next steps:')
  console.log('  1. Edit deploy/environments/staging/app.config.json')
  console.log('  2. Copy .env.example → .env and fill in secrets')
  console.log('  3. npx @mawsoftwares/deploy staging --dry-run')
}
