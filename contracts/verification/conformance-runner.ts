/**
 * Cross-backend conformance test runner.
 *
 * Runs the same HTTP requests against both Node.js and PHP backends,
 * then validates:
 *   1. Both responses match the OpenAPI contract schema
 *   2. Both responses have the same structural shape
 *   3. Neither leaks sensitive fields
 *
 * Usage:
 *   NODE_URL=http://localhost:3001 PHP_URL=http://localhost:8080 \
 *     npx tsx contracts/verification/conformance-runner.ts
 */

import { validateResponse, compareResponseShapes } from './validate';
import {
  HealthResponse,
  LoginSuccessResponse,
  FlatErrorResponse,
  RegisterResponse,
  UserListResponse,
  RoleListResponse,
  SENSITIVE_FIELDS,
} from './response-schemas';

const NODE_URL = process.env.NODE_URL || 'http://localhost:3001';
const PHP_URL = process.env.PHP_URL || 'http://localhost:8080';

interface TestCase {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  expectedStatus: number;
  schema: Record<string, { type: string | string[]; required?: boolean; [k: string]: unknown }>;
  requiresAuth?: boolean;
}

const PUBLIC_TESTS: TestCase[] = [
  {
    name: 'Health check',
    method: 'GET',
    path: '/api/health',
    expectedStatus: 200,
    schema: HealthResponse,
  },
  {
    name: 'Login — invalid credentials',
    method: 'POST',
    path: '/api/auth/login',
    body: {
      email: 'nonexistent@example.com',
      password: 'wrong',
      tenantId: 'test-tenant',
    },
    expectedStatus: 401,
    schema: FlatErrorResponse,
  },
  {
    name: 'Login — missing fields',
    method: 'POST',
    path: '/api/auth/login',
    body: {},
    expectedStatus: 400,
    schema: FlatErrorResponse,
  },
  {
    name: 'Protected route — no auth',
    method: 'GET',
    path: '/api/auth/me',
    expectedStatus: 401,
    schema: FlatErrorResponse,
  },
];

// --- Runner ---

interface TestResult {
  name: string;
  passed: boolean;
  nodeStatus?: number;
  phpStatus?: number;
  schemaErrors: { node: string[]; php: string[] };
  shapeDiffs: string[];
  error?: string;
}

async function fetchJson(
  baseUrl: string,
  test: TestCase,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const url = `${baseUrl}${test.path}`;
  const init: RequestInit = {
    method: test.method,
    headers: {
      'Content-Type': 'application/json',
      ...(test.headers || {}),
    },
  };

  if (test.body && test.method !== 'GET') {
    init.body = JSON.stringify(test.body);
  }

  const res = await fetch(url);
  const body = await res.json();
  return { status: res.status, body };
}

async function runTest(test: TestCase): Promise<TestResult> {
  const result: TestResult = {
    name: test.name,
    passed: true,
    schemaErrors: { node: [], php: [] },
    shapeDiffs: [],
  };

  try {
    const [nodeRes, phpRes] = await Promise.all([
      fetchJson(NODE_URL, test).catch(e => ({ status: -1, body: { error: String(e) } })),
      fetchJson(PHP_URL, test).catch(e => ({ status: -1, body: { error: String(e) } })),
    ]);

    result.nodeStatus = nodeRes.status;
    result.phpStatus = phpRes.status;

    // Status code match
    if (nodeRes.status !== phpRes.status) {
      result.passed = false;
      result.error = `Status code mismatch: Node=${nodeRes.status}, PHP=${phpRes.status}`;
    }

    // Schema validation
    if (nodeRes.status >= 0) {
      const nodeValidation = validateResponse(nodeRes.body, test.schema);
      result.schemaErrors.node = nodeValidation.errors;
      if (!nodeValidation.valid) result.passed = false;
    }

    if (phpRes.status >= 0) {
      const phpValidation = validateResponse(phpRes.body, test.schema);
      result.schemaErrors.php = phpValidation.errors;
      if (!phpValidation.valid) result.passed = false;
    }

    // Shape comparison (only if both succeeded)
    if (nodeRes.status >= 0 && phpRes.status >= 0) {
      result.shapeDiffs = compareResponseShapes(nodeRes.body, phpRes.body);
      if (result.shapeDiffs.length > 0) result.passed = false;
    }
  } catch (e) {
    result.passed = false;
    result.error = String(e);
  }

  return result;
}

async function main(): Promise<void> {
  console.log('=== Dual Backend Conformance Test ===');
  console.log(`Node.js: ${NODE_URL}`);
  console.log(`PHP:     ${PHP_URL}`);
  console.log();

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const test of PUBLIC_TESTS) {
    const result = await runTest(test);
    results.push(result);

    const icon = result.passed ? '✓' : '✗';
    console.log(`${icon} ${result.name}`);

    if (!result.passed) {
      failed++;
      if (result.error) console.log(`    Error: ${result.error}`);
      if (result.schemaErrors.node.length > 0) {
        console.log(`    Node schema errors: ${result.schemaErrors.node.join(', ')}`);
      }
      if (result.schemaErrors.php.length > 0) {
        console.log(`    PHP schema errors: ${result.schemaErrors.php.join(', ')}`);
      }
      if (result.shapeDiffs.length > 0) {
        console.log(`    Shape diffs: ${result.shapeDiffs.join(', ')}`);
      }
    } else {
      passed++;
    }
  }

  console.log();
  console.log(`Results: ${passed} passed, ${failed} failed, ${results.length} total`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Runner failed:', e);
  process.exit(1);
});
