import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type Decision = 'keep' | 'adhoc' | 'invalid';
const afterSign = createRequire(import.meta.url)('./after-sign.cjs') as {
  (context: unknown): Promise<void>;
  decide: (input: { verifyStatus: number | null; details: string }) => Decision;
};
const { decide } = afterSign;

const ADHOC = 'Executable=/x/MAW Foundation.app/Contents/MacOS/MAW Foundation\nIdentifier=Electron\nSignature=adhoc\nTeamIdentifier=not set';
const DEVELOPER_ID = 'Identifier=com.mawsoftwares.foundation\nAuthority=Developer ID Application: Example (ABCDE12345)\nTeamIdentifier=ABCDE12345';

describe('after-sign decide()', () => {
  it('leaves a bundle whose signature already verifies alone, whatever signed it', () => {
    expect(decide({ verifyStatus: 0, details: DEVELOPER_ID })).toBe('keep');
    expect(decide({ verifyStatus: 0, details: ADHOC })).toBe('keep');
  });

  it("re-signs ad hoc when Electron's own ad-hoc signature no longer verifies (the repackaged-bundle case)", () => {
    expect(decide({ verifyStatus: 1, details: ADHOC })).toBe('adhoc');
  });

  it('refuses to paper over an invalid signature from a real identity or an unsigned bundle', () => {
    expect(decide({ verifyStatus: 1, details: DEVELOPER_ID })).toBe('invalid');
    expect(decide({ verifyStatus: 1, details: 'code object is not signed at all' })).toBe('invalid');
    expect(decide({ verifyStatus: null, details: '' })).toBe('invalid'); // codesign missing / killed
  });
});

describe('after-sign hook entry', () => {
  it('does nothing for non-macOS targets', async () => {
    await expect(afterSign({ electronPlatformName: 'win32' })).resolves.toBeUndefined();
    await expect(afterSign({ electronPlatformName: 'linux' })).resolves.toBeUndefined();
  });

  it('can be switched off with MAW_SKIP_ADHOC_SIGN=1 without touching the bundle', async () => {
    process.env.MAW_SKIP_ADHOC_SIGN = '1';
    try {
      // an invalid context would throw if the hook tried to read it; the opt-out returns first
      await expect(afterSign({ electronPlatformName: 'darwin' })).resolves.toBeUndefined();
    } finally {
      delete process.env.MAW_SKIP_ADHOC_SIGN;
    }
  });
});
