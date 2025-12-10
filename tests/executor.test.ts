import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SqlExecutor } from '../src/core/executor.js';
import { SilentLogger } from '../src/core/logger.js';
import type { ConnectionConfig, Logger } from '../src/types.js';
import { Client } from 'pg';
import { clearMockInstances, getLastMockClient } from './setup.js';

describe('SqlExecutor', () => {
  let executor: SqlExecutor;
  let mockLogger: Logger;
  let testDir: string;
  const mockConfig: ConnectionConfig = {
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
    ssl: false,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    clearMockInstances();
    mockLogger = new SilentLogger();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'executor-test-'));
    executor = new SqlExecutor(mockConfig, mockLogger);
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('connect', () => {
    it('should connect to database', async () => {
      await executor.connect();

      expect(Client).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        ssl: false,
      });
    });

    it('should set up notice handler', async () => {
      const onNotice = vi.fn();
      const executorWithNotice = new SqlExecutor(mockConfig, mockLogger, onNotice);

      await executorWithNotice.connect();

      const mockInstance = getLastMockClient();
      expect(mockInstance?.on).toHaveBeenCalledWith('notice', expect.any(Function));
    });
  });

  describe('disconnect', () => {
    it('should close database connection', async () => {
      await executor.connect();
      const mockInstance = getLastMockClient();
      await executor.disconnect();

      expect(mockInstance?.end).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', async () => {
      await expect(executor.disconnect()).resolves.not.toThrow();
    });
  });

  describe('beginTransaction', () => {
    it('should start a transaction', async () => {
      await executor.connect();
      const mockInstance = getLastMockClient();
      await executor.beginTransaction();

      expect(mockInstance?.query).toHaveBeenCalledWith('BEGIN');
    });

    it('should throw if not connected', async () => {
      await expect(executor.beginTransaction()).rejects.toThrow(
        'Database not connected'
      );
    });
  });

  describe('commit', () => {
    it('should commit the transaction', async () => {
      await executor.connect();
      const mockInstance = getLastMockClient();
      await executor.commit();

      expect(mockInstance?.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw if not connected', async () => {
      await expect(executor.commit()).rejects.toThrow('Database not connected');
    });
  });

  describe('rollback', () => {
    it('should rollback the transaction', async () => {
      await executor.connect();
      const mockInstance = getLastMockClient();
      await executor.rollback();

      expect(mockInstance?.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw if not connected', async () => {
      await expect(executor.rollback()).rejects.toThrow('Database not connected');
    });
  });

  describe('createSavepoint', () => {
    it('should create a savepoint', async () => {
      await executor.connect();
      const mockInstance = getLastMockClient();
      await executor.createSavepoint('test_savepoint');

      expect(mockInstance?.query).toHaveBeenCalledWith('SAVEPOINT "test_savepoint"');
    });

    it('should throw if not connected', async () => {
      await expect(executor.createSavepoint('sp')).rejects.toThrow(
        'Database not connected'
      );
    });
  });

  describe('rollbackToSavepoint', () => {
    it('should rollback to savepoint and return true', async () => {
      await executor.connect();
      const mockInstance = getLastMockClient();
      const result = await executor.rollbackToSavepoint('test_savepoint');

      expect(result).toBe(true);
      expect(mockInstance?.query).toHaveBeenCalledWith(
        'ROLLBACK TO SAVEPOINT "test_savepoint"'
      );
    });

    it('should return false on error', async () => {
      await executor.connect();
      const mockInstance = getLastMockClient();
      mockInstance!.query.mockRejectedValueOnce(new Error('Savepoint not found'));

      const result = await executor.rollbackToSavepoint('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('releaseSavepoint', () => {
    it('should release a savepoint', async () => {
      await executor.connect();
      const mockInstance = getLastMockClient();
      await executor.releaseSavepoint('test_savepoint');

      expect(mockInstance?.query).toHaveBeenCalledWith(
        'RELEASE SAVEPOINT "test_savepoint"'
      );
    });

    it('should throw if not connected', async () => {
      await expect(executor.releaseSavepoint('sp')).rejects.toThrow(
        'Database not connected'
      );
    });
  });

  describe('executeFile', () => {
    it('should execute SQL file successfully', async () => {
      const filePath = path.join(testDir, 'test.sql');
      fs.writeFileSync(filePath, 'SELECT 1;');

      await executor.connect();
      const result = await executor.executeFile(filePath, 0);

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('test.sql');
      expect(result.filePath).toBe(filePath);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should create and release savepoint on success', async () => {
      const filePath = path.join(testDir, 'test.sql');
      fs.writeFileSync(filePath, 'SELECT 1;');

      await executor.connect();
      const mockInstance = getLastMockClient();
      await executor.executeFile(filePath, 0);

      // Should have created savepoint
      expect(mockInstance?.query).toHaveBeenCalledWith(
        expect.stringContaining('SAVEPOINT')
      );

      // Should have released savepoint
      expect(mockInstance?.query).toHaveBeenCalledWith(
        expect.stringContaining('RELEASE SAVEPOINT')
      );
    });

    it('should rollback to savepoint on error', async () => {
      const filePath = path.join(testDir, 'test.sql');
      fs.writeFileSync(filePath, 'INVALID SQL;');

      await executor.connect();
      const mockInstance = getLastMockClient();

      // Make query fail for the SQL execution (but not for savepoint operations)
      mockInstance!.query.mockImplementation((sql: string) => {
        if (sql.includes('INVALID SQL')) {
          return Promise.reject(new Error('syntax error'));
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await executor.executeFile(filePath, 0);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('syntax error');
    });

    it('should include error details in result', async () => {
      const filePath = path.join(testDir, 'test.sql');
      fs.writeFileSync(filePath, 'SELECT * FROM nonexistent;');

      await executor.connect();
      const mockInstance = getLastMockClient();

      const pgError = new Error('relation "nonexistent" does not exist') as Error & {
        code?: string;
        detail?: string;
        hint?: string;
      };
      pgError.code = '42P01';
      pgError.hint = 'Check table name';

      mockInstance!.query.mockImplementation((sql: string) => {
        if (sql.includes('nonexistent')) {
          return Promise.reject(pgError);
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await executor.executeFile(filePath, 0);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('42P01');
      expect(result.error?.hint).toBe('Check table name');
      expect(result.error?.fileName).toBe('test.sql');
    });

    it('should throw if not connected', async () => {
      const filePath = path.join(testDir, 'test.sql');
      fs.writeFileSync(filePath, 'SELECT 1;');

      await expect(executor.executeFile(filePath, 0)).rejects.toThrow(
        'Database not connected'
      );
    });

    it('should generate unique savepoint name based on file and index', async () => {
      const filePath = path.join(testDir, 'test.sql');
      fs.writeFileSync(filePath, 'SELECT 1;');

      await executor.connect();
      const result = await executor.executeFile(filePath, 5);

      expect(result.savepointName).toContain('sp_');
      expect(result.savepointName).toContain('test');
      expect(result.savepointName).toContain('5');
    });
  });
});

describe('SqlExecutor - error formatting', () => {
  let executor: SqlExecutor;
  let testDir: string;
  const mockConfig: ConnectionConfig = {
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
    ssl: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockInstances();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'error-test-'));
    executor = new SqlExecutor(mockConfig, new SilentLogger());
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should format non-Error objects', async () => {
    const filePath = path.join(testDir, 'test.sql');
    fs.writeFileSync(filePath, 'SELECT 1;');

    await executor.connect();
    const mockInstance = getLastMockClient();

    mockInstance!.query.mockImplementation((sql: string) => {
      if (sql.includes('SELECT 1')) {
        return Promise.reject('String error'); // Non-Error object
      }
      return Promise.resolve({ rows: [] });
    });

    const result = await executor.executeFile(filePath, 0);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('String error');
  });
});
