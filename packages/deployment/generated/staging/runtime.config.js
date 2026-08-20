module.exports = {
  environment: 'staging',
  server: '66.116.243.198',
  deployPath: '/home/deploy/staging/billingapp/backend',
  ports: {
    backend: Number('3030'),
    frontend: Number('3100'),
  },
  domain: 'apps.mawsoftwares.in',
  features: {
  "inventory": true,
  "billing": true
},
}
