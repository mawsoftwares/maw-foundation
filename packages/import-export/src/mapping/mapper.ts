import type { ImportDefinition, FieldDefinition, FieldTypeValue } from '../types';
import { FieldType } from '../types';
import type { ParsedRow } from '../parsers/types';
import type { MappingConfig, MappingResult } from './types';

export class ColumnMapper {
  mapColumns(
    headers: readonly string[],
    definition: ImportDefinition,
    config?: MappingConfig,
  ): MappingResult {
    const mapped = new Map<string, string>();
    const usedHeaders = new Set<string>();

    if (config?.mappings) {
      for (const m of config.mappings) {
        if (headers.includes(m.source)) {
          mapped.set(m.source, m.target);
          usedHeaders.add(m.source);
        }
      }
    }

    if (config?.autoMap !== false) {
      for (const field of definition.fields) {
        if (Array.from(mapped.values()).includes(field.name)) continue;

        const exactMatch = headers.find(
          (h) => !usedHeaders.has(h) && h.toLowerCase() === field.name.toLowerCase(),
        );
        if (exactMatch) {
          mapped.set(exactMatch, field.name);
          usedHeaders.add(exactMatch);
          continue;
        }

        const labelMatch = headers.find(
          (h) => !usedHeaders.has(h) && h.toLowerCase() === field.label.toLowerCase(),
        );
        if (labelMatch) {
          mapped.set(labelMatch, field.name);
          usedHeaders.add(labelMatch);
          continue;
        }

        if (field.aliases) {
          for (const alias of field.aliases) {
            const aliasMatch = headers.find(
              (h) => !usedHeaders.has(h) && h.toLowerCase() === alias.toLowerCase(),
            );
            if (aliasMatch) {
              mapped.set(aliasMatch, field.name);
              usedHeaders.add(aliasMatch);
              break;
            }
          }
        }
      }
    }

    const unmappedColumns = headers.filter((h) => !usedHeaders.has(h));
    const mappedFields = new Set(mapped.values());
    const missingRequiredFields = definition.fields
      .filter((f) => f.required && !mappedFields.has(f.name))
      .map((f) => f.name);

    return { mapped, unmappedColumns, missingRequiredFields };
  }

  applyMapping(
    row: ParsedRow,
    mapping: ReadonlyMap<string, string>,
    definition: ImportDefinition,
  ): Record<string, unknown> {
    const fieldMap = new Map(definition.fields.map((f) => [f.name, f]));
    const result: Record<string, unknown> = {};

    for (const [source, target] of mapping) {
      const rawValue = row[source];
      const field = fieldMap.get(target);

      let value: unknown = rawValue;

      if ((value === null || value === undefined || value === '') && field?.defaultValue !== undefined) {
        value = field.defaultValue;
      } else if (field && value !== null && value !== undefined && value !== '') {
        value = coerceType(value, field.type);
      }

      if (field?.transform) {
        value = field.transform(value);
      }

      result[target] = value;
    }

    for (const field of definition.fields) {
      if (!(field.name in result) && field.defaultValue !== undefined) {
        result[field.name] = field.defaultValue;
      }
    }

    return result;
  }
}

function coerceType(value: unknown, type: FieldTypeValue): unknown {
  const str = String(value).trim();

  switch (type) {
    case FieldType.BOOLEAN:
      return coerceBoolean(str);
    case FieldType.NUMBER:
    case FieldType.DECIMAL: {
      const n = Number(str);
      return Number.isNaN(n) ? str : n;
    }
    case FieldType.INTEGER: {
      const n = parseInt(str, 10);
      return Number.isNaN(n) ? str : n;
    }
    case FieldType.DATE:
    case FieldType.DATETIME: {
      const d = new Date(str);
      return Number.isNaN(d.getTime()) ? str : d.toISOString();
    }
    default:
      return str;
  }
}

function coerceBoolean(str: string): boolean | string {
  const lower = str.toLowerCase();
  if (['true', 'yes', '1'].includes(lower)) return true;
  if (['false', 'no', '0'].includes(lower)) return false;
  return str;
}
