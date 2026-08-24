import type { ITemplateRenderer } from '@maw/sdk';
import { TemplateError } from '@maw/sdk';

export class MustacheTemplateRenderer implements ITemplateRenderer {
  render(template: string, variables: Readonly<Record<string, unknown>>): string {
    return template.replace(/\{\{\s*(\w+(?:\.\w+)*)\s*\}\}/g, (_match, key: string) => {
      const value = this.resolve(key, variables);
      if (value === undefined || value === null) return '';
      return String(value);
    });
  }

  private resolve(path: string, obj: Readonly<Record<string, unknown>>): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}

export function validateTemplateVariables(
  template: string,
  variables: Readonly<Record<string, unknown>>,
  requiredVars?: readonly string[],
): void {
  if (!requiredVars) return;
  const missing = requiredVars.filter((v) => variables[v] === undefined || variables[v] === null);
  if (missing.length > 0) {
    throw new TemplateError(`Missing required template variables: ${missing.join(', ')}`);
  }
}
