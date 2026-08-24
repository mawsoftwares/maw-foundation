/**
 * Hosting topology — config-driven frontend + backend exposure.
 *
 * Switch approach by changing `kind` and `hosting.topology` in app.config.json
 * (and matching .env).
 *
 * Backend topologies:
 * - proxied-subpath   → API only on localhost; reached via frontend nginx at /basePath/api
 * - dedicated-domain  → API on its own domain (nginx vhost + optional SSL)
 *
 * Frontend topologies:
 * - shared-subpath    → SPA + API proxy as a location snippet on a shared parent vhost
 * - dedicated-root    → SPA on its own domain (nginx vhost + optional SSL)
 */

const path = require('path')

const BACKEND_TOPOLOGIES = {
  PROXIED_SUBPATH: 'proxied-subpath',
  DEDICATED_DOMAIN: 'dedicated-domain',
}

const FRONTEND_TOPOLOGIES = {
  SHARED_SUBPATH: 'shared-subpath',
  DEDICATED_ROOT: 'dedicated-root',
}

const ALLOWED_BACKEND_TOPOLOGIES = Object.values(BACKEND_TOPOLOGIES)
const ALLOWED_FRONTEND_TOPOLOGIES = Object.values(FRONTEND_TOPOLOGIES)

function resolveServiceKind(manifest) {
  if (manifest.kind === 'frontend' || manifest.kind === 'web') {
    return 'frontend'
  }
  return 'backend'
}

function isFrontend(manifest) {
  return resolveServiceKind(manifest) === 'frontend'
}

function slugify(value) {
  const slug = String(value || 'app')
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'app'
}

function resolveBackendTopology(manifest) {
  const explicit = manifest.hosting?.topology
  if (explicit) {
    return explicit
  }

  return BACKEND_TOPOLOGIES.DEDICATED_DOMAIN
}

function resolveFrontendTopology(manifest) {
  const explicit = manifest.hosting?.topology
  if (explicit) {
    return explicit
  }

  return FRONTEND_TOPOLOGIES.DEDICATED_ROOT
}

function isProxiedSubpathTopology(manifest) {
  return !isFrontend(manifest) && resolveBackendTopology(manifest) === BACKEND_TOPOLOGIES.PROXIED_SUBPATH
}

function isDedicatedDomainTopology(manifest) {
  return !isFrontend(manifest) && resolveBackendTopology(manifest) === BACKEND_TOPOLOGIES.DEDICATED_DOMAIN
}

function isFrontendSharedSubpath(manifest) {
  return isFrontend(manifest) && resolveFrontendTopology(manifest) === FRONTEND_TOPOLOGIES.SHARED_SUBPATH
}

function isFrontendDedicatedRoot(manifest) {
  return isFrontend(manifest) && resolveFrontendTopology(manifest) === FRONTEND_TOPOLOGIES.DEDICATED_ROOT
}

function isPublicVhostTopology(manifest) {
  return isDedicatedDomainTopology(manifest) || isFrontendDedicatedRoot(manifest)
}

function resolveBasePath(manifest) {
  const raw = manifest.static?.basePath
  if (!raw || raw === '/') {
    return ''
  }
  return `/${String(raw).replace(/^\/+|\/+$/g, '')}`
}

function resolveStaticRoot(manifest) {
  const deployPath = String(manifest.deployPath || '').replace(/\/$/, '')
  const root = manifest.static?.root
  if (isFrontend(manifest)) {
    if (!root || root === '.' || root === './') {
      return deployPath
    }
  }
  if (!root) {
    return `${deployPath}/dist`
  }
  if (String(root).startsWith('/')) {
    return String(root).replace(/\/$/, '')
  }
  return `${deployPath}/${String(root).replace(/^\/+/, '')}`.replace(/\/$/, '')
}

/**
 * Remote directory for generated nginx/.env files.
 * Frontend keeps this next to the published dist folder so config is not served as static files.
 */
function resolveConfigOutputRoot(manifest) {
  const generated = String(manifest.generatedSubPath || 'deployment-config').replace(/\/$/, '')
  const deployPath = String(manifest.deployPath || '').replace(/\/$/, '')
  if (isFrontend(manifest)) {
    const explicit = manifest.deployment?.configPath
    if (typeof explicit === 'string' && explicit.trim()) {
      return String(explicit).replace(/\/$/, '')
    }
    return `${path.posix.dirname(deployPath)}/${generated}`
  }
  return `${deployPath}/${generated}`
}

function resolveLocalDist(manifest, projectRoot) {
  const local = manifest.static?.localDist || 'dist'
  if (path.isAbsolute(local)) {
    return local
  }
  return path.resolve(projectRoot, local)
}

