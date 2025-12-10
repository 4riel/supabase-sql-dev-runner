/**
 * Post-build script to fix CommonJS output
 * - Renames .js files to .cjs
 * - Fixes import paths to use .cjs extension
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cjsDir = path.join(__dirname, '..', 'dist', 'cjs');

/**
 * Recursively process directory
 */
function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log('CJS directory not found:', dir);
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.name.endsWith('.js')) {
      // Read and fix imports
      let content = fs.readFileSync(fullPath, 'utf8');

      // Fix require paths to use .cjs
      content = content.replace(
        /require\("([^"]+)\.js"\)/g,
        'require("$1.cjs")'
      );

      // Write with .cjs extension
      const newPath = fullPath.replace(/\.js$/, '.cjs');
      fs.writeFileSync(newPath, content);

      // Remove old .js file
      fs.unlinkSync(fullPath);

      console.log(`Converted: ${entry.name} -> ${path.basename(newPath)}`);
    }
  }
}

console.log('Fixing CommonJS output...');
processDirectory(cjsDir);
console.log('Done!');
