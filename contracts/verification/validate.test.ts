/**
 * Unit tests for the contract validation logic itself.
 * These run without either backend — they test the validator.
 */

import { describe, it, expect } from 'vitest';
import { validateResponse, compareResponseShapes } from './validate';
import {
  LoginSuccessResponse,
  FlatErrorResponse,
  UserListResponse,
  HealthResponse,
  UserProfileResponse,
  RoleListResponse,
  SessionListResponse,
  RegisterResponse,
  StorageFileResponse,
  StorageConfigurationResponse,
  StorageUploadResponse,
  StorageErrorResponse,
  StorageFilePageResponse,
} from './response-schemas';

describe('validateResponse', () => {
  it('passes valid login success response', () => {
    const body = { accessToken: 'eyJ...', refreshToken: 'abc', expiresIn: 900 };
    const result = validateResponse(body, LoginSuccessResponse);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when required field is missing', () => {
    const body = { accessToken: 'eyJ...' };
    const result = validateResponse(body, LoginSuccessResponse);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('refreshToken'))).toBe(true);
  });

  it('fails when field type is wrong', () => {
    const body = { accessToken: 123, refreshToken: 'abc', expiresIn: 900 };
    const result = validateResponse(body, LoginSuccessResponse);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Type mismatch'))).toBe(true);
  });

  it('passes valid flat error response', () => {
    const body = { error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };
    const result = validateResponse(body, FlatErrorResponse);
    expect(result.valid).toBe(true);
  });

  it('passes valid user list with envelope', () => {
    const body = {
      success: true,
      data: [{ id: 'u1', email: 'test@example.com' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    const result = validateResponse(body, UserListResponse);
    expect(result.valid).toBe(true);
  });

  it('fails when meta is missing from user list', () => {
    const body = { success: true, data: [] };
    const result = validateResponse(body, UserListResponse);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('meta'))).toBe(true);
  });

  it('detects sensitive field leaks', () => {
    const body = {
      id: 'u1',
      email: 'test@example.com',
      passwordHash: 'secret',
    };
    const result = validateResponse(body, UserProfileResponse);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Sensitive field'))).toBe(true);
  });

  it('passes valid health response', () => {
    const body = { status: 'ok', service: 'maw', timestamp: '2024-01-01T00:00:00Z' };
    const result = validateResponse(body, HealthResponse);
    expect(result.valid).toBe(true);
  });

  it('passes valid register response', () => {
    const body = { userId: 'uuid', emailVerificationRequired: true };
    const result = validateResponse(body, RegisterResponse);
    expect(result.valid).toBe(true);
  });

  it('validates session list structure', () => {
    const body = {
      sessions: [
        { id: 's1', ipAddress: '127.0.0.1', userAgent: 'Test', createdAt: 'iso', lastUsedAt: 'iso' },
      ],
    };
    const result = validateResponse(body, SessionListResponse);
    expect(result.valid).toBe(true);
  });

  it('validates role list data wrapper', () => {
    const body = {
      data: [
        { id: 'r1', name: 'Admin', slug: 'admin', isSystem: true, permissions: ['p1'] },
      ],
    };
    const result = validateResponse(body, RoleListResponse);
    expect(result.valid).toBe(true);
  });
});

describe('compareResponseShapes', () => {
  it('detects missing keys', () => {
    const nodeResp = { accessToken: 'a', refreshToken: 'b', expiresIn: 900 };
    const phpResp = { accessToken: 'x', refreshToken: 'y' };
    const diffs = compareResponseShapes(nodeResp, phpResp);
    expect(diffs.some(d => d.includes('expiresIn'))).toBe(true);
  });

  it('detects extra keys', () => {
    const nodeResp = { accessToken: 'a' };
    const phpResp = { accessToken: 'x', extraField: 'leak' };
    const diffs = compareResponseShapes(nodeResp, phpResp);
    expect(diffs.some(d => d.includes('extraField'))).toBe(true);
  });

  it('detects type mismatches', () => {
    const nodeResp = { expiresIn: 900 };
    const phpResp = { expiresIn: '900' };
    const diffs = compareResponseShapes(nodeResp, phpResp);
    expect(diffs.some(d => d.includes('Type mismatch'))).toBe(true);
  });

  it('recurses into nested objects', () => {
    const nodeResp = { meta: { page: 1, total: 10 } };
    const phpResp = { meta: { page: 1 } };
    const diffs = compareResponseShapes(nodeResp, phpResp);
    expect(diffs.some(d => d.includes('meta.total'))).toBe(true);
  });

  it('returns empty for identical shapes', () => {
    const resp = { accessToken: 'a', refreshToken: 'b', expiresIn: 900 };
    const diffs = compareResponseShapes(resp, { ...resp });
    expect(diffs).toHaveLength(0);
  });
});

describe('storage response schemas', () => {
  const file = { id: 'f1', name: 'a.pdf', mimeType: 'application/pdf', size: 10, folderId: null, status: 'uploaded', createdAt: 't', updatedAt: 't' };
  const config = { id: 'c1', provider: 'azure', name: 'n', bucket: 'b', region: null, endpoint: null, basePath: '', hasCredentials: true, isDefault: false, isActive: true, createdAt: 't', updatedAt: 't' };

  it('accepts a valid file envelope, including a null folderId', () => {
    expect(validateResponse({ success: true, data: file }, StorageFileResponse).valid).toBe(true);
  });

  it('rejects an unknown file status and a leaked object key', () => {
    expect(validateResponse({ success: true, data: { ...file, status: 'weird' } }, StorageFileResponse).valid).toBe(false);
    const leaked = validateResponse({ success: true, data: { ...file, objectKey: 'tenant/x' } }, StorageFileResponse);
    expect(leaked.valid).toBe(false);
    expect(leaked.errors.join()).toContain('objectKey');
  });

  it('flags leaked provider credentials in a configuration', () => {
    expect(validateResponse({ success: true, data: config }, StorageConfigurationResponse).valid).toBe(true);
    const leaked = validateResponse({ success: true, data: { ...config, secretAccessKey: 'x', encryptedCredentials: 'y' } }, StorageConfigurationResponse);
    expect(leaked.errors.join()).toMatch(/secretAccessKey/);
    expect(leaked.errors.join()).toMatch(/encryptedCredentials/);
  });

  it('validates upload tickets and paginated lists', () => {
    expect(validateResponse({ success: true, data: { fileId: 'f', uploadUrl: 'https://x', method: 'PUT', headers: {}, expiresIn: 900 } }, StorageUploadResponse).valid).toBe(true);
    expect(validateResponse({ success: true, data: { fileId: 'f', uploadUrl: 'https://x', method: 'POST', headers: {}, expiresIn: 900 } }, StorageUploadResponse).valid).toBe(false);
    const page = { success: true, data: [file], meta: { pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } } };
    expect(validateResponse(page, StorageFilePageResponse).valid).toBe(true);
    expect(validateResponse({ ...page, meta: {} }, StorageFilePageResponse).valid).toBe(false);
  });

  it('validates storage error envelopes with a known reason', () => {
    const err = { success: false, error: { code: 'NOT_FOUND', message: 'File not found', details: { reason: 'STORAGE_FILE_NOT_FOUND' } } };
    expect(validateResponse(err, StorageErrorResponse).valid).toBe(true);
    expect(validateResponse({ ...err, error: { ...err.error, details: { reason: 'MADE_UP' } } }, StorageErrorResponse).valid).toBe(false);
  });
});
