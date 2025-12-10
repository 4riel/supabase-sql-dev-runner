import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Options for scanning SQL files
 */
export interface FileScannerOptions {
  /** Pattern to match SQL files */
  filePattern: RegExp;
  /** Pattern for files to ignore */
  ignorePattern: RegExp;
}

/**
 * Result of scanning a directory for SQL files
 */
export interface FileScanResult {
  /** Files to be executed (sorted) */
  files: string[];
  /** Files that were ignored */
  ignoredFiles: string[];
  /** Full paths to files */
  filePaths: string[];
}

/**
 * Default file patterns
 */
export const DEFAULT_FILE_PATTERN = /\.sql$/;
export const DEFAULT_IGNORE_PATTERN = /^_ignored|README/;

/**
 * Scans a directory for SQL files to execute
 *
 * @param directory - Directory path to scan
 * @param options - Scanning options
 * @returns Scan result with files to execute and ignored files
 * @throws Error if directory doesn't exist or is not readable
 *
 * @example
 * ```ts
 * const result = scanSqlFiles('./sql', {
 *   filePattern: /\.sql$/,
 *   ignorePattern: /^_ignored/
 * });
 * console.log(result.files); // ['00_setup.sql', '01_tables.sql', ...]
 * ```
 */
export function scanSqlFiles(
  directory: string,
  options: FileScannerOptions
): FileScanResult {
  const resolvedDir = path.resolve(directory);

  // Validate directory exists
  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`SQL directory not found: ${resolvedDir}`);
  }

  // Validate it's a directory
  const stats = fs.statSync(resolvedDir);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedDir}`);
  }

  // Read all files
  const allEntries = fs.readdirSync(resolvedDir);

  // Filter for SQL files
  const sqlFiles = allEntries.filter((file) => options.filePattern.test(file));

  // Separate executable and ignored files
  const executableFiles: string[] = [];
  const ignoredFiles: string[] = [];

  for (const file of sqlFiles) {
    if (options.ignorePattern.test(file)) {
      ignoredFiles.push(file);
    } else {
      executableFiles.push(file);
    }
  }

  // Sort alphabetically for predictable execution order
  executableFiles.sort();
  ignoredFiles.sort();

  // Create full paths
  const filePaths = executableFiles.map((file) => path.join(resolvedDir, file));

  return {
    files: executableFiles,
    ignoredFiles,
    filePaths,
  };
}

/**
 * Reads a SQL file's content
 *
 * @param filePath - Full path to the SQL file
 * @returns File content as string
 * @throws Error if file cannot be read
 */
export function readSqlFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to read SQL file: ${filePath}\n${message}`);
  }
}

/**
 * Creates a valid savepoint name from a filename
 * PostgreSQL savepoint names must be valid identifiers
 *
 * @param fileName - Original file name
 * @param index - Index in execution order
 * @returns Valid savepoint name
 */
export function createSavepointName(fileName: string, index: number): string {
  // Replace non-alphanumeric characters with underscores
  const sanitized = fileName.replace(/[^a-zA-Z0-9]/g, '_');
  return `sp_${sanitized}_${index}`;
}
