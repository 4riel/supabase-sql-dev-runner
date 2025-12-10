import * as readline from 'node:readline';
import type {
  SqlRunnerConfig,
  ResolvedSqlRunnerConfig,
  ExecutionSummary,
  FileExecutionResult,
  Logger,
  RunOptions,
} from '../types.js';
import {
  parseDatabaseUrl,
  validateDatabaseUrl,
  maskPassword,
  getErrorMessage,
} from './connection.js';
import {
  scanSqlFiles,
  DEFAULT_FILE_PATTERN,
  DEFAULT_IGNORE_PATTERN,
} from './file-scanner.js';
import { SqlExecutor } from './executor.js';
import { createLogger } from './logger.js';
import { createUIRenderer, c, type UIRenderer } from '../ui/index.js';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<SqlRunnerConfig> = {
  filePattern: DEFAULT_FILE_PATTERN,
  ignorePattern: DEFAULT_IGNORE_PATTERN,
  ssl: true,
  requireConfirmation: true,
  confirmationPhrase: 'CONFIRM',
  verbose: false,
  logDirectory: './logs',
};

/**
 * Supabase SQL Dev Runner
 *
 * Executes SQL scripts sequentially on a Supabase/PostgreSQL database
 * with transaction safety, savepoints, and automatic rollback.
 *
 * @example
 * ```ts
 * import { SqlRunner } from 'supabase-sql-dev-runner';
 *
 * const runner = new SqlRunner({
 *   databaseUrl: process.env.DATABASE_URL,
 *   sqlDirectory: './sql',
 * });
 *
 * const summary = await runner.run();
 * console.log(`Executed ${summary.successfulFiles} files`);
 * ```
 */
export class SqlRunner {
  private config: ResolvedSqlRunnerConfig;
  private logger: Logger;
  private ui: UIRenderer;
  private executor: SqlExecutor | null = null;
  private abortRequested = false;

  constructor(config: SqlRunnerConfig) {
    // Validate required config
    const databaseUrl = validateDatabaseUrl(config.databaseUrl);

    // Merge with defaults
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      databaseUrl,
      filePattern: config.filePattern ?? DEFAULT_FILE_PATTERN,
      ignorePattern: config.ignorePattern ?? DEFAULT_IGNORE_PATTERN,
      ssl: config.ssl ?? true,
      requireConfirmation: config.requireConfirmation ?? true,
      confirmationPhrase: config.confirmationPhrase ?? 'CONFIRM',
      verbose: config.verbose ?? false,
      logDirectory: config.logDirectory === undefined ? './logs' : config.logDirectory,
    } as ResolvedSqlRunnerConfig;

    // Set up logger (for file logging)
    this.logger =
      config.logger ??
      createLogger({
        verbose: this.config.verbose,
        logDirectory: this.config.logDirectory,
      });

