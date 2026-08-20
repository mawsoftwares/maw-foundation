/**
 * Backend hosting topology — config-driven API exposure.
 *
 * Switch approach by changing `hosting.topology` in app.config.json (and matching .env).
 *
 * Topologies:
 * - proxied-subpath   → API only on localhost; reached via frontend nginx at /basePath/api
 * - dedicated-domain  → API on its own domain (nginx vhost + optional SSL)
 */

const BACKEND_TOPOLOGIES = {
  PROXIED_SUBPATH: 'proxied-subpath',
  DEDICATED_DOMAIN: 'dedicated-domain',
}

const ALLOWED_BACKEND_TOPOLOGIES = Object.values(BACKEND_TOPOLOGIES)

function resolveBackendTopology(manifest) {
  const explicit = manifest.hosting?.topology
  if (explicit) {
    return explicit
  }

  return BACKEND_TOPOLOGIES.DEDICATED_DOMAIN
}

function isProxiedSubpathTopology(manifest) {
  return resolveBackendTopology(manifest) === BACKEND_TOPOLOGIES.PROXIED_SUBPATH
}

function isDedicatedDomainTopology(manifest) {
  return resolveBackendTopology(manifest) === BACKEND_TOPOLOGIES.DEDICATED_DOMAIN
}

function validateBackendTopology(manifest) {
  const errors = []
  const topology = resolveBackendTopology(manifest)

  if (!ALLOWED_BACKEND_TOPOLOGIES.includes(topology)) {
    errors.push(
      `hosting.topology must be one of: ${ALLOWED_BACKEND_TOPOLOGIES.join(', ')} (got "${topology}")`
    )
    return errors
  }

  if (topology === BACKEND_TOPOLOGIES.DEDICATED_DOMAIN) {
    if (typeof manifest.domain !== 'string' || !manifest.domain.trim()) {
      errors.push('dedicated-domain topology requires domain (e.g. "api.yourdomain.com")')
    }
  }

  if (topology === BACKEND_TOPOLOGIES.PROXIED_SUBPATH) {
    if (manifest.nginx?.ssl?.enabled) {
      errors.push(
        'proxied-subpath topology must not enable nginx.ssl (API is not exposed on a public domain)'
      )
    }
  }

  return errors
}

function resolveNginxTemplateName(manifest, options = {}) {
  if (isProxiedSubpathTopology(manifest)) {
    return 'nginx-proxied.template.conf'
  }

  const ssl = manifest.nginx?.ssl || {}
  if (!ssl.enabled) {
    return 'nginx.template.conf'
  }

  const sslCertsReady = Boolean(options.sslCertsReady)
  return sslCertsReady ? 'nginx-ssl.template.conf' : 'nginx-bootstrap.template.conf'
}

function buildNginxTemplateData(manifest, options = {}) {
  const domain = manifest.domain
  const ssl = manifest.nginx?.ssl || {}
  const acmeRoot =
    ssl.acmeChallengeRoot || `/home/deploy/${manifest.name}/acme-challenge`

  return {
    ...manifest,
    backendPort: manifest.ports.backend,
    domain,
    envName: manifest.name,
    acmeChallengeRoot: acmeRoot,
    sslListenPort: ssl.listenPort || 443,
    sslCertificate: ssl.certificate || `/etc/letsencrypt/live/${domain}/fullchain.pem`,
    sslCertificateKey: ssl.certificateKey || `/etc/letsencrypt/live/${domain}/privkey.pem`,
    sslRedirectHttp: ssl.redirectHttp !== false,
    sslCertsReady: Boolean(options.sslCertsReady),
  }
}

module.exports = {
  ALLOWED_BACKEND_TOPOLOGIES,
  BACKEND_TOPOLOGIES,
  buildNginxTemplateData,
  isDedicatedDomainTopology,
  isProxiedSubpathTopology,
  resolveBackendTopology,
  resolveNginxTemplateName,
  validateBackendTopology,
}
