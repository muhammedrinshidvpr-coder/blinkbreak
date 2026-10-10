import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const tempDirs: string[] = [];

afterEach(() => {
  for (const directory of tempDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
});

// Where each workflow artifact lands after download-artifact merges them.
const builtFiles = [
  'BlinkBreak_0.5.0_x64-setup.exe',
  'BlinkBreak_0.5.0_aarch64.dmg',
  'BlinkBreak_0.5.0_x64.dmg',
  'deb/BlinkBreak_0.5.0_amd64.deb',
  'appimage/BlinkBreak_0.5.0_amd64.AppImage',
];

function bundleDir(files: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'blinkbreak-assets-'));
  tempDirs.push(root);
  for (const file of files) {
    mkdirSync(join(root, 'bundles', file, '..'), { recursive: true });
    writeFileSync(join(root, 'bundles', file), `built:${file}`);
  }
  return root;
}

function nameAssets(root: string, version = '0.5.0') {
  return spawnSync(process.execPath, [
    resolve(process.cwd(), 'scripts/release-assets.mjs'),
    version,
    join(root, 'bundles'),
    join(root, 'release'),
  ], { encoding: 'utf8' });
}

describe('release assets', () => {
  it('copies each platform installer to its plain download name', () => {
    const root = bundleDir(builtFiles);
    const run = nameAssets(root);

    expect(run.status, run.stderr).toBe(0);
    expect(readdirSync(join(root, 'release')).sort()).toEqual([
      'BlinkBreak-Linux.AppImage',
      'BlinkBreak-Linux.deb',
      'BlinkBreak-Mac-AppleSilicon.dmg',
      'BlinkBreak-Mac-Intel.dmg',
      'BlinkBreak-Windows-Setup.exe',
    ]);
    // The Intel DMG must not be confused with the Windows x64 installer, or vice versa.
    expect(readFileSync(join(root, 'release', 'BlinkBreak-Mac-Intel.dmg'), 'utf8')).toBe('built:BlinkBreak_0.5.0_x64.dmg');
    expect(readFileSync(join(root, 'release', 'BlinkBreak-Windows-Setup.exe'), 'utf8')).toBe('built:BlinkBreak_0.5.0_x64-setup.exe');
    expect(readFileSync(join(root, 'release', 'BlinkBreak-Mac-AppleSilicon.dmg'), 'utf8')).toBe('built:BlinkBreak_0.5.0_aarch64.dmg');
  });

  it('refuses to publish when a platform is missing', () => {
    const root = bundleDir(builtFiles.filter((file) => !file.endsWith('.AppImage')));
    const run = nameAssets(root);

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('BlinkBreak-Linux.AppImage');
  });

  it('refuses installers built for a different version than the tag', () => {
    const run = nameAssets(bundleDir(builtFiles), '0.6.0');

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('BlinkBreak-Windows-Setup.exe');
  });
});
