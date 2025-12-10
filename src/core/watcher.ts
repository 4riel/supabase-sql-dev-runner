import * as fs from 'node:fs';
import { getErrorMessage } from './connection.js';
import { c, symbols } from '../ui/index.js';

/**
 * Options for the file watcher
 */
export interface WatchOptions {
  /** Directory to watch for changes */
  directory: string;
  /** Pattern to match files (e.g., /\.sql$/) */
  pattern: RegExp;
  /** Seconds to wait before execution (default: 30) */
  countdownSeconds: number;
  /** Callback to execute when countdown completes */
  onExecute: () => Promise<void>;
  /** Logger for output */
  logger: {
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
}

/**
 * Starts watching a directory for file changes with countdown
 *
 * @param options - Watch configuration
 * @returns Cleanup function to stop watching
 *
 * @example
 * ```ts
 * const cleanup = startWatcher({
 *   directory: './sql',
 *   pattern: /\.sql$/,
 *   countdownSeconds: 30,
 *   onExecute: async () => { await runner.run(); },
 *   logger: console,
 * });
 *
 * // Later: cleanup();
 * ```
 */
export function startWatcher(options: WatchOptions): () => void {
  let countdownTimer: ReturnType<typeof setTimeout> | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let secondsRemaining = 0;
  let isExecuting = false;

  /**
   * Clears any active countdown timers
   */
  const clearCountdown = (): void => {
    if (countdownTimer) {
      clearTimeout(countdownTimer);
      countdownTimer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  };

  /**
   * Starts or resets the countdown timer
   */
  const startCountdown = (): void => {
    // Don't start countdown if currently executing
    if (isExecuting) {
      options.logger.info('Execution in progress, change queued...');
      return;
    }

    clearCountdown();
    secondsRemaining = options.countdownSeconds;

    // Show initial countdown
    process.stdout.write(
      `\r${c.muted(`${symbols.pending} Running in ${secondsRemaining}s... (save again to reset)`)}  `
    );

    // Update countdown display every second
    countdownInterval = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining > 0) {
        process.stdout.write(
          `\r${c.muted(`${symbols.pending} Running in ${secondsRemaining}s... (save again to reset)`)}  `
        );
      }
    }, 1000);

    // Execute after countdown completes
    countdownTimer = setTimeout(async () => {
      clearCountdown();

      // Clear the countdown line and show execution message
      process.stdout.write('\r                                                    \r');
      console.log(`${c.primary(symbols.arrowRight)} Executing SQL files...\n`);

      isExecuting = true;
      try {
        await options.onExecute();
      } catch (error) {
        options.logger.warning(`Execution error: ${getErrorMessage(error)}`);
      } finally {
        isExecuting = false;
      }

      console.log('');
      options.logger.info(`${c.primary(symbols.running)} Watching for changes... ${c.muted('(Ctrl+C to stop)')}`);
    }, options.countdownSeconds * 1000);
  };

  // Start watching the directory
  const watcher = fs.watch(options.directory, (_eventType, filename) => {
    // Only react to files matching the pattern
    if (filename && options.pattern.test(filename)) {
      // Clear line and show which file changed
      process.stdout.write('\r                                                    \r');
      options.logger.info(`Changed: ${c.cyan(filename)}`);
      startCountdown();
    }
  });

  // Handle watcher errors
  watcher.on('error', (error) => {
    options.logger.warning(`Watch error: ${error.message}`);
  });

  // Return cleanup function
  return (): void => {
    clearCountdown();
    watcher.close();
  };
}
