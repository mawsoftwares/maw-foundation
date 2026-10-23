import { afterEach, describe, expect, it } from 'vitest';
import { getUIKitOverride, setUIKit, type UIKitOverride } from './index';

describe('ui-contract registry', () => {
  afterEach(() => setUIKit({}));

  it('starts empty so the default kit applies', () => {
    expect(getUIKitOverride()).toEqual({});
  });

  it('returns the installed kit by identity, and restores with {}', () => {
    const kit: UIKitOverride = { Spinner: () => null };
    setUIKit(kit);
    expect(getUIKitOverride()).toBe(kit);
    setUIKit({});
    expect(getUIKitOverride()).toEqual({});
  });
});
