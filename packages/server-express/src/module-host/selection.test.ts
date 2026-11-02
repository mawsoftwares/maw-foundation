import { describe, it, expect } from 'vitest';
import { selectionFromDisabled } from './selection';
import type { MawModule } from './contract';

const m = (key: string): MawModule => ({ definition: { key, name: key, version: '1.0.0', routePrefix: `/api/${key}` } });

describe('selectionFromDisabled', () => {
  it('enables everything when nothing is disabled', () => {
    const { selection, unknown } = selectionFromDisabled([m('a'), m('b')], []);
    expect([...(selection.enabled ?? [])]).toEqual(['a', 'b']);
    expect(unknown).toEqual([]);
  });

  it('removes disabled keys and reports unknown ones', () => {
    const { selection, unknown } = selectionFromDisabled([m('a'), m('b')], ['b', 'zzz']);
    expect([...(selection.enabled ?? [])]).toEqual(['a']);
    expect(unknown).toEqual(['zzz']);
  });
});
