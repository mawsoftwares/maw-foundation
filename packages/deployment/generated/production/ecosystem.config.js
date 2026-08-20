module.exports = {
  apps: [
    {
      name: 'sushmapet-production',
      script: '/home/deploy/prod/sushmapet/backend/dist/server.js',
      cwd: '/home/deploy/prod/sushmapet/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: '/home/deploy/prod/sushmapet/backend/deployment-config/.env',
      env: {
        NODE_ENV: 'production',
        PORT: '4003',
        DEPLOY_ENV_FILE: '/home/deploy/prod/sushmapet/backend/deployment-config/.env',
      },
    },
  ],
}
