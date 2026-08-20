module.exports = {
  environment: 'production',
  server: '66.116.243.198',
  deployPath: '/home/deploy/prod/sushmapet/backend',
  ports: {
    backend: Number('4003'),
    frontend: Number('3300'),
  },
  domain: 'api.sushmapet.apps.mawsoftwares.in',
  features: {
  "inventory": true,
  "billing": true
},
}
