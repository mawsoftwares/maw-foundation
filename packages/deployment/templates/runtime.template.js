module.exports = {
  environment: '{{envName}}',
  server: '{{server}}',
  deployPath: '{{deployPath}}',
  ports: {
    backend: Number('{{backendPort}}'),
    frontend: Number('{{frontendPort}}'),
  },
  domain: '{{domain}}',
  features: {{featuresJson}},
}
