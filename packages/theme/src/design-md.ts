import type { TenantBranding } from './index';

/**
 * Parses a small, human-writable subset of Markdown into a `TenantBranding` override —
 * lets a superadmin theme the app by selecting a `design.md` file instead of editing
 * `BrandConfig` JSON. Recognized as list/plain lines of the form `Key: value`
 * (case-insensitive, optional leading `-`/`*` and `**bold**` markers), e.g.:
 *
 *   - **Primary Color**: #4f46e5
 *   - Secondary Color: #818cf8
 *   - Accent Color: #4338ca
 *   - Font Family: Inter
 *   - Border Radius: 12
 *
 * Unrecognized lines and invalid values are reported in `warnings` rather than thrown,
 * so a partially-correct file still themes what it can.
 */

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const FIELD_ALIASES: Record<string, keyof TenantBranding> = {
  'primary color': 'primaryColor',
  'brand color': 'primaryColor',
  'secondary color': 'secondaryColor',
  'accent color': 'accentColor',
  'font family': 'fontFamily',
  font: 'fontFamily',
  logo: 'logo',
  'logo url': 'logo',
  favicon: 'favicon',
  'border radius': 'borderRadius',
  radius: 'borderRadius',
};

export interface DesignMdParseResult {
  readonly branding: TenantBranding;
  readonly recognized: readonly { field: keyof TenantBranding; value: string }[];
  readonly warnings: readonly string[];
}

function stripMarkdownEmphasis(text: string): string {
  return text.replace(/\*\*|__|\*|_|`/g, '').trim();
}

export function parseDesignMarkdown(content: string): DesignMdParseResult {
  const branding: TenantBranding = {};
  const recognized: { field: keyof TenantBranding; value: string }[] = [];
  const warnings: string[] = [];

  let matchedAnyField = false;
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const withoutBullet = line.replace(/^[-*]\s+/, '');
    const separatorIndex = withoutBullet.indexOf(':');
    if (separatorIndex === -1) continue;

    const key = stripMarkdownEmphasis(withoutBullet.slice(0, separatorIndex)).toLowerCase();
    const value = stripMarkdownEmphasis(withoutBullet.slice(separatorIndex + 1));
    const field = FIELD_ALIASES[key];
    if (field === undefined || value === '') continue;
    matchedAnyField = true;

    if (field === 'primaryColor' || field === 'secondaryColor' || field === 'accentColor') {
      if (!HEX_COLOR.test(value)) {
        warnings.push(`"${key}" value "${value}" is not a valid hex color (expected #rrggbb) — skipped`);
        continue;
      }
      branding[field] = value;
    } else if (field === 'borderRadius') {
      const radius = Number.parseInt(value.replace(/px$/i, ''), 10);
      if (Number.isNaN(radius) || radius < 0) {
        warnings.push(`"${key}" value "${value}" is not a valid radius — skipped`);
        continue;
      }
      branding.borderRadius = radius;
    } else {
      branding[field] = value;
    }
    recognized.push({ field, value: String(branding[field]) });
  }

  if (!matchedAnyField) {
    warnings.push('No recognized "Key: value" lines found — expected fields like "Primary Color: #4f46e5".');
  }

  return { branding, recognized, warnings };
}
