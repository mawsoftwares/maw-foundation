/**
 * Contract conformance validator.
 *
 * Validates JSON responses against the canonical response schemas.
 * Used by both Node.js tests and the cross-backend comparison runner.
 *
 * Usage:
 *   import { validateResponse } from './validate';
 *   const result = validateResponse(jsonBody, LoginSuccessResponse);
 *   if (!result.valid) console.error(result.errors);
 */

import { SENSITIVE_FIELDS } from './response-schemas';

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

interface FieldSchema {
  type: FieldType | FieldType[];
  required?: boolean;
  items?: FieldSchema;
  properties?: Record<string, FieldSchema>;
  enum?: readonly string[];
}

type ResponseSchema = Record<string, FieldSchema>;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateResponse(
  body: Record<string, unknown>,
  schema: ResponseSchema,
  path = '',
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const fullPath = path ? `${path}.${key}` : key;

    if (fieldSchema.required && !(key in body)) {
      errors.push(`Missing required field: ${fullPath}`);
      continue;
    }

    if (!(key in body)) continue;

    const value = body[key];

    // Type check
    const types = Array.isArray(fieldSchema.type) ? fieldSchema.type : [fieldSchema.type];
    const actualType = getType(value);

    if (!types.includes(actualType)) {
      errors.push(
        `Type mismatch at ${fullPath}: expected ${types.join('|')}, got ${actualType}`,
      );
      continue;
    }

    // Enum check
    if (fieldSchema.enum && typeof value === 'string') {
      if (!fieldSchema.enum.includes(value)) {
        errors.push(
          `Invalid enum value at ${fullPath}: "${value}" not in [${fieldSchema.enum.join(', ')}]`,
        );
      }
    }

    // Nested object check
    if (actualType === 'object' && fieldSchema.properties && value !== null) {
      const nested = validateResponse(
        value as Record<string, unknown>,
        fieldSchema.properties,
        fullPath,
      );
      errors.push(...nested.errors);
      warnings.push(...nested.warnings);
    }

    // Array items check
    if (actualType === 'array' && fieldSchema.items && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${fullPath}[${i}]`;
        const item = value[i];

        if (fieldSchema.items.type === 'object' && fieldSchema.items.properties) {
          const nested = validateResponse(
            item as Record<string, unknown>,
            fieldSchema.items.properties,
            itemPath,
          );
          errors.push(...nested.errors);
          warnings.push(...nested.warnings);
        }
      }
    }
  }

  // Check for sensitive field leaks
  for (const field of SENSITIVE_FIELDS) {
    if (field in body) {
      errors.push(`Sensitive field leaked: ${path ? `${path}.${field}` : field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function getType(value: unknown): FieldType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as FieldType;
}

/**
 * Compares two backend responses for structural equivalence.
 * Does NOT compare values (tokens differ), only shapes.
 */
export function compareResponseShapes(
  nodeResponse: Record<string, unknown>,
  phpResponse: Record<string, unknown>,
  path = '',
): string[] {
  const diffs: string[] = [];

  const nodeKeys = Object.keys(nodeResponse).sort();
  const phpKeys = Object.keys(phpResponse).sort();

  // Keys present in Node but missing in PHP
  for (const key of nodeKeys) {
    if (!phpKeys.includes(key)) {
      diffs.push(`Key "${path ? `${path}.${key}` : key}" present in Node.js but missing in PHP`);
    }
  }

  // Keys present in PHP but missing in Node
  for (const key of phpKeys) {
    if (!nodeKeys.includes(key)) {
      diffs.push(`Key "${path ? `${path}.${key}` : key}" present in PHP but missing in Node.js`);
    }
  }

  // Type mismatches on shared keys
  for (const key of nodeKeys.filter(k => phpKeys.includes(k))) {
    const fullPath = path ? `${path}.${key}` : key;
    const nodeType = getType(nodeResponse[key]);
    const phpType = getType(phpResponse[key]);

    if (nodeType !== phpType) {
      diffs.push(
        `Type mismatch at "${fullPath}": Node.js=${nodeType}, PHP=${phpType}`,
      );
      continue;
    }

    // Recurse into objects
    if (nodeType === 'object' && nodeResponse[key] !== null && phpResponse[key] !== null) {
      diffs.push(
        ...compareResponseShapes(
          nodeResponse[key] as Record<string, unknown>,
          phpResponse[key] as Record<string, unknown>,
          fullPath,
        ),
      );
    }

    // Recurse into first array item
    if (nodeType === 'array') {
      const nodeArr = nodeResponse[key] as unknown[];
      const phpArr = phpResponse[key] as unknown[];

      if (nodeArr.length > 0 && phpArr.length > 0) {
        const nodeItem = nodeArr[0];
        const phpItem = phpArr[0];
        if (typeof nodeItem === 'object' && typeof phpItem === 'object' &&
            nodeItem !== null && phpItem !== null) {
          diffs.push(
            ...compareResponseShapes(
              nodeItem as Record<string, unknown>,
              phpItem as Record<string, unknown>,
              `${fullPath}[0]`,
            ),
          );
        }
      }
    }
  }

  return diffs;
}
