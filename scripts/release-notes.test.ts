import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tempDirs: string[] = [];

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('release notes', () => {
  it('includes every platform artifact and checksums for nested bundle paths', () => {
    const root = mkdtempSync(join(tmpdir(), 'blinkbreak-release-'));
    tempDirs.push(root);
    const artifacts = [
      ['windows', 'BlinkBreak_0.4.0_x64-setup.exe'],
      ['mac-arm', 'BlinkBreak_0.4.0_aarch64.dmg'],
      ['mac-intel', 'BlinkBreak_0.4.0_x64.dmg'],
      ['linux/deb', 'blinkbreak_0.4.0_amd64.deb'],
      ['linux/appimage', 'BlinkBreak_0.4.0_amd64.AppImage'],
    ] as const;
    for (const [directory, filename] of artifacts) {
      const fullDirectory = join(root, directory);
      mkdirSync(fullDirectory, { recursive: true });
      writeFileSync(join(fullDirectory, filename), `artifact:${filename}`);
    }

    const run = spawnSync(process.execPath, [
      resolve(process.cwd(), 'scripts/release-notes.mjs'),
      '0.4.0',
      root,
    ], { cwd: process.cwd(), encoding: 'utf8' });

    expect(run.status, run.stderr).toBe(0);
    for (const [, filename] of artifacts) expect(run.stdout).toContain(filename);
    expect(run.stdout).toContain('signed and notarized by Apple');
    expect(run.stdout).toContain('Get-FileHash .\\<downloaded-file>');

    const checksums = readFileSync(join(root, 'SHA256SUMS.txt'), 'utf8');
    for (const [, filename] of artifacts) expect(checksums).toContain(filename);
  });
});
