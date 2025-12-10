/**
 * CLI Module Exports
 *
 * Public API for the CLI module.
 */

// Types
export type {
  CliArgs,
  CliOutput,
  FileSystem,
  ProcessEnv,
  ExitHandler,
  ValidationResult,
  EnvLoadResult,
} from './types.js';

export { CLI_DEFAULTS } from './types.js';

// Argument Parser
export { ArgParser, parseArgs } from './arg-parser.js';

// Environment Loader
export {
  EnvLoader,
  loadEnvFile,
  parseEnvContent,
  defaultFileSystem,
  defaultProcessEnv,
} from './env-loader.js';

// Validators
export {
  CliValidator,
  DatabaseUrlValidator,
  SqlDirectoryValidator,
  EnvFileValidator,
} from './validators.js';

export type { Validator } from './validators.js';

// Help Display
export {
  HelpDisplay,
  showHelp,
  showVersion,
  getHelpText,
  defaultCliOutput,
} from './help.js';

// Configuration
export {
  ConfigLoader,
  createConfigLoader,
  loadConfig,
} from './config-loader.js';

export type { ConfigFileSchema, ConfigLoadResult } from './config-schema.js';
export { CONFIG_MODULE_NAME, CONFIG_DEFAULTS } from './config-schema.js';

export {
  ConfigMerger,
  createConfigMerger,
  mergeConfig,
} from './config-merger.js';

export type { MergedConfig } from './config-merger.js';

// Executor
export {
  CliExecutor,
  buildRunnerConfig,
  buildRunOptions,
} from './executor.js';

export type { ExecutorConfig, ExecutionResult } from './executor.js';

// Application
export {
  CliApplication,
  runCli,
  createDefaultDependencies,
} from './application.js';

export type { CliDependencies } from './application.js';