function resolveNginxSettings(manifest) {
  const nginx = manifest.nginx || {}
  const staticNginx = manifest.static?.nginx || {}

  if (isFrontend(manifest)) {
    const ssl = staticNginx.ssl || nginx.ssl || {}
    return {
      enabled: nginx.enabled !== false && staticNginx.enabled !== false,
      autoInstall: staticNginx.autoInstall ?? nginx.autoInstall,
      confirmBeforeInstall: staticNginx.confirmBeforeInstall ?? nginx.confirmBeforeInstall,
      failOnError: staticNginx.failOnError ?? nginx.failOnError,
      vhostDir:
        staticNginx.vhostDir ||
        staticNginx.sitesAvailable ||
        nginx.vhostDir ||
        '/home/deploy/nginx/vhosts-enabled',
      sitesEnabled: staticNginx.sitesEnabled || nginx.sitesEnabled || '/etc/nginx/sites-enabled',
      snippetDir: staticNginx.snippetDir,
      snippetName: staticNginx.snippetName || slugify(manifest.static?.basePath || manifest.name),
      certbot: staticNginx.certbot || nginx.certbot || {},
      ssl,
    }
  }

  return {
    enabled: nginx.enabled !== false,
    autoInstall: nginx.autoInstall,
    confirmBeforeInstall: nginx.confirmBeforeInstall,
    failOnError: nginx.failOnError,
    vhostDir: nginx.vhostDir || '/home/deploy/nginx/vhosts-enabled',
    sitesEnabled: nginx.sitesEnabled || '/etc/nginx/sites-enabled',
    certbot: nginx.certbot || {},
    ssl: nginx.ssl || {},
  }
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

function validateFrontendTopology(manifest) {
  const errors = []
  const topology = resolveFrontendTopology(manifest)

  if (!ALLOWED_FRONTEND_TOPOLOGIES.includes(topology)) {
    errors.push(
      `frontend hosting.topology must be one of: ${ALLOWED_FRONTEND_TOPOLOGIES.join(', ')} (got "${topology}")`
    )
    return errors
  }

  if (topology === FRONTEND_TOPOLOGIES.SHARED_SUBPATH) {
    if (!resolveBasePath(manifest)) {
      errors.push('shared-subpath topology requires static.basePath (e.g. "/maw-staging")')
    }
    const nginx = resolveNginxSettings(manifest)
    if (!nginx.snippetDir) {
      errors.push('shared-subpath topology requires static.nginx.snippetDir for the parent vhost includes')
    }
  }

  if (topology === FRONTEND_TOPOLOGIES.DEDICATED_ROOT) {
    if (typeof manifest.domain !== 'string' || !manifest.domain.trim()) {
      errors.push('dedicated-root topology requires domain (e.g. "app.yourdomain.com")')
    }
  }

  return errors
}

function resolveNginxTemplateName(manifest, options = {}) {
  if (isFrontend(manifest)) {
    if (isFrontendSharedSubpath(manifest)) {
      return 'nginx-frontend-snippet.template.conf'
    }

    const ssl = resolveNginxSettings(manifest).ssl || {}
    if (!ssl.enabled) {
      return 'nginx-frontend.template.conf'
    }

    const sslCertsReady = Boolean(options.sslCertsReady)
    return sslCertsReady ? 'nginx-frontend-ssl.template.conf' : 'nginx-frontend-bootstrap.template.conf'
  }

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
  const nginx = resolveNginxSettings(manifest)
  const ssl = nginx.ssl || {}
  const acmeRoot = ssl.acmeChallengeRoot || `/home/deploy/${manifest.name}/acme-challenge`
  const backendPort = manifest.static?.apiProxy?.backendPort || manifest.ports?.backend

  return {
    ...manifest,
    backendPort,
    domain,
    envName: manifest.name,
    acmeChallengeRoot: acmeRoot,
    sslListenPort: ssl.listenPort || 443,
    sslCertificate: ssl.certificate || `/etc/letsencrypt/live/${domain}/fullchain.pem`,
    sslCertificateKey: ssl.certificateKey || `/etc/letsencrypt/live/${domain}/privkey.pem`,
    sslRedirectHttp: ssl.redirectHttp !== false,
    sslCertsReady: Boolean(options.sslCertsReady),
    staticRoot: resolveStaticRoot(manifest),
    basePath: resolveBasePath(manifest),
    snippetDir: nginx.snippetDir || '',
  }
}

module.exports = {
  ALLOWED_BACKEND_TOPOLOGIES,
  ALLOWED_FRONTEND_TOPOLOGIES,
  BACKEND_TOPOLOGIES,
  FRONTEND_TOPOLOGIES,
  buildNginxTemplateData,
  isDedicatedDomainTopology,
  isFrontend,
  isFrontendDedicatedRoot,
  isFrontendSharedSubpath,
  isProxiedSubpathTopology,
  isPublicVhostTopology,
  resolveBackendTopology,
  resolveBasePath,
  resolveConfigOutputRoot,
  resolveFrontendTopology,
  resolveLocalDist,
  resolveNginxSettings,
  resolveNginxTemplateName,
  resolveServiceKind,
  resolveStaticRoot,
  validateBackendTopology,
  validateFrontendTopology,
}
