module.exports = {
  apps: [
    {
      name: 'billingapp-staging',
      script: '/home/deploy/staging/billingapp/backend/dist/server.js',
      cwd: '/home/deploy/staging/billingapp/backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_file: '/home/deploy/staging/billingapp/backend/deployment-config/.env',
      env: {
        NODE_ENV: 'staging',
        PORT: '3030',
        DEPLOY_ENV_FILE: '/home/deploy/staging/billingapp/backend/deployment-config/.env',
      },
    },
  ],
}
