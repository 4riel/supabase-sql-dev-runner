/**
 * Environment Loader
 *
 * Single Responsibility: Load environment variables from files.
 * Follows Dependency Inversion with injectable file system and process env.
 */

import * as fs from 'node:fs';
import type { FileSystem, ProcessEnv, EnvLoadResult } from './types.js';

/**
 * Default file system implementation
 */
export const defaultFileSystem: FileSystem = {
  exists: (path: string) => fs.existsSync(path),
  readFile: (path: string) => fs.readFileSync(path, 'utf8'),
};

/**
 * Default process env implementation
 */
export const defaultProcessEnv: ProcessEnv = {
  get: (key: string) => process.env[key],
  set: (key: string, value: string) => {
    process.env[key] = value;
  },
};

/**
 * Parse a single line from an env file
 */
function parseLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();

  // Skip comments and empty lines
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const equalIndex = trimmed.indexOf('=');
  if (equalIndex <= 0) {
    return null;
  }

  const key = trimmed.slice(0, equalIndex).trim();
  let value = trimmed.slice(equalIndex + 1).trim();

  // Remove surrounding quotes if present
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

/**
 * Parse env file content into key-value pairs
 */
export function parseEnvContent(content: string): Map<string, string> {
  const result = new Map<string, string>();
  const lines = content.split('\n');

  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed) {
      result.set(parsed.key, parsed.value);
    }
  }

  return result;
}

/**
 * Environment Loader class
 */
export class EnvLoader {
  constructor(
    private fileSystem: FileSystem = defaultFileSystem,
    private processEnv: ProcessEnv = defaultProcessEnv
  ) {}

  /**
   * Load environment variables from a file
   * Only sets variables that are not already set in the environment
   *
   * @param envPath - Path to the env file
   * @returns Result indicating success/failure and loaded keys
   */
  load(envPath: string): EnvLoadResult {
    if (!this.fileSystem.exists(envPath)) {
      return {
        success: false,
        error: `Environment file not found: ${envPath}`,
      };
    }

    try {
      const content = this.fileSystem.readFile(envPath);
      const envVars = parseEnvContent(content);
      const loadedKeys: string[] = [];

      for (const [key, value] of envVars) {
        // Only set if not already set (environment takes precedence)
        if (this.processEnv.get(key) === undefined) {
          this.processEnv.set(key, value);
          loadedKeys.push(key);
        }
      }

      return {
        success: true,
        loadedKeys,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read env file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check if an env file exists
   */
  exists(envPath: string): boolean {
    return this.fileSystem.exists(envPath);
  }

  /**
   * Get an environment variable
   */
  get(key: string): string | undefined {
    return this.processEnv.get(key);
  }
}

/**
 * Convenience function for simple usage
 */
export function loadEnvFile(
  envPath: string,
  fileSystem: FileSystem = defaultFileSystem,
  processEnv: ProcessEnv = defaultProcessEnv
): EnvLoadResult {
  const loader = new EnvLoader(fileSystem, processEnv);
  return loader.load(envPath);
}
