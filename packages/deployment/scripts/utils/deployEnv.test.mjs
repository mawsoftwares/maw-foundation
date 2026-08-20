import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isPlaceholder,
  prepareDeployEnv,
  validateDeployEnv,
} from './deployEnv.js'

const stagingManifest = {
  name: 'staging',
  database: {
    host: '103.211.202.236',
    port: 5432,
    name: 'classroom_dev_user',
  },
}

describe('prepareDeployEnv', () => {
  it('fills placeholder DB_HOST from manifest.database.host', () => {
    const prepared = prepareDeployEnv(stagingManifest, {
      DB_HOST: 'your_db_host',
      DB_PASSWORD: 'secret',
      DB_NAME: 'classroom_dev_db',
    })
    assert.equal(prepared.DB_HOST, '103.211.202.236')
    assert.equal(prepared.DB_PORT, '5432')
  })

  it('does not override explicit DB_HOST', () => {
    const prepared = prepareDeployEnv(stagingManifest, {
      DB_HOST: '64.190.63.222',
      DB_PASSWORD: 'secret',
      DB_NAME: 'classroom_dev_db',
    })
    assert.equal(prepared.DB_HOST, '64.190.63.222')
  })
})

describe('validateDeployEnv', () => {
  it('fails on placeholder password', () => {
    assert.throws(
      () =>
        validateDeployEnv(stagingManifest, {
          DB_HOST: '103.211.202.236',
          DB_PASSWORD: 'your_password_here',
          DB_NAME: 'classroom_dev_db',
        }),
      (error) =>
        error.details?.errors?.some((message) => message.includes('DB_PASSWORD')) === true
    )
  })

  it('fails when DB_HOST mismatches manifest', () => {
    assert.throws(
      () =>
        validateDeployEnv(stagingManifest, {
          DB_HOST: '64.190.63.222',
          DB_PASSWORD: 'secret',
          DB_NAME: 'classroom_dev_db',
        }),
      (error) =>
        error.details?.errors?.some((message) => message.includes('does not match')) === true
    )
  })
})

describe('isPlaceholder', () => {
  it('detects template values', () => {
    assert.equal(isPlaceholder('your_db_host'), true)
    assert.equal(isPlaceholder('103.211.202.236'), false)
  })
})
