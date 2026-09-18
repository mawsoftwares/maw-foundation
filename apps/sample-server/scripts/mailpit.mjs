#!/usr/bin/env node
/**
 * Starts a local Mailpit SMTP sandbox (no Docker Compose).
 *
 * Prefers `mailpit` on PATH (e.g. `brew install mailpit`). Otherwise downloads
 * the GitHub release binary into apps/sample-server/.cache/mailpit/.
 *
 * SMTP: 127.0.0.1:1025   Inbox UI: http://localhost:8025
 */
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { arch, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const SMTP = process.env.MAILPIT_SMTP ?? '127.0.0.1:1025';
const UI = process.env.MAILPIT_UI ?? '127.0.0.1:8025';
const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'mailpit');

function mailpitAsset() {
  const os = platform();
  const cpu = arch() === 'arm64' ? 'arm64' : 'amd64';
  if (os === 'darwin') return { file: `mailpit-darwin-${cpu}.tar.gz`, bin: 'mailpit' };
  if (os === 'linux') return { file: `mailpit-linux-${cpu}.tar.gz`, bin: 'mailpit' };
  if (os === 'win32') return { file: `mailpit-windows-${cpu}.zip`, bin: 'mailpit.exe' };
  throw new Error(`No Mailpit binary published for ${os}/${arch()}`);
}

function whichMailpit() {
  const lookup = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['mailpit'], {
    encoding: 'utf8',
  });
  if (lookup.status === 0) {
    const found = lookup.stdout.trim().split(/\r?\n/)[0];
    if (found) return found;
  }
  const cached = join(CACHE_DIR, mailpitAsset().bin);
  return existsSync(cached) ? cached : null;
}

async function downloadMailpit() {
  const { file, bin } = mailpitAsset();
  mkdirSync(CACHE_DIR, { recursive: true });
  const url = `https://github.com/axllent/mailpit/releases/latest/download/${file}`;
  process.stdout.write(`Downloading Mailpit from ${url}\n`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download Mailpit (${res.status} ${res.statusText}). Install manually: brew install mailpit`);
  }
  const archivePath = join(CACHE_DIR, file);
  await pipeline(res.body, createWriteStream(archivePath));
  const extract = spawnSync('tar', ['-xf', archivePath, '-C', CACHE_DIR], { stdio: 'inherit' });
  rmSync(archivePath, { force: true });
  if (extract.status !== 0) {
    throw new Error('Failed to extract Mailpit archive (need tar on PATH). Or: brew install mailpit');
  }
  const binPath = join(CACHE_DIR, bin);
  if (!existsSync(binPath)) {
    throw new Error(`Mailpit binary not found at ${binPath}`);
  }
  chmodSync(binPath, 0o755);
  return binPath;
}

const bin = whichMailpit() ?? (await downloadMailpit());
process.stdout.write(`Mailpit SMTP ${SMTP}  inbox http://localhost:${UI.split(':').pop()}\n`);
const child = spawn(bin, ['--smtp', SMTP, '--listen', UI], { stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
