/**
 * Sync version across all files in the codebase
 *
 * Reads version from package.json and updates:
 * - src/cli/help.ts (DEFAULT_PACKAGE_INFO)
 * - src/ui/renderer.ts (UIRenderer default)
 *
 * Usage: node scripts/sync-version.js
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
);
const version = packageJson.version;

console.log(`Syncing version: ${version}\n`);

// Files to update with their patterns
const filesToUpdate = [
  {
    path: 'src/cli/help.ts',
    pattern: /(version:\s*')[\d.]+(')/,
    replacement: `$1${version}$2`,
  },
  {
    path: 'src/ui/renderer.ts',
    pattern: /(this\.version\s*=\s*options\.version\s*\?\?\s*')[\d.]+(')/,
    replacement: `$1${version}$2`,
  },
];

let updated = 0;

for (const file of filesToUpdate) {
  const filePath = path.join(rootDir, file.path);

  if (!fs.existsSync(filePath)) {
    console.log(`  Skip: ${file.path} (not found)`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(file.pattern, file.replacement);

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`  Updated: ${file.path}`);
    updated++;
  } else {
    console.log(`  OK: ${file.path} (already at ${version})`);
  }
}

console.log(`\nDone! ${updated} file(s) updated.`);