    // Set up UI renderer
    this.ui = createUIRenderer({
      name: 'sql-runner',
      version: '1.2.0',
    });
  }

  /**
   * Runs the SQL execution pipeline
   *
   * @param options - Additional run options
   * @returns Execution summary with results
   */
  async run(options: RunOptions = {}): Promise<ExecutionSummary> {
    const startTime = Date.now();
    const results: FileExecutionResult[] = [];

    try {
      // Parse connection config
      const connectionConfig = parseDatabaseUrl(this.config.databaseUrl, this.config.ssl);

      // Render startup UI
      this.ui.banner();
      this.ui.devWarning();

      // Extract host from masked URL
      const maskedUrl = maskPassword(this.config.databaseUrl);
      const hostMatch = maskedUrl.match(/@([^:\/]+)/);
      const host = hostMatch ? hostMatch[1] : maskedUrl;

      // Scan for SQL files first to get count
      const scanResult = scanSqlFiles(this.config.sqlDirectory, {
        filePattern: this.config.filePattern,
        ignorePattern: this.config.ignorePattern,
      });

      // Show connection info
      this.ui.connectionInfo({
        host,
        directory: this.config.sqlDirectory,
        fileCount: scanResult.files.length,
        logDirectory: this.config.logDirectory,
      });

      if (scanResult.files.length === 0) {
        this.ui.warning('No SQL files found to execute');
        return this.createSummary(results, scanResult.ignoredFiles, startTime, false);
      }

      // Filter files based on options
      let filesToExecute = scanResult.filePaths;
      let fileNames = scanResult.files;

      if (options.onlyFiles?.length) {
        const onlySet = new Set(options.onlyFiles);
        const filtered = scanResult.files
          .map((f, i) => ({ name: f, path: scanResult.filePaths[i] }))
          .filter((f) => onlySet.has(f.name));
        fileNames = filtered.map((f) => f.name);
        filesToExecute = filtered.map((f) => f.path);

        // Warn about requested files that were not found
        const foundSet = new Set(fileNames);
        const notFound = options.onlyFiles.filter((f) => !foundSet.has(f));
        if (notFound.length > 0) {
          this.ui.warning(`Requested files not found: ${notFound.join(', ')}`);
        }
      }

      if (options.skipFiles?.length) {
        const skipSet = new Set(options.skipFiles);
        const filtered = fileNames
          .map((f, i) => ({ name: f, path: filesToExecute[i] }))
          .filter((f) => !skipSet.has(f.name));
        fileNames = filtered.map((f) => f.name);
        filesToExecute = filtered.map((f) => f.path);
      }

      // Show files to execute
      this.ui.fileList(fileNames);

      // Show ignored files
      this.ui.ignoredFiles(scanResult.ignoredFiles);

      // Dry run mode
      if (options.dryRun) {
        this.ui.dryRun();
        return this.createSummary(results, scanResult.ignoredFiles, startTime, false);
      }

      // Require confirmation unless skipped
      if (this.config.requireConfirmation && !options.skipConfirmation) {
        const confirmed = await this.requestConfirmation();
        if (!confirmed) {
          this.ui.cancelled();
          return this.createSummary(results, scanResult.ignoredFiles, startTime, false);
        }
      }

      // Create executor and connect
      this.executor = new SqlExecutor(
        connectionConfig,
        this.logger,
        this.config.onNotice
          ? (msg) => {
              this.ui.sqlNotice(msg);
              this.config.onNotice?.(msg);
            }
          : (msg) => this.ui.sqlNotice(msg)
      );

      this.ui.newline();
      this.ui.info('Connecting to database...');
      await this.executor.connect();
      await this.executor.beginTransaction();

      // Set up SIGINT handler for graceful shutdown during execution
      this.abortRequested = false;
      const sigintHandler = () => {
        if (!this.abortRequested) {
          this.abortRequested = true;
          this.ui.newline();
          this.ui.warning('Interrupt received - stopping after current file...');
        }
      };
      process.on('SIGINT', sigintHandler);

      this.ui.newline();
      this.ui.info('Executing files...');
      this.ui.newline();

      try {
        // Execute files
        for (let i = 0; i < filesToExecute.length; i++) {
          // Check if abort was requested before starting next file
          if (this.abortRequested) {
            this.ui.warning('Execution aborted by user (Ctrl+C)');
            await this.executor.rollback();
            return this.createSummary(results, scanResult.ignoredFiles, startTime, false);
          }

          const filePath = filesToExecute[i];
          const fileName = fileNames[i];

          // Callback before file
          this.config.onBeforeFile?.(fileName, i, filesToExecute.length);

          const result = await this.executor.executeFile(filePath, i);
          results.push(result);

          // Show result
          this.ui.fileResultSimple(
            {
              fileName,
              success: result.success,
              durationMs: result.durationMs,
              error: result.error?.message,
            },
            i,
            filesToExecute.length
          );

          // Callback after file
          this.config.onAfterFile?.(result);

          // Stop on failure
          if (!result.success) {
            this.ui.newline();
            this.ui.error({
              message: result.error?.message ?? 'Unknown error',
              code: result.error?.code,
              detail: result.error?.detail,
              hint: result.error?.hint,
              fileName,
            });

            if (this.config.logDirectory) {
              this.ui.info(`Full error details saved to: ${this.config.logDirectory}/sql-runner-error.log`);
            }
            await this.executor.rollback();
            return this.createSummary(results, scanResult.ignoredFiles, startTime, false);
          }
        }

        // Check abort one more time after all files
        if (this.abortRequested) {
          this.ui.warning('Execution aborted by user (Ctrl+C)');
          await this.executor.rollback();
          return this.createSummary(results, scanResult.ignoredFiles, startTime, false);
        }
      } finally {
        // Always remove SIGINT handler
        process.removeListener('SIGINT', sigintHandler);
      }

      // All successful - commit
      await this.executor.commit();

      const summary = this.createSummary(results, scanResult.ignoredFiles, startTime, true);
      this.config.onComplete?.(summary);

      // Show summary
      this.ui.summary({
        totalFiles: summary.totalFiles,
        successfulFiles: summary.successfulFiles,
        failedFiles: summary.failedFiles,
        totalDurationMs: summary.totalDurationMs,
        committed: summary.committed,
      });

      return summary;
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = getErrorMessage(error);

      // Extract PostgreSQL error details if available
      const pgError = error as Error & {
        code?: string;
        detail?: string;
        hint?: string;
      };

      const sqlError = {
        message: errorMessage,
        code: pgError.code,
        detail: pgError.detail,
        hint: pgError.hint,
        stack: error instanceof Error ? error.stack : undefined,
      };

      this.config.onError?.(sqlError);

      this.ui.error({
        message: errorMessage,
        code: pgError.code,
        detail: pgError.detail,
        hint: pgError.hint,
      });

      if (this.config.logDirectory) {
        this.ui.info(`Full error details saved to: ${this.config.logDirectory}/sql-runner-error.log`);
      }

      // Try to rollback
      if (this.executor) {
        try {
          await this.executor.rollback();
        } catch {
          this.ui.errorMessage('Failed to rollback transaction');
        }
      }

      throw error;
    } finally {
      // Always disconnect
      if (this.executor) {
        await this.executor.disconnect();
      }
    }
  }

  /**
   * Requests user confirmation before execution
   * Handles readline errors and SIGINT gracefully
   */
  private async requestConfirmation(): Promise<boolean> {
    // Check if stdin is a TTY (interactive terminal)
    if (!process.stdin.isTTY) {
      this.ui.warning('Non-interactive mode detected. Use -y to skip confirmation.');
      return false;
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.ui.newline();
    this.ui.confirmationWarning();

    return new Promise((resolve) => {
      let answered = false;

      // Handle readline errors
      rl.on('error', () => {
        if (!answered) {
          answered = true;
          rl.close();
          resolve(false);
        }
      });

      // Handle SIGINT (Ctrl+C) during confirmation
      rl.on('SIGINT', () => {
        if (!answered) {
          answered = true;
          this.ui.newline();
          rl.close();
          resolve(false);
        }
      });

      // Handle stream close (e.g., piped input ends)
      rl.on('close', () => {
        if (!answered) {
          answered = true;
          resolve(false);
        }
      });

      rl.question(
        `${c.muted('Type')} ${c.highlight(`"${this.config.confirmationPhrase}"`)} ${c.muted('to proceed:')} `,
        (answer) => {
          if (!answered) {
            answered = true;
            rl.close();
            resolve(answer === this.config.confirmationPhrase);
          }
        }
      );
    });
  }

  /**
   * Creates an execution summary
   */
  private createSummary(
    results: FileExecutionResult[],
    ignoredFiles: string[],
    startTime: number,
    committed: boolean
  ): ExecutionSummary {
    const successfulFiles = results.filter((r) => r.success).length;
    const failedFiles = results.filter((r) => !r.success).length;

    return {
      totalFiles: results.length,
      successfulFiles,
      failedFiles,
      totalDurationMs: Date.now() - startTime,
      results,
      allSuccessful: failedFiles === 0,
      committed,
      ignoredFiles,
    };
  }
}

/**
 * Creates and runs the SQL runner with the given config
 * Convenience function for simple usage
 *
 * @example
 * ```ts
 * import { runSqlScripts } from 'supabase-sql-dev-runner';
 *
 * const summary = await runSqlScripts({
 *   databaseUrl: process.env.DATABASE_URL,
 *   sqlDirectory: './sql',
 * });
 * ```
 */
export async function runSqlScripts(
  config: SqlRunnerConfig,
  options?: RunOptions
): Promise<ExecutionSummary> {
  const runner = new SqlRunner(config);
  return runner.run(options);
}
