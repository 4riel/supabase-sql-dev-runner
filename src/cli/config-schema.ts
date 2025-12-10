/**
 * Configuration File Schema
 *
 * Defines the structure for configuration files (.sql-runnerrc, sql-runner.config.js, etc.)
 * This is the user-facing configuration schema that gets merged with CLI args.
 */

/**
 * Configuration file schema
 * All properties are optional - users only specify what they want to override
 */
export interface ConfigFileSchema {
  /**
   * Directory containing SQL files to execute
   * @default "./sql"
   * @example "./database/scripts"
   */
  directory?: string;

  /**
   * Database URL (can also use DATABASE_URL env var)
   * @example "postgres://user:pass@host:5432/db"
   */
  databaseUrl?: string;

  /**
   * Path to .env file
   * @default ".env"
   */
  envFile?: string;

  /**
   * Skip confirmation prompt
   * @default false
   */
  yes?: boolean;

  /**
   * Custom confirmation phrase
   * @default "CONFIRM"
   */
  confirmationPhrase?: string;

  /**
   * Enable verbose output
   * @default false
   */
  verbose?: boolean;

  /**
   * Dry run mode - preview without executing
   * @default false
   */
  dryRun?: boolean;

  /**
   * Disable file logging
   * @default false
   */
  noLogs?: boolean;

  /**
   * Directory for log files
   * @default "./logs"
   */
  logDirectory?: string;

  /**
   * Only run specific files (by name)
   * @example ["01_tables.sql", "02_functions.sql"]
   */
  only?: string[];

  /**
   * Skip specific files (by name)
   * @example ["06_seed.sql"]
   */
  skip?: string[];

  /**
   * Watch mode - re-run on file changes
   * @default false
   */
  watch?: boolean;

  /**
   * Enable SSL for database connection
   * @default true
   */
  ssl?: boolean;

  /**
   * File pattern to match SQL files (regex string)
   * @default "\\.sql$"
   */
  filePattern?: string;

  /**
   * Pattern for files to ignore (regex string)
   * @default "^_ignored|README"
   */
  ignorePattern?: string;
}

/**
 * Result of loading a configuration file
 */
export interface ConfigLoadResult {
  /** The loaded configuration (empty object if no config found) */
  config: ConfigFileSchema;
  /** Path to the config file that was loaded (undefined if none found) */
  filepath?: string;
  /** Whether a config file was found */
  found: boolean;
}

/**
 * Module name used for cosmiconfig search
 * This determines the config file names: .sql-runnerrc, sql-runner.config.js, etc.
 */
export const CONFIG_MODULE_NAME = 'sql-runner';

/**
 * Default configuration values
 */
export const CONFIG_DEFAULTS: Required<
  Omit<ConfigFileSchema, 'databaseUrl' | 'only' | 'skip'>
> & {
  databaseUrl?: string;
  only?: string[];
  skip?: string[];
} = {
  directory: './sql',
  envFile: '.env',
  yes: false,
  confirmationPhrase: 'CONFIRM',
  verbose: false,
  dryRun: false,
  noLogs: false,
  logDirectory: './logs',
  watch: false,
  ssl: true,
  filePattern: '\\.sql$',
  ignorePattern: '^_ignored|README',
};
