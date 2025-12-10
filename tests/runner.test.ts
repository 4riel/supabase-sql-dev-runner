import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SqlRunner, runSqlScripts } from '../src/core/runner.js';
import { SilentLogger } from '../src/core/logger.js';
import type { Logger } from '../src/types.js';
import { clearMockInstances } from './setup.js';

describe('SqlRunner', () => {
  let testDir: string;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockInstances();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
    mockLogger = new SilentLogger();

    // Create test SQL files
    fs.writeFileSync(path.join(testDir, '01_first.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(testDir, '02_second.sql'), 'SELECT 2;');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create instance with valid config', () => {
      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
      });

      expect(runner).toBeInstanceOf(SqlRunner);
    });

    it('should throw error if databaseUrl is missing', () => {
      expect(() => {
        new SqlRunner({
          databaseUrl: '',
          sqlDirectory: testDir,
        });
      }).toThrow('DATABASE_URL is required');
    });

    it('should throw error if databaseUrl is undefined', () => {
      expect(() => {
        new SqlRunner({
          databaseUrl: undefined as unknown as string,
          sqlDirectory: testDir,
        });
      }).toThrow('DATABASE_URL is required');
    });

    it('should use default values for optional config', () => {
      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
      });

      expect(runner).toBeDefined();
    });

    it('should accept custom logger', () => {
      const customLogger: Logger = {
        info: vi.fn(),
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      };

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: customLogger,
      });

      expect(runner).toBeDefined();
    });
  });

  describe('run', () => {
    it('should return summary with no files when directory is empty', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-'));

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: emptyDir,
        logger: mockLogger,
        requireConfirmation: false,
      });

      const summary = await runner.run({ skipConfirmation: true });

      expect(summary.totalFiles).toBe(0);
      expect(summary.allSuccessful).toBe(true);
      expect(summary.committed).toBe(false);

      fs.rmSync(emptyDir, { recursive: true, force: true });
    });

    it('should execute files in order', async () => {
      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
      });

      const summary = await runner.run({ skipConfirmation: true });

      expect(summary.totalFiles).toBe(2);
      expect(summary.results[0].fileName).toBe('01_first.sql');
      expect(summary.results[1].fileName).toBe('02_second.sql');
    });

    it('should respect onlyFiles option', async () => {
      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
      });

      const summary = await runner.run({
        skipConfirmation: true,
        onlyFiles: ['01_first.sql'],
      });

      expect(summary.totalFiles).toBe(1);
      expect(summary.results[0].fileName).toBe('01_first.sql');
    });

    it('should respect skipFiles option', async () => {
      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
      });

      const summary = await runner.run({
        skipConfirmation: true,
        skipFiles: ['01_first.sql'],
      });

      expect(summary.totalFiles).toBe(1);
      expect(summary.results[0].fileName).toBe('02_second.sql');
    });

    it('should handle dryRun option', async () => {
      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
      });

      const summary = await runner.run({
        skipConfirmation: true,
        dryRun: true,
      });

      expect(summary.totalFiles).toBe(0);
      expect(summary.committed).toBe(false);
    });

    it('should call onBeforeFile callback', async () => {
      const onBeforeFile = vi.fn();

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
        onBeforeFile,
      });

      await runner.run({ skipConfirmation: true });

      expect(onBeforeFile).toHaveBeenCalledTimes(2);
      expect(onBeforeFile).toHaveBeenCalledWith('01_first.sql', 0, 2);
      expect(onBeforeFile).toHaveBeenCalledWith('02_second.sql', 1, 2);
    });

    it('should call onAfterFile callback', async () => {
      const onAfterFile = vi.fn();

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
        onAfterFile,
      });

      await runner.run({ skipConfirmation: true });

      expect(onAfterFile).toHaveBeenCalledTimes(2);
      expect(onAfterFile.mock.calls[0][0].fileName).toBe('01_first.sql');
      expect(onAfterFile.mock.calls[1][0].fileName).toBe('02_second.sql');
    });

    it('should call onComplete callback on success', async () => {
      const onComplete = vi.fn();

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
        onComplete,
      });

      await runner.run({ skipConfirmation: true });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete.mock.calls[0][0].allSuccessful).toBe(true);
    });

    it('should track ignored files in summary', async () => {
      fs.writeFileSync(path.join(testDir, '_ignored_test.sql'), 'SELECT 1;');

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
      });

      const summary = await runner.run({ skipConfirmation: true });

      expect(summary.ignoredFiles).toContain('_ignored_test.sql');
    });

    it('should include duration in summary', async () => {
      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: mockLogger,
        requireConfirmation: false,
      });

      const summary = await runner.run({ skipConfirmation: true });

      expect(summary.totalDurationMs).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('runSqlScripts', () => {
  let testDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockInstances();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'convenience-test-'));
    fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should be a convenience function that creates runner and executes', async () => {
    const summary = await runSqlScripts(
      {
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      },
      { skipConfirmation: true }
    );

    expect(summary.totalFiles).toBe(1);
  });

  it('should pass options to runner', async () => {
    const summary = await runSqlScripts(
      {
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      },
      { skipConfirmation: true, dryRun: true }
    );

    expect(summary.totalFiles).toBe(0);
    expect(summary.committed).toBe(false);
  });
});

describe('SqlRunner - configuration', () => {
  let testDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockInstances();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
    fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should use custom filePattern', async () => {
    fs.writeFileSync(path.join(testDir, 'custom.psql'), 'SELECT 1;');

    const runner = new SqlRunner({
      databaseUrl: 'postgres://user:pass@localhost/db',
      sqlDirectory: testDir,
      logger: new SilentLogger(),
      requireConfirmation: false,
      filePattern: /\.psql$/,
    });

    const summary = await runner.run({ skipConfirmation: true });

    expect(summary.totalFiles).toBe(1);
    expect(summary.results[0].fileName).toBe('custom.psql');
  });

  it('should use custom ignorePattern', async () => {
    fs.writeFileSync(path.join(testDir, 'skip_this.sql'), 'SELECT 1;');

    const runner = new SqlRunner({
      databaseUrl: 'postgres://user:pass@localhost/db',
      sqlDirectory: testDir,
      logger: new SilentLogger(),
      requireConfirmation: false,
      ignorePattern: /^skip_/,
    });

    const summary = await runner.run({ skipConfirmation: true });

    expect(summary.ignoredFiles).toContain('skip_this.sql');
  });

  it('should use custom confirmationPhrase', () => {
    const runner = new SqlRunner({
      databaseUrl: 'postgres://user:pass@localhost/db',
      sqlDirectory: testDir,
      logger: new SilentLogger(),
      confirmationPhrase: 'CUSTOM_CONFIRM',
    });

    expect(runner).toBeDefined();
  });

  it('should handle ssl option as boolean', () => {
    const runner = new SqlRunner({
      databaseUrl: 'postgres://user:pass@localhost/db',
      sqlDirectory: testDir,
      logger: new SilentLogger(),
      ssl: false,
    });

    expect(runner).toBeDefined();
  });

  it('should handle ssl option as object', () => {
    const runner = new SqlRunner({
      databaseUrl: 'postgres://user:pass@localhost/db',
      sqlDirectory: testDir,
      logger: new SilentLogger(),
      ssl: { rejectUnauthorized: true },
    });

    expect(runner).toBeDefined();
  });

  it('should handle null logDirectory', () => {
    const runner = new SqlRunner({
      databaseUrl: 'postgres://user:pass@localhost/db',
      sqlDirectory: testDir,
      logger: new SilentLogger(),
      logDirectory: null,
    });

    expect(runner).toBeDefined();
  });
});
