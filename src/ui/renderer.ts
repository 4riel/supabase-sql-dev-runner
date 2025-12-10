/**
 * UI Renderer - Facade for all UI components
 *
 * Provides a unified interface for console output, coordinating
 * all UI components. Follows the Facade pattern.
 */

import { symbols, c } from './theme.js';
import { renderBanner, renderMinimalBanner } from './components/banner.js';
import { renderBox, renderDivider } from './components/box.js';
import { renderList, renderKeyValue } from './components/table.js';
import { createSpinner } from './components/spinner.js';

export interface UIRendererOptions {
  /** Tool name */
  name?: string;
  /** Tool version */
  version?: string;
  /** Output stream */
  stream?: NodeJS.WriteStream;
  /** Disable output */
  silent?: boolean;
}

export interface FileResult {
  fileName: string;
  success: boolean;
  durationMs?: number;
  error?: string;
}

export interface ExecutionSummaryData {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalDurationMs: number;
  committed: boolean;
}

/**
 * Main UI renderer class
 *
 * Coordinates all UI components and provides a clean API
 * for rendering console output.
 */
export class UIRenderer {
  private name: string;
  private version: string;
  private stream: NodeJS.WriteStream;
  private silent: boolean;

  constructor(options: UIRendererOptions = {}) {
    this.name = options.name ?? 'sql-runner';
    this.version = options.version ?? '1.0.0';
    this.stream = options.stream ?? process.stdout;
    this.silent = options.silent ?? false;
  }

  /**
   * Write to output stream
   */
  private write(text: string): void {
    if (!this.silent) {
      this.stream.write(text);
    }
  }

  /**
   * Write line to output stream
   */
  private writeln(text = ''): void {
    this.write(text + '\n');
  }

  /**
   * Render startup banner
   */
  banner(): void {
    this.writeln();
    this.writeln(
      renderBanner({
        name: this.name,
        version: this.version,
        subtitle: 'Supabase SQL Dev Runner',
      })
    );
  }

  /**
   * Render minimal banner (single line)
   */
  minimalBanner(): void {
    this.writeln();
    this.writeln(renderMinimalBanner(this.name, this.version));
  }

  /**
   * Render development warning
   */
  devWarning(): void {
    this.writeln();
    this.writeln(`${c.warning(symbols.warning)} ${c.warning('Development tool')} ${c.muted('- not for production use')}`);
  }

  /**
   * Render connection info
   */
  connectionInfo(data: {
    host: string;
    directory: string;
    fileCount: number;
    logDirectory?: string | null;
  }): void {
    this.writeln();

    const pairs = [
      { key: 'Database', value: data.host },
      { key: 'Directory', value: data.directory },
      { key: 'Files', value: `${data.fileCount} found` },
    ];

    if (data.logDirectory) {
      pairs.push({ key: 'Logs', value: data.logDirectory });
    }

    this.writeln(renderKeyValue(pairs));
  }

  /**
   * Render file list
   */
  fileList(files: string[], title = 'Files to execute'): void {
    this.writeln();
    this.writeln(c.muted(`${symbols.arrowRight} ${title}:`));
    this.writeln();
    this.writeln(renderList(files));
  }

  /**
   * Render ignored files
   */
  ignoredFiles(files: string[]): void {
    if (files.length === 0) return;
    this.writeln();
    this.writeln(c.muted(`${symbols.info} Ignoring ${files.length} file${files.length > 1 ? 's' : ''}:`));
    for (const file of files) {
      this.writeln(c.muted(`  ${symbols.dot} ${file}`));
    }
  }

  /**
   * Render dry run notice
   */
  dryRun(): void {
    this.writeln();
    this.writeln(
      renderBox(
        [
          c.title('DRY RUN'),
          c.muted('No changes will be made to the database'),
        ],
        { style: 'rounded', width: 46 }
      )
    );
  }

  /**
   * Render confirmation prompt
   */
  confirmationWarning(): void {
    this.writeln();
    this.writeln(c.warning(`${symbols.warning}  This will execute SQL scripts on your database.`));
    this.writeln(c.muted('   Changes may modify or delete existing data.'));
    this.writeln(c.muted('   Automatic rollback is enabled for failures.'));
    this.writeln();
  }

  /**
   * Render file execution start
   */
  fileStart(fileName: string, index: number, total: number): void {
    const progress = c.muted(`[${index + 1}/${total}]`);
    this.writeln(`${progress} ${c.primary(symbols.running)} ${fileName}`);
  }

  /**
   * Render file execution result
   */
  fileResult(result: FileResult): void {
    // Move cursor up to overwrite the "running" line
    if (process.stdout.isTTY) {
      process.stdout.moveCursor?.(0, -1);
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
    }

    const duration = result.durationMs !== undefined ? `${result.durationMs}ms` : '';

    if (result.success) {
      this.writeln(`       ${c.success(symbols.success)} ${result.fileName} ${c.muted(duration)}`);
    } else {
      this.writeln(`       ${c.error(symbols.error)} ${result.fileName} ${c.error('failed')}`);
    }
  }

