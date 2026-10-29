import type { LayoutIssue } from '@mawsoftwares/layout';
import { PRESET_ID_PATTERN } from '@mawsoftwares/layout';
import type { PageTemplateDefinition, PageTemplateResult, PageTemplateSettings, StoredPageConfig, WidgetPlacement } from './types';

export const MAX_WIDGET_PLACEMENTS = 24;
export const MAX_WIDGET_TITLE_LENGTH = 80;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const WIDGET_ID = /^[a-z][a-z0-9-]{0,63}$/;

export function validatePageSettings(input: unknown, path = 'settings'): PageTemplateResult<Partial<PageTemplateSettings>> {
  if (!isRecord(input)) return { ok: false, issues: [{ path, message: 'Expected an object.' }] };
  const issues: LayoutIssue[] = [];
  for (const [key, value] of Object.entries(input)) {
    const at = `${path}.${key}`;
    if (key === 'width') {
      if (value !== 'contained' && value !== 'full') issues.push({ path: at, message: 'Expected one of: contained, full.' });
    } else if (key === 'aside') {
      if (typeof value !== 'boolean') issues.push({ path: at, message: 'Expected true or false.' });
    } else if (key === 'columns') {
      if (value !== 1 && value !== 2 && value !== 3 && value !== 4) issues.push({ path: at, message: 'Expected 1, 2, 3 or 4.' });
    } else issues.push({ path: at, message: 'Unknown setting.' });
  }
  return issues.length === 0 ? { ok: true, value: input as Partial<PageTemplateSettings> } : { ok: false, issues };
}

/** Placements must target one of the template's widget slots and use an approved widget id. */
export function validateWidgetPlacements(
  input: unknown,
  template: PageTemplateDefinition,
  approvedWidgets: ReadonlySet<string>,
): PageTemplateResult<readonly WidgetPlacement[]> {
  if (!Array.isArray(input)) return { ok: false, issues: [{ path: 'widgets', message: 'Expected a list.' }] };
  const issues: LayoutIssue[] = [];
  if (input.length > MAX_WIDGET_PLACEMENTS) issues.push({ path: 'widgets', message: `At most ${MAX_WIDGET_PLACEMENTS} widgets.` });
  input.forEach((item: unknown, i) => {
    const at = `widgets[${i}]`;
    if (!isRecord(item)) return void issues.push({ path: at, message: 'Expected an object.' });
    for (const key of Object.keys(item)) {
      if (!['slot', 'widget', 'span', 'title'].includes(key)) issues.push({ path: `${at}.${key}`, message: 'Unknown setting.' });
    }
    const { slot, widget, span, title } = item;
    if (typeof slot !== 'string' || !template.widgetSlots.includes(slot)) {
      issues.push({ path: `${at}.slot`, message: `Slot is not a widget slot of "${template.id}".` });
    }
    if (typeof widget !== 'string' || !WIDGET_ID.test(widget)) issues.push({ path: `${at}.widget`, message: 'Invalid widget id.' });
    else if (!approvedWidgets.has(widget)) issues.push({ path: `${at}.widget`, message: `Widget "${widget}" is not in the approved registry.` });
    if (span !== undefined && span !== 1 && span !== 2 && span !== 3 && span !== 4) issues.push({ path: `${at}.span`, message: 'Expected 1, 2, 3 or 4.' });
    if (title !== undefined && (typeof title !== 'string' || title.length > MAX_WIDGET_TITLE_LENGTH)) {
      issues.push({ path: `${at}.title`, message: `Expected text up to ${MAX_WIDGET_TITLE_LENGTH} characters.` });
    }
  });
  return issues.length === 0 ? { ok: true, value: input as readonly WidgetPlacement[] } : { ok: false, issues };
}

/** Validate the stored envelope. Template existence and placements are checked by the resolver against the registry. */
export function validateStoredPageConfig(input: unknown): PageTemplateResult<StoredPageConfig> {
  if (!isRecord(input)) return { ok: false, issues: [{ path: '', message: 'Expected an object.' }] };
  const issues: LayoutIssue[] = [];
  for (const key of Object.keys(input)) {
    if (!['version', 'templateId', 'settings', 'widgets'].includes(key)) issues.push({ path: key, message: 'Unknown setting.' });
  }
  if (typeof input['version'] !== 'number' || !Number.isInteger(input['version']) || input['version'] < 1) {
    issues.push({ path: 'version', message: 'Expected a positive integer.' });
  }
  const id = input['templateId'];
  if (typeof id !== 'string' || id.length > 64 || !PRESET_ID_PATTERN.test(id)) issues.push({ path: 'templateId', message: 'Invalid template id.' });
  if (input['settings'] !== undefined) {
    const r = validatePageSettings(input['settings']);
    if (!r.ok) issues.push(...r.issues);
  }
  return issues.length === 0 ? { ok: true, value: input as unknown as StoredPageConfig } : { ok: false, issues };
}

/** Required slots the page did not supply. */
export function missingRequiredSlots(template: { readonly slots: readonly { id: string; required: boolean }[] }, supplied: Iterable<string>): string[] {
  const have = new Set(supplied);
  return template.slots.filter((s) => s.required && !have.has(s.id)).map((s) => s.id);
}
