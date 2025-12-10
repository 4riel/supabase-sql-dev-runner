/**
 * CLI Runner Executor
 *
 * Single Responsibility: Execute SQL runner operations.
 * Handles running, watching, and error handling for CLI operations.
 */

import { SqlRunner } from '../core/runner.js';
import { startWatcher } from '../core/watcher.js';
import { getConnectionErrorHelp, formatConnectionErrorHelp } from '../core/connection.js';
import type { SqlRunnerConfig, ExecutionSummary, RunOptions } from '../types.js';
import type { CliArgs, CliOutput } from './types.js';
import type { MergedConfig } from './config-merger.js';
import { defaultCliOutput } from './help.js';
import { c, symbols } from '../ui/index.js';

/**
 * Configuration for the executor
 * Accepts either CliArgs or MergedConfig (which extends CliArgs with config file settings)
 */
export interface ExecutorConfig {
  databaseUrl: string;
  sqlDirectory: string;
  args: CliArgs | MergedConfig;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  summary?: ExecutionSummary;
  error?: string;
  exitCode: number;
}

/**
 * Build SqlRunnerConfig from CLI args
 */
export function buildRunnerConfig(config: ExecutorConfig): SqlRunnerConfig {
  const { databaseUrl, sqlDirectory, args } = config;

  const runnerConfig: SqlRunnerConfig = {
    databaseUrl,
    sqlDirectory,
    requireConfirmation: !args.skipConfirmation,
    confirmationPhrase: args.confirmationPhrase,
    verbose: args.verbose,
    logDirectory: args.noLogs ? null : args.logDirectory,
  };

  // Apply additional config file settings if available (MergedConfig)
  const mergedArgs = args as MergedConfig;
  if (mergedArgs.ssl !== undefined) {
    runnerConfig.ssl = mergedArgs.ssl;
  }
  if (mergedArgs.filePattern !== undefined) {
    runnerConfig.filePattern = new RegExp(mergedArgs.filePattern);
  }
  if (mergedArgs.ignorePattern !== undefined) {
    runnerConfig.ignorePattern = new RegExp(mergedArgs.ignorePattern);
  }

  return runnerConfig;
}

/**
 * Build RunOptions from CLI args
 */
export function buildRunOptions(args: CliArgs, skipConfirmation?: boolean): RunOptions {
  return {
    skipConfirmation: skipConfirmation ?? args.skipConfirmation,
    onlyFiles: args.onlyFiles,
    skipFiles: args.skipFiles,
    dryRun: args.dryRun,
  };
}

/**
 * CLI Executor class
 */
export class CliExecutor {
  private output: CliOutput;

  constructor(output: CliOutput = defaultCliOutput) {
    this.output = output;
  }

  /**
   * Execute SQL scripts
   */
  async execute(config: ExecutorConfig): Promise<ExecutionResult> {
    const runnerConfig = buildRunnerConfig(config);
    const runOptions = buildRunOptions(config.args);

    try {
      const runner = new SqlRunner(runnerConfig);
      const summary = await runner.run(runOptions);

      return {
        success: summary.allSuccessful,
        summary,
        exitCode: summary.allSuccessful ? 0 : 1,
      };
    } catch (error) {
      return this.handleError(error, config.databaseUrl);
    }
  }

  /**
   * Execute with watch mode
   */
  async executeWithWatch(
    config: ExecutorConfig,
    onCleanup?: () => void
  ): Promise<ExecutionResult> {
    const runnerConfig = buildRunnerConfig(config);
    const runOptions = buildRunOptions(config.args);

    try {
      // Initial run
      const runner = new SqlRunner(runnerConfig);
      const summary = await runner.run(runOptions);

      // Start watching
      this.output.log('');
      this.output.log(`${c.primary(symbols.running)} ${c.primary('Watching for changes...')} ${c.muted('(Ctrl+C to stop)')}`);

      const cleanup = startWatcher({
        directory: config.sqlDirectory,
        pattern: /\.sql$/,
        countdownSeconds: 30,
        onExecute: async () => {
          const watchRunner = new SqlRunner(runnerConfig);
          await watchRunner.run(buildRunOptions(config.args, true));
        },
        logger: {
          info: (msg) => this.output.log(`${c.info(symbols.info)} ${msg}`),
          warning: (msg) => this.output.warn(`${c.warning(symbols.warning)} ${msg}`),
        },
      });

      // Setup cleanup handler
      this.setupWatchCleanup(cleanup, onCleanup);

      return {
        success: true,
        summary,
        exitCode: 0,
      };
    } catch (error) {
      return this.handleError(error, config.databaseUrl);
    }
  }

  /**
   * Setup watch mode cleanup handlers
   */
  private setupWatchCleanup(cleanup: () => void, onCleanup?: () => void): void {
    process.on('SIGINT', () => {
      this.output.log('');
      this.output.log(`${c.muted(symbols.info)} Stopped watching.`);
      cleanup();
      onCleanup?.();
      process.exit(0);
    });

    // Keep process alive
    process.stdin.resume();
  }

  /**
   * Handle execution errors
   */
  private handleError(error: unknown, databaseUrl: string): ExecutionResult {
    const errorHelp = getConnectionErrorHelp(error, databaseUrl);

    if (errorHelp.isKnownError) {
      this.output.error(formatConnectionErrorHelp(errorHelp));
    } else {
      this.output.error(`${c.error(symbols.error)} Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      exitCode: 1,
    };
  }
}
