'use strict';
/**
 * electron-builder `afterSign` hook: make the macOS app bundle's code signature valid when no signing identity is configured.
 *
 * Why: without a "Developer ID Application" identity electron-builder skips signing, but it has already renamed the bundle and edited
 * its Info.plist around Electron's own ad-hoc (linker) signature. The seal no longer matches, so `codesign --verify` fails and a
 * downloaded copy is reported as damaged instead of merely unidentified. An ad-hoc re-sign repairs the bundle. It is NOT a substitute
 * for a Developer ID signature plus notarization, which is what lets a downloaded app open normally.
 *
 * Never touches a bundle that is already validly signed (real identity or intact), and fails the build on any other invalid state
 * rather than hiding it. Set MAW_SKIP_ADHOC_SIGN=1 to disable.
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

/**
 * @param {{ verifyStatus: number | null, details: string }} input `codesign --verify` exit status and `codesign -dv` output
 * @returns {'keep' | 'adhoc' | 'invalid'}
 */
function decide({ verifyStatus, details }) {
  if (verifyStatus === 0) return 'keep'; // valid already: a real identity, or an intact ad-hoc signature
  if (/Signature=adhoc/.test(details)) return 'adhoc'; // Electron's ad-hoc signature, broken by the repackaging
  return 'invalid'; // signed some other way but invalid: do not paper over it
}

function codesign(args) {
  return spawnSync('codesign', args, { encoding: 'utf8' });
}

async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  if (process.env.MAW_SKIP_ADHOC_SIGN === '1') {
    console.log('  • after-sign: MAW_SKIP_ADHOC_SIGN=1, leaving the bundle as electron-builder produced it');
    return;
  }

  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  const verify = codesign(['--verify', '--deep', '--strict', app]);
  const details = `${codesign(['-dv', app]).stderr}`; // `codesign -dv` writes to stderr
  const action = decide({ verifyStatus: verify.status, details });

  if (action === 'keep') {
    console.log('  • after-sign: signature already valid, leaving it alone');
    return;
  }
  if (action === 'invalid') {
    throw new Error(`after-sign: ${app} has an invalid signature that is not Electron's ad-hoc one:\n${verify.stderr}`);
  }

  console.log('  • after-sign: signature invalid after repackaging, re-signing ad-hoc (not notarized; see apps/sample-desktop/scripts/after-sign.cjs)');
  const sign = codesign(['--force', '--deep', '--sign', '-', app]);
  if (sign.status !== 0) throw new Error(`after-sign: ad-hoc codesign failed:\n${sign.stderr}`);
  const recheck = codesign(['--verify', '--deep', '--strict', app]);
  if (recheck.status !== 0) throw new Error(`after-sign: signature still invalid after ad-hoc signing:\n${recheck.stderr}`);
}

module.exports = afterSign;
module.exports.default = afterSign;
module.exports.decide = decide;