  /**
   * Render file execution result without overwriting
   */
  fileResultSimple(result: FileResult, index: number, total: number): void {
    const progress = c.muted(`[${index + 1}/${total}]`);
    const duration = result.durationMs !== undefined ? `${result.durationMs}ms` : '';

    if (result.success) {
      this.writeln(`${progress} ${c.success(symbols.success)} ${result.fileName} ${c.muted(duration)}`);
    } else {
      this.writeln(`${progress} ${c.error(symbols.error)} ${result.fileName} ${c.error('failed')}`);
    }
  }

  /**
   * Render error details
   */
  error(error: {
    message: string;
    code?: string;
    detail?: string;
    hint?: string;
    fileName?: string;
  }): void {
    this.writeln();
    this.writeln(`${c.error(symbols.error)} ${c.error('Error:')} ${error.message}`);

    if (error.code) {
      this.writeln(`  ${c.label('Code:')} ${error.code}`);
    }
    if (error.detail) {
      this.writeln(`  ${c.label('Detail:')} ${error.detail}`);
    }
    if (error.hint) {
      this.writeln(`  ${c.label('Hint:')} ${c.info(error.hint)}`);
    }
  }

  /**
   * Render execution summary
   */
  summary(data: ExecutionSummaryData): void {
    this.writeln();
    this.writeln(renderDivider(45));
    this.writeln();

    // Stats line
    const stats: string[] = [];
    stats.push(c.success(`${symbols.success} ${data.successfulFiles}/${data.totalFiles} files`));
    stats.push(c.muted(`${data.totalDurationMs}ms`));

    if (data.committed) {
      stats.push(c.success('committed'));
    } else {
      stats.push(c.warning('not committed'));
    }

    this.writeln(stats.join(c.muted(' • ')));

    // Status message
    if (data.failedFiles === 0 && data.committed) {
      this.writeln();
      this.writeln(c.success('All SQL scripts executed successfully!'));
    } else if (data.failedFiles > 0) {
      this.writeln();
      this.writeln(c.error('Transaction rolled back. No changes were made.'));
    } else if (!data.committed) {
      this.writeln();
      this.writeln(c.warning('Changes were NOT committed to database.'));
    }
  }

  /**
   * Render info message
   */
  info(message: string): void {
    this.writeln(`${c.info(symbols.info)} ${message}`);
  }

  /**
   * Render success message
   */
  success(message: string): void {
    this.writeln(`${c.success(symbols.success)} ${message}`);
  }

  /**
   * Render warning message
   */
  warning(message: string): void {
    this.writeln(`${c.warning(symbols.warning)} ${message}`);
  }

  /**
   * Render error message
   */
  errorMessage(message: string): void {
    this.writeln(`${c.error(symbols.error)} ${message}`);
  }

  /**
   * Render SQL notice (from database)
   */
  sqlNotice(message: string): void {
    this.writeln(`  ${c.muted('[SQL]')} ${c.muted(message)}`);
  }

  /**
   * Render cancelled operation
   */
  cancelled(): void {
    this.writeln();
    this.writeln(`${c.warning(symbols.warning)} Operation cancelled`);
  }

  /**
   * Render watch mode messages
   */
  watchMode = {
    started: (): void => {
      this.writeln();
      this.writeln(`${c.primary(symbols.running)} ${c.primary('Watching for changes...')} ${c.muted('(Ctrl+C to stop)')}`);
    },

    fileChanged: (fileName: string): void => {
      this.writeln(`${c.info(symbols.info)} Changed: ${fileName}`);
    },

    countdown: (seconds: number): void => {
      this.write(`\r${c.muted(`${symbols.pending} Running in ${seconds}s... (save again to reset)`)}  `);
    },

    executing: (): void => {
      // Clear countdown line
      if (process.stdout.isTTY) {
        process.stdout.clearLine?.(0);
        process.stdout.cursorTo?.(0);
      }
      this.writeln(`${c.primary(symbols.arrowRight)} Executing SQL files...`);
      this.writeln();
    },

    stopped: (): void => {
      this.writeln();
      this.writeln(`${c.muted(symbols.info)} Stopped watching.`);
    },

    waiting: (): void => {
      this.writeln();
      this.writeln(`${c.primary(symbols.running)} ${c.primary('Watching for changes...')} ${c.muted('(Ctrl+C to stop)')}`);
    },
  };

  /**
   * Render empty line
   */
  newline(): void {
    this.writeln();
  }

  /**
   * Render divider
   */
  divider(width = 45): void {
    this.writeln(renderDivider(width));
  }

  /**
   * Create a spinner instance
   */
  createSpinner(text?: string) {
    return createSpinner({ text, stream: this.stream });
  }

  /**
   * Clear the current line (for progress updates)
   */
  clearLine(): void {
    if (process.stdout.isTTY) {
      process.stdout.clearLine?.(0);
      process.stdout.cursorTo?.(0);
    }
  }
}

/**
 * Create a UI renderer instance
 */
export function createUIRenderer(options?: UIRendererOptions): UIRenderer {
  return new UIRenderer(options);
}
