import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  scanSqlFiles,
  createSavepointName,
  DEFAULT_FILE_PATTERN,
  DEFAULT_IGNORE_PATTERN,
} from '../src/core/file-scanner.js';

describe('scanSqlFiles', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temp directory with test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sql-runner-test-'));

    // Create test SQL files
    fs.writeFileSync(path.join(testDir, '00_setup.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(testDir, '01_tables.sql'), 'SELECT 2;');
    fs.writeFileSync(path.join(testDir, '02_indexes.sql'), 'SELECT 3;');
    fs.writeFileSync(path.join(testDir, '_ignored_test.sql'), 'SELECT 4;');
    fs.writeFileSync(path.join(testDir, 'README.md'), '# Readme');
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should find SQL files in directory', () => {
    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files).toHaveLength(3);
    expect(result.files).toContain('00_setup.sql');
    expect(result.files).toContain('01_tables.sql');
    expect(result.files).toContain('02_indexes.sql');
  });

  it('should sort files alphabetically', () => {
    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files[0]).toBe('00_setup.sql');
    expect(result.files[1]).toBe('01_tables.sql');
    expect(result.files[2]).toBe('02_indexes.sql');
  });

  it('should ignore files matching ignore pattern', () => {
    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.ignoredFiles).toHaveLength(1);
    expect(result.ignoredFiles).toContain('_ignored_test.sql');
    expect(result.files).not.toContain('_ignored_test.sql');
  });

  it('should provide full paths', () => {
    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.filePaths).toHaveLength(3);
    result.filePaths.forEach((fp) => {
      expect(path.isAbsolute(fp)).toBe(true);
      expect(fs.existsSync(fp)).toBe(true);
    });
  });

  it('should throw if directory does not exist', () => {
    expect(() =>
      scanSqlFiles('/nonexistent/path', {
        filePattern: DEFAULT_FILE_PATTERN,
        ignorePattern: DEFAULT_IGNORE_PATTERN,
      })
    ).toThrow('SQL directory not found');
  });

  it('should throw if path is not a directory', () => {
    const filePath = path.join(testDir, '00_setup.sql');

    expect(() =>
      scanSqlFiles(filePath, {
        filePattern: DEFAULT_FILE_PATTERN,
        ignorePattern: DEFAULT_IGNORE_PATTERN,
      })
    ).toThrow('Path is not a directory');
  });
});

describe('createSavepointName', () => {
  it('should create valid savepoint name', () => {
    const name = createSavepointName('01_tables.sql', 0);

    expect(name).toBe('sp_01_tables_sql_0');
    expect(name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
  });

  it('should handle special characters', () => {
    const name = createSavepointName('my-file (test).sql', 5);

    expect(name).toBe('sp_my_file__test__sql_5');
  });

  it('should include index for uniqueness', () => {
    const name1 = createSavepointName('file.sql', 0);
    const name2 = createSavepointName('file.sql', 1);

    expect(name1).not.toBe(name2);
  });
});
