// Usage: node scripts/release-notes.mjs <version> <installer-dir>
// Prints release notes (the CHANGELOG.md section for <version> plus install help and
// checksums) and writes SHA256SUMS.txt next to the installers.
// The installer dir is searched recursively for Windows (.exe), macOS (.dmg),
// and Linux (.deb, .AppImage) artifacts.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const [version, installerDir] = process.argv.slice(2);
if (!version || !installerDir) {
  console.error('usage: release-notes.mjs <version> <installer-dir>');
  process.exit(2);
}

const changelog = readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/);
const start = changelog.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`CHANGELOG.md has no "## [${version}]" section`);
  process.exit(1);
}
const rest = changelog.slice(start + 1);
const end = rest.findIndex((line) => line.startsWith('## [') || /^\[[^\]]+\]:/.test(line));
const section = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

const ARTIFACT_EXTS = ['.exe', '.dmg', '.deb', '.AppImage'];

function collectInstallers(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectInstallers(full));
    } else if (ARTIFACT_EXTS.some((ext) => entry.endsWith(ext))) {
      found.push(full);
    }
  }
  return found.sort();
}

const installerPaths = collectInstallers(installerDir);
if (installerPaths.length === 0) {
  console.error(`no installer artifacts found in ${installerDir}`);
  process.exit(1);
}
const sums = installerPaths.map((full) => {
  const hash = createHash('sha256').update(readFileSync(full)).digest('hex');
  return `${hash}  ${basename(full)}`;
});
writeFileSync(join(installerDir, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`);

const byExt = (ext) => installerPaths.map((p) => basename(p)).filter((n) => n.endsWith(ext));
const win = byExt('.exe');
const mac = byExt('.dmg');
const deb = byExt('.deb');
const appimage = byExt('.AppImage');
const lines = [];
if (win.length > 0) {
  lines.push(`### Windows\n\n${win.map((name) => `- **\`${name}\`**`).join('\n')}`);
  lines.push(`Run the installer. No admin rights needed. If Windows says **"Windows protected your PC"**, click **More info → Run anyway**`);
  lines.push(`   (the installer isn't paid-code-signed yet).`);
}
if (mac.length > 0) {
  lines.push(`### macOS\n\n${mac.map((name) => `- **\`${name}\`**`).join('\n')}`);
  lines.push(`These DMGs are signed and notarized by Apple. Open the disk image and drag BlinkBreak to Applications.`);
}
if (deb.length > 0 || appimage.length > 0) {
  lines.push(`### Linux\n\n${[...deb, ...appimage].map((name) => `- **\`${name}\`**`).join('\n')}`);
  if (deb.length > 0) lines.push(`Install the Debian package with your package manager.`);
  if (appimage.length > 0) lines.push(`For AppImage, make it executable before launching (FUSE support may be required by your distribution).`);
  lines.push(`System-wide idle and fullscreen detection are not implemented on Linux yet; timers count while BlinkBreak is open and Settings explains this limitation.`);
}

console.log(`${section}

## Install

${lines.join('\n')}

BlinkBreak lives in your system tray / menu bar. Right-click the icon for options.

## Verify the download (optional)

The SHA-256 value for every installer is listed below. Compute the hash of the downloaded file
and compare it to the matching filename:

\`\`\`text
${sums.join('\n')}
\`\`\`

Windows PowerShell: \`Get-FileHash .\\<downloaded-file> -Algorithm SHA256\`
macOS/Linux: \`shasum -a 256 <downloaded-file>\``);
