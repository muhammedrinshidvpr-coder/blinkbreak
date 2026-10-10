// Usage: node scripts/release-assets.mjs <version> <bundle-dir> <out-dir>
// Copies the installers Tauri built for <version> (searched recursively in <bundle-dir>) into
// <out-dir> under plain, version-free names. People can pick a file without knowing CPU
// architecture names, and https://github.com/<repo>/releases/latest/download/<name> always
// serves the newest build, so the README can link straight to each download.
// Fails unless every platform's installer is present exactly once.
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const [version, bundleDir, outDir] = process.argv.slice(2);
if (!version || !bundleDir || !outDir) {
  console.error('usage: release-assets.mjs <version> <bundle-dir> <out-dir>');
  process.exit(2);
}

// Tauri's file name suffix for each platform → the name people download.
const ASSETS = [
  [`_${version}_x64-setup.exe`, 'BlinkBreak-Windows-Setup.exe'],
  [`_${version}_aarch64.dmg`, 'BlinkBreak-Mac-AppleSilicon.dmg'],
  [`_${version}_x64.dmg`, 'BlinkBreak-Mac-Intel.dmg'],
  [`_${version}_amd64.deb`, 'BlinkBreak-Linux.deb'],
  [`_${version}_amd64.AppImage`, 'BlinkBreak-Linux.AppImage'],
];

function listFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}

const files = listFiles(bundleDir);
const problems = [];
const copies = ASSETS.map(([suffix, name]) => {
  const matches = files.filter((file) => basename(file).endsWith(suffix));
  if (matches.length !== 1) problems.push(`expected one *${suffix} for ${name}, found ${matches.length}`);
  return [matches[0], name];
});
if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const [source, name] of copies) {
  copyFileSync(source, join(outDir, name));
  console.log(`${basename(source)} -> ${name}`);
}
