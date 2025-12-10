/**
 * Help and Version Display
 *
 * Single Responsibility: Display help and version information.
 * Follows Dependency Inversion with injectable output and file system.
 */

import * as path from 'node:path';
import * as url from 'node:url';
import type { CliOutput, FileSystem } from './types.js';
import { defaultFileSystem } from './env-loader.js';
import { c, symbols, renderBanner } from '../ui/index.js';

/**
 * Default CLI output implementation
 */
export const defaultCliOutput: CliOutput = {
  log: (message: string) => console.log(message),
  error: (message: string) => console.error(message),
  warn: (message: string) => console.warn(message),
};

/**
 * Package info for version display
 */
interface PackageInfo {
  name: string;
  version: string;
}

/**
 * Default package info fallback
 */
const DEFAULT_PACKAGE_INFO: PackageInfo = {
  name: 'sql-runner',
  version: '1.0.0',
};

/**
 * Generate styled help text
 */
function generateHelpText(version: string): string {
  return `
${renderBanner({ name: 'sql-runner', version, subtitle: 'Supabase SQL Dev Runner' })}

${c.warning(symbols.warning)} ${c.warning('Development tool')} ${c.muted('- not for production use')}

${c.title('Usage')}
  sql-runner [options] [directory]

${c.title('Arguments')}
  ${c.muted('directory')}              SQL directory ${c.muted('(default: ./sql)')}

${c.title('Options')}
  ${c.cyan('-h, --help')}             Show this help message
  ${c.cyan('-v, --version')}          Show version number

  ${c.cyan('-d, --directory')} <path>  SQL files directory
  ${c.cyan('-u, --database-url')} <url> Database URL (or use DATABASE_URL env)
  ${c.cyan('-e, --env-file')} <path>  Load environment from file ${c.muted('(default: .env)')}

  ${c.cyan('-y, --yes')}              Skip confirmation prompt
  ${c.cyan('--confirmation-phrase')}  Custom confirmation phrase ${c.muted('(default: CONFIRM)')}

  ${c.cyan('--verbose')}              Enable verbose output
  ${c.cyan('--dry-run')}              Show what would be executed
  ${c.cyan('--no-logs')}              Disable file logging
  ${c.cyan('--log-directory')} <path> Log directory ${c.muted('(default: ./logs)')}

  ${c.cyan('--only')} <files>         Only run specific files ${c.muted('(comma-separated)')}
  ${c.cyan('--skip')} <files>         Skip specific files ${c.muted('(comma-separated)')}

  ${c.cyan('-w, --watch')}            Watch for file changes and re-run

${c.title('Environment')}
  ${c.muted('DATABASE_URL')}           PostgreSQL connection string

${c.title('Examples')}
  ${c.muted('$')} sql-runner                              ${c.muted('# Run all SQL files')}
  ${c.muted('$')} sql-runner ./migrations                 ${c.muted('# Custom directory')}
  ${c.muted('$')} sql-runner -y                           ${c.muted('# Skip confirmation')}
  ${c.muted('$')} sql-runner --dry-run                    ${c.muted('# Preview mode')}
  ${c.muted('$')} sql-runner --only "01_tables.sql"       ${c.muted('# Run specific file')}
  ${c.muted('$')} sql-runner --skip "06_seed.sql"         ${c.muted('# Skip specific file')}
  ${c.muted('$')} sql-runner --watch                      ${c.muted('# Watch mode')}
`;
}

/**
 * Help Display class
 */
export class HelpDisplay {
  constructor(
    private output: CliOutput = defaultCliOutput,
    private fileSystem: FileSystem = defaultFileSystem
  ) {}

  /**
   * Display help message
   */
  showHelp(): void {
    const info = this.getPackageInfo();
    this.output.log(generateHelpText(info.version));
  }

  /**
   * Display version number
   */
  showVersion(): void {
    const info = this.getPackageInfo();
    this.output.log(`${c.primary(symbols.arrowRight)} ${c.title(info.name)} ${c.muted(`v${info.version}`)}`);
  }

  /**
   * Get package info from package.json
   */
  private getPackageInfo(): PackageInfo {
    try {
      // Try multiple paths to find package.json
      const possiblePaths = this.getPackageJsonPaths();

      for (const packagePath of possiblePaths) {
        if (this.fileSystem.exists(packagePath)) {
          const content = this.fileSystem.readFile(packagePath);
          const packageJson = JSON.parse(content);
          return {
            name: packageJson.name || DEFAULT_PACKAGE_INFO.name,
            version: packageJson.version || DEFAULT_PACKAGE_INFO.version,
          };
        }
      }
    } catch {
      // Fall through to default
    }

    return DEFAULT_PACKAGE_INFO;
  }

  /**
   * Get possible paths to package.json
   */
  private getPackageJsonPaths(): string[] {
    const paths: string[] = [];

    // Try __dirname-based paths (for CJS)
    if (typeof __dirname !== 'undefined') {
      paths.push(path.join(__dirname, '..', '..', 'package.json'));
      paths.push(path.join(__dirname, '..', 'package.json'));
    }

    // Try import.meta.url-based paths (for ESM)
    try {
      const currentFile = url.fileURLToPath(import.meta.url);
      const currentDir = path.dirname(currentFile);
      paths.push(path.join(currentDir, '..', '..', 'package.json'));
      paths.push(path.join(currentDir, '..', 'package.json'));
    } catch {
      // import.meta not available
    }

    // Try cwd-based path
    paths.push(path.join(process.cwd(), 'package.json'));

    return paths;
  }
}

/**
 * Convenience functions for simple usage
 */
export function showHelp(output: CliOutput = defaultCliOutput): void {
  const display = new HelpDisplay(output);
  display.showHelp();
}

export function showVersion(
  output: CliOutput = defaultCliOutput,
  fileSystem: FileSystem = defaultFileSystem
): void {
  const display = new HelpDisplay(output, fileSystem);
  display.showVersion();
}

/**
 * Get the help text (for testing)
 */
export function getHelpText(): string {
  return generateHelpText(DEFAULT_PACKAGE_INFO.version);
}
