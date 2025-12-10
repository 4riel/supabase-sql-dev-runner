/**
 * CLI Types and Interfaces
 *
 * Defines the contracts for CLI components following Interface Segregation Principle.
 */

/**
 * Parsed CLI arguments
 */
export interface CliArgs {
  sqlDirectory: string;
  databaseUrl?: string;
  envFile?: string;
  skipConfirmation: boolean;
  confirmationPhrase: string;
  verbose: boolean;
  dryRun: boolean;
  noLogs: boolean;
  logDirectory: string;
  onlyFiles?: string[];
  skipFiles?: string[];
  watch: boolean;
  help: boolean;
  version: boolean;
}

/**
 * Default values for CLI arguments
 */
export const CLI_DEFAULTS: Readonly<CliArgs> = Object.freeze({
  sqlDirectory: './sql',
  skipConfirmation: false,
  confirmationPhrase: 'CONFIRM',
  verbose: false,
  dryRun: false,
  noLogs: false,
  logDirectory: './logs',
  watch: false,
  help: false,
  version: false,
});

/**
 * CLI output interface for dependency injection
 */
export interface CliOutput {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

/**
 * File system abstraction for testing
 */
export interface FileSystem {
  exists(path: string): boolean;
  readFile(path: string): string;
}

/**
 * Process abstraction for testing
 */
export interface ProcessEnv {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
}

/**
 * Exit handler abstraction
 */
export interface ExitHandler {
  exit(code: number): never;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Environment loading result
 */
export interface EnvLoadResult {
  success: boolean;
  error?: string;
  loadedKeys?: string[];
}
