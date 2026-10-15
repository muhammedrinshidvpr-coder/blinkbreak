import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const html = readFileSync(join(root, 'docs/index.html'), 'utf8');
const page = new DOMParser().parseFromString(html, 'text/html');

describe('public download page', () => {
  it('offers every installer directly, without depending on JavaScript or decoding architecture filenames', () => {
    const downloads = [...page.querySelectorAll<HTMLAnchorElement>('#download a.button')];
    const assets = [
      ['Download for Windows', 'BlinkBreak-Windows-Setup.exe'],
      ['Download for Apple Silicon', 'BlinkBreak-Mac-AppleSilicon.dmg'],
      ['Download for Intel Mac', 'BlinkBreak-Mac-Intel.dmg'],
      ['Download for Ubuntu / Debian', 'BlinkBreak-Linux.deb'],
      ['Download AppImage', 'BlinkBreak-Linux.AppImage'],
    ];
    expect(downloads).toHaveLength(assets.length);
    for (const [label, filename] of assets) {
      const link = downloads.find((item) => item.textContent?.includes(label));
      expect(link?.getAttribute('href')).toBe(`https://github.com/rinshidvp/blinkbreak/releases/latest/download/${filename}`);
    }
    expect(page.querySelector('script')).toBeNull();
  });

  it('keeps on-page navigation and local images/styles valid when deployed under the repository subpath', () => {
    for (const anchor of page.querySelectorAll('a[href^="#"]')) {
      expect(page.getElementById(anchor.getAttribute('href')!.slice(1))).not.toBeNull();
    }
    for (const element of page.querySelectorAll('img[src], source[srcset], link[rel="stylesheet"], link[rel="icon"]')) {
      const path = element.getAttribute('src') ?? element.getAttribute('srcset') ?? element.getAttribute('href')!;
      expect(path.startsWith('/'), path).toBe(false);
      expect(existsSync(join(root, 'docs', path)), path).toBe(true);
    }
    expect(page.querySelector('picture source[media="(prefers-reduced-motion: reduce)"]')?.getAttribute('srcset')).toBe('screenshots/app-light.png');
  });

  it('explains first-launch warnings, desktop-only support and optional sound before people install', () => {
    const text = page.body.textContent!;
    for (const explanation of ["isn't code-signed", "isn't notarized", 'not a phone or tablet', 'Sound is off until you choose', 'not a medical device']) {
      expect(text).toContain(explanation);
    }
    expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://rinshidvp.github.io/blinkbreak/');
    expect(page.querySelectorAll('h1')).toHaveLength(1);
    for (const image of page.querySelectorAll('img')) expect(image.hasAttribute('alt')).toBe(true);
  });
});

describe('public release version', () => {
  it('keeps the app manifests, lockfiles and changelog on the same releasable version', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const npmLock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    const tauri = JSON.parse(readFileSync(join(root, 'src-tauri/tauri.conf.json'), 'utf8'));
    const cargo = readFileSync(join(root, 'src-tauri/Cargo.toml'), 'utf8');
    const cargoLock = readFileSync(join(root, 'src-tauri/Cargo.lock'), 'utf8').replace(/\r\n/g, '\n');
    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(npmLock.version).toBe(pkg.version);
    expect(npmLock.packages[''].version).toBe(pkg.version);
    expect(tauri.version).toBe(pkg.version);
    expect(cargo).toContain(`version = "${pkg.version}"`);
    expect(cargoLock).toContain(`name = "blinkbreak"\nversion = "${pkg.version}"`);
    expect(changelog).toContain(`## [${pkg.version}] - `);
  });
});
