/**
 * Configuration options for the SQL runner
 */
export interface SqlRunnerConfig {
  /**
   * Supabase/PostgreSQL database URL
   * Format: postgres://user:password@host:port/database
   */
  databaseUrl: string;

  /**
   * Directory containing SQL files to execute
   * Files are executed in alphabetical order (00_, 01_, etc.)
   */
  sqlDirectory: string;

  /**
   * Optional file pattern to filter SQL files
   * @default /\.sql$/
   */
  filePattern?: RegExp;

  /**
   * Files matching this pattern will be ignored
   * @default /^_ignored|README/
   */
  ignorePattern?: RegExp;

  /**
   * Enable SSL for database connection
   * @default true
   */
  ssl?: boolean | { rejectUnauthorized: boolean };

  /**
   * Require human confirmation before executing
   * Set to false for CI/CD or automated pipelines
   * @default true
   */
  requireConfirmation?: boolean;

  /**
   * Custom confirmation phrase (if requireConfirmation is true)
   * @default "CONFIRM"
   */
  confirmationPhrase?: string;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;

  /**
   * Custom logger function
   * If not provided, uses console with colors
   */
  logger?: Logger;

  /**
   * Directory to save execution logs
   * Set to null to disable file logging
   * @default './logs'
   */
  logDirectory?: string | null;

  /**
   * Callback for SQL NOTICE messages
   */
  onNotice?: (message: string) => void;

  /**
   * Callback before each file execution
   */
  onBeforeFile?: (fileName: string, index: number, total: number) => void;

  /**
   * Callback after each file execution
   */
  onAfterFile?: (result: FileExecutionResult) => void;

  /**
   * Callback when execution completes
   */
  onComplete?: (summary: ExecutionSummary) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: SqlRunnerError) => void;
}

/**
 * Logger interface for custom logging implementations
 */
export interface Logger {
  info(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

/**
 * Result of executing a single SQL file
 */
export interface FileExecutionResult {
  /** File name that was executed */
  fileName: string;
  /** Full path to the file */
  filePath: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Savepoint name used for this file */
  savepointName: string;
  /** Error details if execution failed */
  error?: SqlRunnerError;
  /** Whether rollback was successful (if error occurred) */
  rollbackSuccess?: boolean;
}

/**
 * Summary of the entire execution run
 */
export interface ExecutionSummary {
  /** Total files processed */
  totalFiles: number;
  /** Successfully executed files */
  successfulFiles: number;
  /** Failed files */
  failedFiles: number;
  /** Total execution time in milliseconds */
  totalDurationMs: number;
  /** Individual file results */
  results: FileExecutionResult[];
  /** Whether all files succeeded */
  allSuccessful: boolean;
  /** Whether the transaction was committed */
  committed: boolean;
  /** Files that were skipped/ignored */
  ignoredFiles: string[];
}

/**
 * Extended error class for SQL runner errors
 */
export interface SqlRunnerError {
  /** Error message */
  message: string;
  /** PostgreSQL error code */
  code?: string;
  /** Additional error detail */
  detail?: string;
  /** Hint for resolving the error */
  hint?: string;
  /** Position in SQL where error occurred */
  position?: string;
  /** Context/location where error occurred */
  where?: string;
  /** Original error stack */
  stack?: string;
  /** File that caused the error */
  fileName?: string;
}

/**
 * Database connection configuration parsed from URL
 */
export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean | { rejectUnauthorized: boolean };
}

/**
 * Options for the run method
 */
export interface RunOptions {
  /**
   * Skip the confirmation prompt
   * Useful for CI/CD environments
   */
  skipConfirmation?: boolean;

  /**
   * Only run specific files (by name)
   */
  onlyFiles?: string[];

  /**
   * Skip specific files (by name)
   */
  skipFiles?: string[];

  /**
   * Dry run - show what would be executed without running
   */
  dryRun?: boolean;
}

/**
 * Events emitted by the SQL runner
 */
export type SqlRunnerEvent =
  | { type: 'connected' }
  | { type: 'transaction_started' }
  | { type: 'file_start'; fileName: string; index: number; total: number }
  | { type: 'file_complete'; result: FileExecutionResult }
  | { type: 'notice'; message: string }
  | { type: 'transaction_committed' }
  | { type: 'transaction_rolled_back' }
  | { type: 'complete'; summary: ExecutionSummary }
  | { type: 'error'; error: SqlRunnerError };

/**
 * Callback function names in SqlRunnerConfig (always optional)
 */
type SqlRunnerCallbacks =
  | 'onNotice'
  | 'onBeforeFile'
  | 'onAfterFile'
  | 'onComplete'
  | 'onError'
  | 'logger';

/**
 * Internal resolved configuration with all non-callback fields required
 * Callbacks and logger remain optional as they are user-provided
 */
export type ResolvedSqlRunnerConfig = Required<Omit<SqlRunnerConfig, SqlRunnerCallbacks>> &
  Pick<SqlRunnerConfig, SqlRunnerCallbacks>;
