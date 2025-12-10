/**
 * Configuration File Loader
 *
 * Uses cosmiconfig to load configuration from various sources:
 * - package.json "sql-runner" field
 * - .sql-runnerrc (JSON or YAML)
 * - .sql-runnerrc.json
 * - .sql-runnerrc.yaml / .sql-runnerrc.yml
 * - .sql-runnerrc.js / .sql-runnerrc.cjs / .sql-runnerrc.mjs
 * - sql-runner.config.js / sql-runner.config.cjs / sql-runner.config.mjs
 * - sql-runner.config.ts (with TypeScript loader)
 */

import { cosmiconfig } from 'cosmiconfig';
import type { ConfigFileSchema, ConfigLoadResult } from './config-schema.js';
import { CONFIG_MODULE_NAME } from './config-schema.js';

/**
 * ConfigLoader class
 * Handles loading and caching of configuration files
 */
export class ConfigLoader {
  private explorer: ReturnType<typeof cosmiconfig>;
  private cachedResult: ConfigLoadResult | null = null;

  constructor() {
    this.explorer = cosmiconfig(CONFIG_MODULE_NAME, {
      searchPlaces: [
        'package.json',
        `.${CONFIG_MODULE_NAME}rc`,
        `.${CONFIG_MODULE_NAME}rc.json`,
        `.${CONFIG_MODULE_NAME}rc.yaml`,
        `.${CONFIG_MODULE_NAME}rc.yml`,
        `.${CONFIG_MODULE_NAME}rc.js`,
        `.${CONFIG_MODULE_NAME}rc.cjs`,
        `.${CONFIG_MODULE_NAME}rc.mjs`,
        `${CONFIG_MODULE_NAME}.config.js`,
        `${CONFIG_MODULE_NAME}.config.cjs`,
        `${CONFIG_MODULE_NAME}.config.mjs`,
        `${CONFIG_MODULE_NAME}.config.ts`,
      ],
    });
  }

  /**
   * Search for and load configuration file
   * Searches from the current working directory upward
   */
  async load(searchFrom?: string): Promise<ConfigLoadResult> {
    if (this.cachedResult) {
      return this.cachedResult;
    }

    try {
      const result = await this.explorer.search(searchFrom);

      if (result && !result.isEmpty) {
        this.cachedResult = {
          config: this.validateAndNormalize(result.config),
          filepath: result.filepath,
          found: true,
        };
      } else {
        this.cachedResult = {
          config: {},
          found: false,
        };
      }
    } catch (error) {
      // If there's an error loading the config, log it and return empty config
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Warning: Error loading config file: ${errorMessage}`);
      this.cachedResult = {
        config: {},
        found: false,
      };
    }

    return this.cachedResult;
  }

  /**
   * Load configuration from a specific file path
   */
  async loadFromPath(filepath: string): Promise<ConfigLoadResult> {
    try {
      const result = await this.explorer.load(filepath);

      if (result && !result.isEmpty) {
        return {
          config: this.validateAndNormalize(result.config),
          filepath: result.filepath,
          found: true,
        };
      }

      return {
        config: {},
        found: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load config from ${filepath}: ${errorMessage}`);
    }
  }

  /**
   * Clear the cached configuration
   */
  clearCache(): void {
    this.cachedResult = null;
    this.explorer.clearCaches();
  }

  /**
   * Validate and normalize the loaded configuration
   */
  private validateAndNormalize(config: unknown): ConfigFileSchema {
    if (typeof config !== 'object' || config === null) {
      return {};
    }

    const raw = config as Record<string, unknown>;
    const normalized: ConfigFileSchema = {};

    // String properties
    if (typeof raw.directory === 'string') {
      normalized.directory = raw.directory;
    }
    if (typeof raw.databaseUrl === 'string') {
      normalized.databaseUrl = raw.databaseUrl;
    }
    if (typeof raw.envFile === 'string') {
      normalized.envFile = raw.envFile;
    }
    if (typeof raw.confirmationPhrase === 'string') {
      normalized.confirmationPhrase = raw.confirmationPhrase;
    }
    if (typeof raw.logDirectory === 'string') {
      normalized.logDirectory = raw.logDirectory;
    }
    if (typeof raw.filePattern === 'string') {
      normalized.filePattern = raw.filePattern;
    }
    if (typeof raw.ignorePattern === 'string') {
      normalized.ignorePattern = raw.ignorePattern;
    }

    // Boolean properties
    if (typeof raw.yes === 'boolean') {
      normalized.yes = raw.yes;
    }
    if (typeof raw.verbose === 'boolean') {
      normalized.verbose = raw.verbose;
    }
    if (typeof raw.dryRun === 'boolean') {
      normalized.dryRun = raw.dryRun;
    }
    if (typeof raw.noLogs === 'boolean') {
      normalized.noLogs = raw.noLogs;
    }
    if (typeof raw.watch === 'boolean') {
      normalized.watch = raw.watch;
    }
    if (typeof raw.ssl === 'boolean') {
      normalized.ssl = raw.ssl;
    }

    // Array properties
    if (Array.isArray(raw.only)) {
      normalized.only = raw.only.filter((item): item is string => typeof item === 'string');
    }
    if (Array.isArray(raw.skip)) {
      normalized.skip = raw.skip.filter((item): item is string => typeof item === 'string');
    }

    return normalized;
  }
}

/**
 * Create a new ConfigLoader instance
 */
export function createConfigLoader(): ConfigLoader {
  return new ConfigLoader();
}

/**
 * Convenience function to load configuration
 */
export async function loadConfig(searchFrom?: string): Promise<ConfigLoadResult> {
  const loader = createConfigLoader();
  return loader.load(searchFrom);
}
