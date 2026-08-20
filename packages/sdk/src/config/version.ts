/**
 * App version utilities — semver parsing, comparison, build metadata.
 */

export interface AppVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.]+))?(?:\+([a-zA-Z0-9.]+))?$/;

export function parseVersion(version: string): AppVersion {
  const match = SEMVER_RE.exec(version);
  if (!match) throw new Error(`Invalid semver: "${version}"`);
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10),
    prerelease: match[4],
    build: match[5],
  };
}

export function formatVersion(v: AppVersion): string {
  let str = `${v.major}.${v.minor}.${v.patch}`;
  if (v.prerelease) str += `-${v.prerelease}`;
  if (v.build) str += `+${v.build}`;
  return str;
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const va = parseVersion(a);
  const vb = parseVersion(b);

  if (va.major !== vb.major) return va.major > vb.major ? 1 : -1;
  if (va.minor !== vb.minor) return va.minor > vb.minor ? 1 : -1;
  if (va.patch !== vb.patch) return va.patch > vb.patch ? 1 : -1;

  if (va.prerelease && !vb.prerelease) return -1;
  if (!va.prerelease && vb.prerelease) return 1;
  if (va.prerelease && vb.prerelease) {
    return va.prerelease < vb.prerelease ? -1 : va.prerelease > vb.prerelease ? 1 : 0;
  }

  return 0;
}

export function isNewerThan(version: string, baseline: string): boolean {
  return compareVersions(version, baseline) > 0;
}

export function satisfiesMinimum(version: string, minimum: string): boolean {
  return compareVersions(version, minimum) >= 0;
}

// ---------------------------------------------------------------------------
// Build info container
// ---------------------------------------------------------------------------

export interface BuildInfo {
  version: string;
  buildDate: string;
  commitHash?: string;
  environment?: string;
}

let buildInfo: BuildInfo = {
  version: '0.0.0',
  buildDate: new Date().toISOString(),
};

export function setBuildInfo(info: BuildInfo): void {
  buildInfo = { ...info };
}

export function getBuildInfo(): Readonly<BuildInfo> {
  return buildInfo;
}

export function getAppVersion(): string {
  return buildInfo.version;
}
