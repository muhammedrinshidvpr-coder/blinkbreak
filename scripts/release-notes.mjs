// Usage: node scripts/release-notes.mjs <version> <installer-dir>
// Prints release notes (the CHANGELOG.md section for <version> plus install help and
// checksums) and writes SHA256SUMS.txt next to the installers.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

const installers = readdirSync(installerDir).filter((name) => name.endsWith('.exe'));
if (installers.length === 0) {
  console.error(`no .exe found in ${installerDir}`);
  process.exit(1);
}
const sums = installers.map((name) => {
  const hash = createHash('sha256').update(readFileSync(join(installerDir, name))).digest('hex');
  return `${hash}  ${name}`;
});
writeFileSync(join(installerDir, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`);

console.log(`${section}

## Install

1. Download **\`${installers[0]}\`** below and run it. No admin rights needed.
2. If Windows says **"Windows protected your PC"**, click **More info → Run anyway**
   (the installer isn't paid-code-signed yet).
3. BlinkBreak lives in your system tray. Right-click the icon for options.

## Verify the download (optional)

\`\`\`
${sums.join('\n')}
\`\`\`

PowerShell: \`Get-FileHash .\\${installers[0]}\``);
