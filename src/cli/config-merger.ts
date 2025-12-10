/**
 * Configuration Merger
 *
 * Merges configuration from multiple sources with proper priority:
 * 1. CLI arguments (highest priority)
 * 2. Configuration file
 * 3. Environment variables
 * 4. Default values (lowest priority)
 */

import type { CliArgs } from './types.js';
import { CLI_DEFAULTS } from './types.js';
import type { ConfigFileSchema } from './config-schema.js';

/**
 * Merged configuration result
 */
export interface MergedConfig extends CliArgs {
  /** Whether a config file was found and used */
  configFileUsed: boolean;
  /** Path to the config file (if found) */
  configFilePath?: string;
  /** SSL setting from config file */
  ssl?: boolean;
  /** File pattern regex string */
  filePattern?: string;
  /** Ignore pattern regex string */
  ignorePattern?: string;
}

/**
 * ConfigMerger class
 * Combines configuration from multiple sources
 */
export class ConfigMerger {
  /**
   * Merge configuration from all sources
   *
   * Priority (highest to lowest):
   * 1. CLI arguments
   * 2. Config file
   * 3. Defaults
   */
  merge(
    cliArgs: CliArgs,
    fileConfig: ConfigFileSchema,
    configFilePath?: string
  ): MergedConfig {
    // Start with defaults
    const result: MergedConfig = {
      ...CLI_DEFAULTS,
      configFileUsed: false,
    };

    // Apply config file values (if present)
    if (Object.keys(fileConfig).length > 0) {
      result.configFileUsed = true;
      result.configFilePath = configFilePath;

      // Map config file properties to CLI args
      if (fileConfig.directory !== undefined) {
        result.sqlDirectory = fileConfig.directory;
      }
      if (fileConfig.databaseUrl !== undefined) {
        result.databaseUrl = fileConfig.databaseUrl;
      }
      if (fileConfig.envFile !== undefined) {
        result.envFile = fileConfig.envFile;
      }
      if (fileConfig.yes !== undefined) {
        result.skipConfirmation = fileConfig.yes;
      }
      if (fileConfig.confirmationPhrase !== undefined) {
        result.confirmationPhrase = fileConfig.confirmationPhrase;
      }
      if (fileConfig.verbose !== undefined) {
        result.verbose = fileConfig.verbose;
      }
      if (fileConfig.dryRun !== undefined) {
        result.dryRun = fileConfig.dryRun;
      }
      if (fileConfig.noLogs !== undefined) {
        result.noLogs = fileConfig.noLogs;
      }
      if (fileConfig.logDirectory !== undefined) {
        result.logDirectory = fileConfig.logDirectory;
      }
      if (fileConfig.only !== undefined) {
        result.onlyFiles = fileConfig.only;
      }
      if (fileConfig.skip !== undefined) {
        result.skipFiles = fileConfig.skip;
      }
      if (fileConfig.watch !== undefined) {
        result.watch = fileConfig.watch;
      }
      if (fileConfig.ssl !== undefined) {
        result.ssl = fileConfig.ssl;
      }
      if (fileConfig.filePattern !== undefined) {
        result.filePattern = fileConfig.filePattern;
      }
      if (fileConfig.ignorePattern !== undefined) {
        result.ignorePattern = fileConfig.ignorePattern;
      }
    }

    // Apply CLI arguments (override config file)
    // Only override if the CLI value differs from default (was explicitly set)
    if (cliArgs.sqlDirectory !== CLI_DEFAULTS.sqlDirectory) {
      result.sqlDirectory = cliArgs.sqlDirectory;
    }
    if (cliArgs.databaseUrl !== undefined) {
      result.databaseUrl = cliArgs.databaseUrl;
    }
    if (cliArgs.envFile !== undefined) {
      result.envFile = cliArgs.envFile;
    }
    if (cliArgs.skipConfirmation !== CLI_DEFAULTS.skipConfirmation) {
      result.skipConfirmation = cliArgs.skipConfirmation;
    }
    if (cliArgs.confirmationPhrase !== CLI_DEFAULTS.confirmationPhrase) {
      result.confirmationPhrase = cliArgs.confirmationPhrase;
    }
    if (cliArgs.verbose !== CLI_DEFAULTS.verbose) {
      result.verbose = cliArgs.verbose;
    }
    if (cliArgs.dryRun !== CLI_DEFAULTS.dryRun) {
      result.dryRun = cliArgs.dryRun;
    }
    if (cliArgs.noLogs !== CLI_DEFAULTS.noLogs) {
      result.noLogs = cliArgs.noLogs;
    }
    if (cliArgs.logDirectory !== CLI_DEFAULTS.logDirectory) {
      result.logDirectory = cliArgs.logDirectory;
    }
    if (cliArgs.onlyFiles !== undefined) {
      result.onlyFiles = cliArgs.onlyFiles;
    }
    if (cliArgs.skipFiles !== undefined) {
      result.skipFiles = cliArgs.skipFiles;
    }
    if (cliArgs.watch !== CLI_DEFAULTS.watch) {
      result.watch = cliArgs.watch;
    }

    // Preserve help and version flags from CLI
    result.help = cliArgs.help;
    result.version = cliArgs.version;

    return result;
  }
}

/**
 * Create a new ConfigMerger instance
 */
export function createConfigMerger(): ConfigMerger {
  return new ConfigMerger();
}

/**
 * Convenience function to merge configuration
 */
export function mergeConfig(
  cliArgs: CliArgs,
  fileConfig: ConfigFileSchema,
  configFilePath?: string
): MergedConfig {
  const merger = createConfigMerger();
  return merger.merge(cliArgs, fileConfig, configFilePath);
}
