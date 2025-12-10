import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SqlRunner } from '../src/core/runner.js';
import { SilentLogger } from '../src/core/logger.js';
import { clearMockInstances } from './setup.js';

describe('Integration Tests', () => {
  let testDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMockInstances();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('full execution flow', () => {
    it('should execute multiple files in correct order', async () => {
      // Create SQL files with different prefixes
      fs.writeFileSync(path.join(testDir, '01_setup.sql'), 'CREATE TABLE test1;');
      fs.writeFileSync(path.join(testDir, '02_data.sql'), 'INSERT INTO test1 VALUES (1);');
      fs.writeFileSync(path.join(testDir, '03_indexes.sql'), 'CREATE INDEX ON test1;');

      const executionOrder: string[] = [];

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
        onBeforeFile: (fileName) => {
          executionOrder.push(fileName);
        },
      });

      const summary = await runner.run({ skipConfirmation: true });

      expect(summary.totalFiles).toBe(3);
      expect(executionOrder).toEqual([
        '01_setup.sql',
        '02_data.sql',
        '03_indexes.sql',
      ]);
    });

    it('should handle mixed file types with ignore pattern', async () => {
      fs.writeFileSync(path.join(testDir, '01_main.sql'), 'SELECT 1;');
      fs.writeFileSync(path.join(testDir, '_ignored_test.sql'), 'SELECT 2;');
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Documentation');
      fs.writeFileSync(path.join(testDir, 'notes.txt'), 'Some notes');

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      });

      const summary = await runner.run({ skipConfirmation: true });

      expect(summary.totalFiles).toBe(1);
      expect(summary.results[0].fileName).toBe('01_main.sql');
      expect(summary.ignoredFiles).toContain('_ignored_test.sql');
    });

    it('should calculate total duration', async () => {
      fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      });

      const summary = await runner.run({ skipConfirmation: true });

      expect(summary.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(typeof summary.totalDurationMs).toBe('number');
    });
  });

  describe('callback integration', () => {
    it('should call all callbacks in correct order', async () => {
      fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');

      const callOrder: string[] = [];

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
        onBeforeFile: () => callOrder.push('before'),
        onAfterFile: () => callOrder.push('after'),
        onComplete: () => callOrder.push('complete'),
      });

      await runner.run({ skipConfirmation: true });

      expect(callOrder).toEqual(['before', 'after', 'complete']);
    });

    it('should call callbacks for each file', async () => {
      fs.writeFileSync(path.join(testDir, '01_first.sql'), 'SELECT 1;');
      fs.writeFileSync(path.join(testDir, '02_second.sql'), 'SELECT 2;');
      fs.writeFileSync(path.join(testDir, '03_third.sql'), 'SELECT 3;');

      let beforeCount = 0;
      let afterCount = 0;

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
        onBeforeFile: () => beforeCount++,
        onAfterFile: () => afterCount++,
      });

      await runner.run({ skipConfirmation: true });

      expect(beforeCount).toBe(3);
      expect(afterCount).toBe(3);
    });

    it('should provide correct file info to callbacks', async () => {
      fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');

      let capturedBeforeInfo: { fileName: string; index: number; total: number } | null = null;
      let capturedAfterInfo: { fileName: string; success: boolean } | null = null;

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
        onBeforeFile: (fileName, index, total) => {
          capturedBeforeInfo = { fileName, index, total };
        },
        onAfterFile: (result) => {
          capturedAfterInfo = { fileName: result.fileName, success: result.success };
        },
      });

      await runner.run({ skipConfirmation: true });

      expect(capturedBeforeInfo).toEqual({
        fileName: '01_test.sql',
        index: 0,
        total: 1,
      });
      expect(capturedAfterInfo?.fileName).toBe('01_test.sql');
      expect(capturedAfterInfo?.success).toBe(true);
    });
  });

  describe('file filtering', () => {
    it('should combine onlyFiles and skipFiles correctly', async () => {
      fs.writeFileSync(path.join(testDir, '01_a.sql'), 'SELECT 1;');
      fs.writeFileSync(path.join(testDir, '02_b.sql'), 'SELECT 2;');
      fs.writeFileSync(path.join(testDir, '03_c.sql'), 'SELECT 3;');
      fs.writeFileSync(path.join(testDir, '04_d.sql'), 'SELECT 4;');

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      });

      // Only run 02 and 03, but skip 03
      const summary = await runner.run({
        skipConfirmation: true,
        onlyFiles: ['02_b.sql', '03_c.sql'],
        skipFiles: ['03_c.sql'],
      });

      expect(summary.totalFiles).toBe(1);
      expect(summary.results[0].fileName).toBe('02_b.sql');
    });

    it('should handle non-matching onlyFiles', async () => {
      fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      });

      const summary = await runner.run({
        skipConfirmation: true,
        onlyFiles: ['nonexistent.sql'],
      });

      expect(summary.totalFiles).toBe(0);
    });

    it('should handle all files skipped', async () => {
      fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      });

      const summary = await runner.run({
        skipConfirmation: true,
        skipFiles: ['01_test.sql'],
      });

      expect(summary.totalFiles).toBe(0);
    });
  });

  describe('error scenarios', () => {
    it('should handle missing SQL directory', async () => {
      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: '/nonexistent/path',
        logger: new SilentLogger(),
        requireConfirmation: false,
      });

      await expect(runner.run({ skipConfirmation: true })).rejects.toThrow(
        'SQL directory not found'
      );
    });

    it('should call onError callback on unexpected error', async () => {
      const onError = vi.fn();

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: '/nonexistent/path',
        logger: new SilentLogger(),
        requireConfirmation: false,
        onError,
      });

      await expect(runner.run({ skipConfirmation: true })).rejects.toThrow();

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('summary structure', () => {
    it('should return complete summary structure', async () => {
      fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');
      fs.writeFileSync(path.join(testDir, '_ignored.sql'), 'SELECT 2;');

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      });

      const summary = await runner.run({ skipConfirmation: true });

      // Verify all expected properties exist
      expect(summary).toHaveProperty('totalFiles');
      expect(summary).toHaveProperty('successfulFiles');
      expect(summary).toHaveProperty('failedFiles');
      expect(summary).toHaveProperty('totalDurationMs');
      expect(summary).toHaveProperty('results');
      expect(summary).toHaveProperty('allSuccessful');
      expect(summary).toHaveProperty('committed');
      expect(summary).toHaveProperty('ignoredFiles');

      // Verify types
      expect(typeof summary.totalFiles).toBe('number');
      expect(typeof summary.successfulFiles).toBe('number');
      expect(typeof summary.failedFiles).toBe('number');
      expect(typeof summary.totalDurationMs).toBe('number');
      expect(Array.isArray(summary.results)).toBe(true);
      expect(typeof summary.allSuccessful).toBe('boolean');
      expect(typeof summary.committed).toBe('boolean');
      expect(Array.isArray(summary.ignoredFiles)).toBe(true);
    });

    it('should return complete result structure for each file', async () => {
      fs.writeFileSync(path.join(testDir, '01_test.sql'), 'SELECT 1;');

      const runner = new SqlRunner({
        databaseUrl: 'postgres://user:pass@localhost/db',
        sqlDirectory: testDir,
        logger: new SilentLogger(),
        requireConfirmation: false,
      });

      const summary = await runner.run({ skipConfirmation: true });
      const result = summary.results[0];

      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('durationMs');
      expect(result).toHaveProperty('savepointName');

      expect(typeof result.fileName).toBe('string');
      expect(typeof result.filePath).toBe('string');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.durationMs).toBe('number');
      expect(typeof result.savepointName).toBe('string');
    });
  });
});
