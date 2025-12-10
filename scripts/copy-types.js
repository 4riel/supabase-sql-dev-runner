/**
 * Copy type declarations for CJS support
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const typesDir = path.join(__dirname, '..', 'dist', 'types');

/**
 * Recursively process directory to create .d.cts files
 */
function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log('Types directory not found:', dir);
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.d.ts')) {
      // Read content
      let content = fs.readFileSync(fullPath, 'utf8');

      // Fix imports to use .cjs extension
      content = content.replace(
        /from ['"]([^'"]+)\.js['"]/g,
        "from '$1.cjs'"
      );

      // Write .d.cts file
      const newPath = fullPath.replace(/\.d\.ts$/, '.d.cts');
      fs.writeFileSync(newPath, content);

      console.log(`Created: ${path.basename(newPath)}`);
    }
  }
}

console.log('Creating CJS type declarations...');
processDirectory(typesDir);
console.log('Done!');
