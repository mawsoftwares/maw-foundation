module.exports = {
  apps: [
    {
      name: '{{appName}}',
      script: '{{deployPath}}/{{startScript}}',
      cwd: '{{deployPath}}',
      instances: {{runtimeInstances}},
      exec_mode: '{{execMode}}',
      autorestart: true,
      watch: false,
      max_memory_restart: '{{maxMemoryRestart}}',
      env_file: '{{deploymentEnvFile}}',
      env: {
        NODE_ENV: '{{envName}}',
        PORT: '{{backendPort}}',
        DEPLOY_ENV_FILE: '{{deploymentEnvFile}}',
      },
    },
  ],
}
