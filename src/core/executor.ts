import { Client } from 'pg';
import type {
  ConnectionConfig,
  FileExecutionResult,
  Logger,
  SqlRunnerError,
} from '../types.js';
import { readSqlFile, createSavepointName } from './file-scanner.js';
import * as path from 'node:path';

/**
 * Safely quotes a PostgreSQL identifier to prevent SQL injection
 * Uses double quotes and escapes any internal double quotes
 *
 * @param identifier - The identifier to quote
 * @returns Safely quoted identifier
 */
function quoteSqlIdentifier(identifier: string): string {
  // Escape any double quotes by doubling them, then wrap in double quotes
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * SQL Executor - handles database operations
 */
export class SqlExecutor {
  private client: Client | null = null;
  private logger: Logger;
  private onNotice?: (message: string) => void;
  private noticeHandler: ((msg: { message?: string }) => void) | null = null;

  constructor(
    private config: ConnectionConfig,
    logger: Logger,
    onNotice?: (message: string) => void
  ) {
    this.logger = logger;
    this.onNotice = onNotice;
  }

  /**
   * Connects to the database
   */
  async connect(): Promise<void> {
    this.client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl,
    });

    // Set up notice handler for RAISE NOTICE messages
    this.noticeHandler = (msg) => {
      if (this.onNotice && msg.message) {
        this.onNotice(msg.message);
      }
    };
    this.client.on('notice', this.noticeHandler);

    // Handle unexpected errors from the server (e.g., connection termination)
    // This prevents unhandled 'error' events from crashing the process
    this.client.on('error', (err) => {
      // Log but don't crash - these are often expected during error recovery
      this.logger.debug(`Database connection error: ${err.message}`);
    });

    await this.client.connect();
    this.logger.success(`Connected to database at ${this.config.host}:${this.config.port}`);
  }

  /**
   * Disconnects from the database
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Remove notice listener to prevent memory leaks
      if (this.noticeHandler) {
        this.client.removeListener('notice', this.noticeHandler);
        this.noticeHandler = null;
      }
      await this.client.end();
      this.client = null;
      this.logger.info('Database connection closed');
    }
  }

  /**
   * Starts a transaction
   */
  async beginTransaction(): Promise<void> {
    this.ensureConnected();
    await this.client!.query('BEGIN');
    this.logger.info('Transaction started');
  }

  /**
   * Commits the transaction
   */
  async commit(): Promise<void> {
    this.ensureConnected();
    await this.client!.query('COMMIT');
    this.logger.success('Transaction committed - all changes saved');
  }

  /**
   * Rolls back the entire transaction
   */
  async rollback(): Promise<void> {
    this.ensureConnected();
    try {
      await this.client!.query('ROLLBACK');
      this.logger.warning('Transaction rolled back');
    } catch (error) {
      this.logger.error('Failed to rollback transaction');
      throw error;
    }
  }

  /**
   * Creates a savepoint
   */
  async createSavepoint(name: string): Promise<void> {
    this.ensureConnected();
    const quotedName = quoteSqlIdentifier(name);
    await this.client!.query(`SAVEPOINT ${quotedName}`);
    this.logger.debug(`Savepoint created: ${name}`);
  }

  /**
   * Rolls back to a savepoint
   */
  async rollbackToSavepoint(name: string): Promise<boolean> {
    this.ensureConnected();
    try {
      const quotedName = quoteSqlIdentifier(name);
      await this.client!.query(`ROLLBACK TO SAVEPOINT ${quotedName}`);
      this.logger.warning(`Rolled back to savepoint: ${name}`);
      return true;
    } catch (_error) {
      this.logger.error(`Failed to rollback to savepoint: ${name}`);
      return false;
    }
  }

  /**
   * Releases a savepoint
   */
  async releaseSavepoint(name: string): Promise<void> {
    this.ensureConnected();
    const quotedName = quoteSqlIdentifier(name);
    await this.client!.query(`RELEASE SAVEPOINT ${quotedName}`);
    this.logger.debug(`Savepoint released: ${name}`);
  }

  /**
   * Executes a single SQL file with savepoint protection
   */
  async executeFile(
    filePath: string,
    index: number
  ): Promise<FileExecutionResult> {
    this.ensureConnected();

    const fileName = path.basename(filePath);
    const savepointName = createSavepointName(fileName, index);
    const startTime = Date.now();

    this.logger.info(`Executing: ${fileName}`);

    // Read SQL content first so we can use it for error reporting
    const sql = readSqlFile(filePath);

    try {
      // Create savepoint before execution
      await this.createSavepoint(savepointName);

      // Execute SQL
      await this.client!.query(sql);

      // Release savepoint on success
      await this.releaseSavepoint(savepointName);

      const durationMs = Date.now() - startTime;
      this.logger.success(`Completed: ${fileName} (${durationMs}ms)`);

      return {
        fileName,
        filePath,
        success: true,
        durationMs,
        savepointName,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const sqlError = this.formatError(error, fileName);

      this.logger.error(`Failed: ${fileName} (${durationMs}ms)`);
      this.logger.error(`Error: ${sqlError.message}`);

      if (sqlError.code) {
        this.logger.error(`PostgreSQL Error Code: ${sqlError.code}`);
      }
      if (sqlError.position) {
        // Convert character position to line number for better debugging
        const lineInfo = this.getLineFromPosition(sql, parseInt(sqlError.position, 10));
        this.logger.error(`Location: line ${lineInfo.line}, column ${lineInfo.column}`);
        if (lineInfo.lineContent) {
          this.logger.error(`Line content: ${lineInfo.lineContent}`);
          // Show pointer to the error position
          const pointer = ' '.repeat(lineInfo.column - 1) + '^';
          this.logger.error(`             ${pointer}`);
        }
      }
      if (sqlError.where) {
        this.logger.error(`Context: ${sqlError.where}`);
      }
      if (sqlError.detail) {
        this.logger.error(`Detail: ${sqlError.detail}`);
      }
      if (sqlError.hint) {
        this.logger.info(`Hint: ${sqlError.hint}`);
      }

      // Attempt rollback to savepoint
      this.logger.warning(`Attempting rollback for: ${fileName}`);
      const rollbackSuccess = await this.rollbackToSavepoint(savepointName);

      if (rollbackSuccess) {
        this.logger.success(`Successfully rolled back: ${fileName}`);
      } else {
        this.logger.error(
          `Failed to rollback: ${fileName} - database may be in inconsistent state`
        );
      }

      return {
        fileName,
        filePath,
        success: false,
        durationMs,
        savepointName,
        error: sqlError,
        rollbackSuccess,
      };
    }
  }

  /**
   * Formats an error into SqlRunnerError
   */
  private formatError(error: unknown, fileName?: string): SqlRunnerError {
    if (error instanceof Error) {
      const pgError = error as Error & {
        code?: string;
        detail?: string;
        hint?: string;
        position?: string;
        where?: string;
      };

      return {
        message: pgError.message,
        code: pgError.code,
        detail: pgError.detail,
        hint: pgError.hint,
        position: pgError.position,
        where: pgError.where,
        stack: pgError.stack,
        fileName,
      };
    }

    return {
      message: String(error),
      fileName,
    };
  }

  /**
   * Converts a character position to line number and column
   * PostgreSQL error positions are 1-based character offsets
   */
  private getLineFromPosition(
    sql: string,
    position: number
  ): { line: number; column: number; lineContent: string } {
    const lines = sql.split('\n');
    let currentPos = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline character
      if (currentPos + lineLength >= position) {
        return {
          line: i + 1, // 1-based line number
          column: position - currentPos,
          lineContent: lines[i].trim(),
        };
      }
      currentPos += lineLength;
    }

    // Fallback if position is beyond file end
    return {
      line: lines.length,
      column: 1,
      lineContent: lines[lines.length - 1]?.trim() || '',
    };
  }

  /**
   * Ensures database is connected
   */
  private ensureConnected(): void {
    if (!this.client) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}
