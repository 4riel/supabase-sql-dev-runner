import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Logger } from '../types.js';
import { c, symbols } from '../ui/index.js';

/**
 * Creates an ISO 8601 timestamp string for logging
 * @returns Current timestamp in ISO format
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Console logger with styled output and optional file logging
 *
 * Provides styled console output using the UI theme system
 * and can optionally write logs to files.
 *
 * @example
 * ```ts
 * const logger = new ConsoleLogger({ logDirectory: './logs' });
 * logger.info('Starting process...');
 * logger.success('Operation completed!');
 * logger.error('Something went wrong');
 * ```
 */
export class ConsoleLogger implements Logger {
  private logDirectory: string | null;
  private logFile: string | null = null;
  private errorFile: string | null = null;

  /**
   * Creates a new ConsoleLogger instance
   *
   * @param options - Logger configuration options
   * @param options.logDirectory - Directory for log files, or null to disable file logging
   */
  constructor(options: { logDirectory?: string | null } = {}) {
    this.logDirectory = options.logDirectory ?? null;

    if (this.logDirectory) {
      this.ensureLogDirectory();
      this.logFile = path.join(this.logDirectory, 'sql-runner.log');
      this.errorFile = path.join(this.logDirectory, 'sql-runner-error.log');
    }
  }

  /** Creates the log directory if it doesn't exist */
  private ensureLogDirectory(): void {
    if (this.logDirectory && !fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  /** Formats a log message with timestamp and level prefix for file logging */
  private formatFileMessage(level: string, message: string): string {
    return `[${getTimestamp()}] [${level}] ${message}`;
  }

  /** Appends a message to log files (main log and optionally error log) */
  private writeToFile(message: string, isError = false): void {
    if (this.logFile) {
      fs.appendFileSync(this.logFile, `${message}\n`);
    }

    if (isError && this.errorFile) {
      fs.appendFileSync(this.errorFile, `${message}\n`);
    }
  }

  info(message: string): void {
    console.log(`${c.info(symbols.info)} ${message}`);
    this.writeToFile(this.formatFileMessage('INFO', message));
  }

  success(message: string): void {
    console.log(`${c.success(symbols.success)} ${message}`);
    this.writeToFile(this.formatFileMessage('SUCCESS', message));
  }

  warning(message: string): void {
    console.log(`${c.warning(symbols.warning)} ${message}`);
    this.writeToFile(this.formatFileMessage('WARNING', message));
  }

  error(message: string): void {
    console.error(`${c.error(symbols.error)} ${message}`);
    this.writeToFile(this.formatFileMessage('ERROR', message), true);
  }

  debug(message: string): void {
    console.log(`${c.muted(symbols.dot)} ${c.muted(message)}`);
    this.writeToFile(this.formatFileMessage('DEBUG', message));
  }
}

/**
 * Silent logger that discards all messages
 *
 * Implements the Logger interface but produces no output.
 * Useful for testing, CI environments, or when log output is not desired.
 *
 * @example
 * ```ts
 * const runner = new SqlRunner({
 *   databaseUrl: process.env.DATABASE_URL,
 *   sqlDirectory: './sql',
 *   logger: new SilentLogger(),
 * });
 * ```
 */
export class SilentLogger implements Logger {
  info(): void {}
  success(): void {}
  warning(): void {}
  error(): void {}
  debug(): void {}
}

/**
 * Factory function to create a logger based on configuration
 *
 * @param options - Logger factory options
 * @param options.verbose - Enable verbose output (currently unused, reserved for future)
 * @param options.logDirectory - Directory for log files, or null to disable file logging
 * @param options.silent - If true, returns a SilentLogger that produces no output
 * @returns A Logger instance configured according to the options
 *
 * @example
 * ```ts
 * // Normal logger with file logging
 * const logger = createLogger({ logDirectory: './logs' });
 *
 * // Silent logger for testing
 * const silentLogger = createLogger({ silent: true });
 * ```
 */
export function createLogger(options: {
  verbose?: boolean;
  logDirectory?: string | null;
  silent?: boolean;
}): Logger {
  if (options.silent) {
    return new SilentLogger();
  }

  return new ConsoleLogger({
    logDirectory: options.logDirectory,
  });
}
