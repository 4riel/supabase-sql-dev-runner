/**
 * Supabase SQL Dev Runner
 *
 * Execute SQL scripts sequentially on Supabase PostgreSQL with
 * transaction safety, savepoints, and automatic rollback.
 *
 * @packageDocumentation
 */

// Main exports
export { SqlRunner, runSqlScripts } from './core/runner.js';

// Types
export type {
  SqlRunnerConfig,
  Logger,
  FileExecutionResult,
  ExecutionSummary,
  SqlRunnerError,
  ConnectionConfig,
  RunOptions,
  SqlRunnerEvent,
} from './types.js';

// Connection utilities
export {
  parseDatabaseUrl,
  maskPassword,
  validateDatabaseUrl,
  getErrorMessage,
} from './core/connection.js';

// Error handling (new SOLID architecture)
export {
  // Main functions
  getConnectionErrorHelp,
  formatConnectionErrorHelp,
  // Main class
  ConnectionErrorHandler,
  // Registry
  DefaultErrorDetectorRegistry,
  createDefaultRegistry,
  // Formatters
  ConsoleErrorFormatter,
  SimpleErrorFormatter,
  JsonErrorFormatter,
  MarkdownErrorFormatter,
  createDefaultFormatter,
  // Base detector for extension
  BaseErrorDetector,
} from './core/errors/index.js';

// Error handling types
export type {
  ConnectionContext,
  ErrorHelp,
  ErrorHelp as ConnectionErrorHelp, // Backwards compatibility alias
  ErrorDetector,
  ErrorFormatter,
  ErrorDetectorRegistry,
  ErrorHandlerOptions,
} from './core/errors/index.js';

// File scanner utilities
export {
  scanSqlFiles,
  readSqlFile,
  createSavepointName,
  DEFAULT_FILE_PATTERN,
  DEFAULT_IGNORE_PATTERN,
} from './core/file-scanner.js';

// Logger utilities
export { ConsoleLogger, SilentLogger, createLogger } from './core/logger.js';

// Executor (for advanced usage)
export { SqlExecutor } from './core/executor.js';

// Watcher
export { startWatcher } from './core/watcher.js';
export type { WatchOptions } from './core/watcher.js';
