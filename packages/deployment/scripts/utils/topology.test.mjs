import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'
import {
  resolveNginxTemplateName,
  resolveFrontendTopology,
  isFrontend,
  resolveStaticRoot,
  resolveConfigOutputRoot,
  resolveLocalDist,
} from './topology.js'

describe('frontend topology', () => {
  it('selects the shared-subpath snippet template', () => {
    const manifest = {
      kind: 'frontend',
      hosting: { topology: 'shared-subpath' },
      static: { basePath: '/maw-staging', nginx: { snippetDir: '/tmp/snippets' } },
    }
    assert.equal(isFrontend(manifest), true)
    assert.equal(resolveFrontendTopology(manifest), 'shared-subpath')
    assert.equal(resolveNginxTemplateName(manifest), 'nginx-frontend-snippet.template.conf')
  })

  it('selects bootstrap then ssl templates for dedicated-root', () => {
    const manifest = {
      kind: 'frontend',
      hosting: { topology: 'dedicated-root' },
      domain: 'app.example.com',
      static: { nginx: { ssl: { enabled: true } } },
    }
    assert.equal(
      resolveNginxTemplateName(manifest, { sslCertsReady: false }),
      'nginx-frontend-bootstrap.template.conf'
    )
    assert.equal(
      resolveNginxTemplateName(manifest, { sslCertsReady: true }),
      'nginx-frontend-ssl.template.conf'
    )
  })

  it('treats frontend deployPath as the nginx root (dist upload, not a git checkout)', () => {
    const manifest = {
      kind: 'frontend',
      deployPath: '/home/deploy/staging/maw-foundation/web',
      generatedSubPath: 'deployment-config-web',
      static: { localDist: 'dist' },
    }
    assert.equal(resolveStaticRoot(manifest), '/home/deploy/staging/maw-foundation/web')
    assert.equal(
      resolveConfigOutputRoot(manifest),
      '/home/deploy/staging/maw-foundation/deployment-config-web'
    )
    assert.equal(
      resolveLocalDist(manifest, '/tmp/sample-web'),
      path.resolve('/tmp/sample-web', 'dist')
    )
  })
})
