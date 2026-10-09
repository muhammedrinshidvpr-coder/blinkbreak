import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tempDirs: string[] = [];

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const artifacts = [
  ['windows', 'BlinkBreak_0.4.0_x64-setup.exe'],
  ['mac-arm', 'BlinkBreak_0.4.0_aarch64.dmg'],
  ['mac-intel', 'BlinkBreak_0.4.0_x64.dmg'],
  ['linux/deb', 'blinkbreak_0.4.0_amd64.deb'],
  ['linux/appimage', 'BlinkBreak_0.4.0_amd64.AppImage'],
] as const;

function releaseNotes(macosNotarized: string | undefined) {
  const root = mkdtempSync(join(tmpdir(), 'blinkbreak-release-'));
  tempDirs.push(root);
  for (const [directory, filename] of artifacts) {
    const fullDirectory = join(root, directory);
    mkdirSync(fullDirectory, { recursive: true });
    writeFileSync(join(fullDirectory, filename), `artifact:${filename}`);
  }
  const env = { ...process.env };
  delete env.MACOS_NOTARIZED;
  if (macosNotarized !== undefined) env.MACOS_NOTARIZED = macosNotarized;

  const run = spawnSync(process.execPath, [
    resolve(process.cwd(), 'scripts/release-notes.mjs'),
    '0.4.0',
    root,
  ], { cwd: process.cwd(), encoding: 'utf8', env });
  return { root, run };
}

describe('release notes', () => {
  it('includes every platform artifact and checksums for nested bundle paths', () => {
    const { root, run } = releaseNotes('true');

    expect(run.status, run.stderr).toBe(0);
    for (const [, filename] of artifacts) expect(run.stdout).toContain(filename);
    expect(run.stdout).toContain('`BlinkBreak_0.4.0_aarch64.dmg`** (Apple Silicon: M1 or newer)');
    expect(run.stdout).toContain('`BlinkBreak_0.4.0_x64.dmg`** (Intel)');
    expect(run.stdout).toContain('Get-FileHash .\\<downloaded-file>');

    const checksums = readFileSync(join(root, 'SHA256SUMS.txt'), 'utf8');
    for (const [, filename] of artifacts) expect(checksums).toContain(filename);
  });

  it('promises notarization only when the macOS build was notarized', () => {
    const notarized = releaseNotes('true').run;
    expect(notarized.status, notarized.stderr).toBe(0);
    expect(notarized.stdout).toContain('signed and notarized by Apple');
    expect(notarized.stdout).not.toContain('Open Anyway');

    for (const unsigned of [releaseNotes('false').run, releaseNotes(undefined).run]) {
      expect(unsigned.status, unsigned.stderr).toBe(0);
      expect(unsigned.stdout).not.toContain('notarized by Apple.');
      expect(unsigned.stdout).toContain("isn't notarized by Apple yet");
      expect(unsigned.stdout).toContain('**Open Anyway**');
    }
  });
});
