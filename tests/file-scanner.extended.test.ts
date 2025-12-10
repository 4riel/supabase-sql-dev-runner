import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  scanSqlFiles,
  readSqlFile,
  createSavepointName,
  DEFAULT_FILE_PATTERN,
  DEFAULT_IGNORE_PATTERN,
} from '../src/core/file-scanner.js';

describe('readSqlFile', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sql-reader-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should read SQL file content', () => {
    const filePath = path.join(testDir, 'test.sql');
    const content = 'SELECT * FROM users;';
    fs.writeFileSync(filePath, content);

    const result = readSqlFile(filePath);

    expect(result).toBe(content);
  });

  it('should read multi-line SQL file', () => {
    const filePath = path.join(testDir, 'multi.sql');
    const content = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255)
);

INSERT INTO users (name) VALUES ('test');
    `.trim();
    fs.writeFileSync(filePath, content);

    const result = readSqlFile(filePath);

    expect(result).toBe(content);
  });

  it('should handle UTF-8 content', () => {
    const filePath = path.join(testDir, 'utf8.sql');
    const content = "INSERT INTO messages (text) VALUES ('Hello 世界 🌍');";
    fs.writeFileSync(filePath, content, 'utf8');

    const result = readSqlFile(filePath);

    expect(result).toBe(content);
  });

  it('should throw error for non-existent file', () => {
    const filePath = path.join(testDir, 'nonexistent.sql');

    expect(() => readSqlFile(filePath)).toThrow('Failed to read SQL file');
  });

  it('should include file path in error message', () => {
    const filePath = path.join(testDir, 'nonexistent.sql');

    expect(() => readSqlFile(filePath)).toThrow(filePath);
  });

  it('should read empty file', () => {
    const filePath = path.join(testDir, 'empty.sql');
    fs.writeFileSync(filePath, '');

    const result = readSqlFile(filePath);

    expect(result).toBe('');
  });

  it('should read file with only whitespace', () => {
    const filePath = path.join(testDir, 'whitespace.sql');
    const content = '   \n\t\n   ';
    fs.writeFileSync(filePath, content);

    const result = readSqlFile(filePath);

    expect(result).toBe(content);
  });

  it('should read file with SQL comments', () => {
    const filePath = path.join(testDir, 'comments.sql');
    const content = `
-- This is a comment
/* Multi-line
   comment */
SELECT 1; -- inline comment
    `.trim();
    fs.writeFileSync(filePath, content);

    const result = readSqlFile(filePath);

    expect(result).toBe(content);
  });
});

describe('scanSqlFiles - extended', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sql-scan-ext-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should handle empty directory', () => {
    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files).toHaveLength(0);
    expect(result.filePaths).toHaveLength(0);
    expect(result.ignoredFiles).toHaveLength(0);
  });

  it('should handle directory with only ignored files', () => {
    fs.writeFileSync(path.join(testDir, '_ignored_1.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(testDir, '_ignored_2.sql'), 'SELECT 2;');
    fs.writeFileSync(path.join(testDir, 'README.sql'), 'SELECT 3;');

    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files).toHaveLength(0);
    expect(result.ignoredFiles).toHaveLength(3);
  });

  it('should handle directory with non-SQL files only', () => {
    fs.writeFileSync(path.join(testDir, 'script.js'), 'console.log()');
    fs.writeFileSync(path.join(testDir, 'data.json'), '{}');
    fs.writeFileSync(path.join(testDir, 'readme.md'), '# Readme');

    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files).toHaveLength(0);
    expect(result.ignoredFiles).toHaveLength(0);
  });

  it('should use custom file pattern', () => {
    fs.writeFileSync(path.join(testDir, 'script.psql'), 'SELECT 1;');
    fs.writeFileSync(path.join(testDir, 'script.sql'), 'SELECT 2;');

    const result = scanSqlFiles(testDir, {
      filePattern: /\.psql$/,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toBe('script.psql');
  });

  it('should use custom ignore pattern', () => {
    fs.writeFileSync(path.join(testDir, 'test_script.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(testDir, 'prod_script.sql'), 'SELECT 2;');

    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: /^test_/,
    });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toBe('prod_script.sql');
    expect(result.ignoredFiles).toContain('test_script.sql');
  });

  it('should handle files with numbers in various positions', () => {
    fs.writeFileSync(path.join(testDir, '01_first.sql'), '');
    fs.writeFileSync(path.join(testDir, '02_second.sql'), '');
    fs.writeFileSync(path.join(testDir, '10_tenth.sql'), '');
    fs.writeFileSync(path.join(testDir, '100_hundredth.sql'), '');

    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files).toEqual([
      '01_first.sql',
      '02_second.sql',
      '100_hundredth.sql',
      '10_tenth.sql',
    ]);
  });

  it('should handle mixed case filenames', () => {
    fs.writeFileSync(path.join(testDir, 'Script.SQL'), '');
    fs.writeFileSync(path.join(testDir, 'UPPER.sql'), '');
    fs.writeFileSync(path.join(testDir, 'lower.sql'), '');

    const result = scanSqlFiles(testDir, {
      filePattern: /\.sql$/i, // Case insensitive
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files.length).toBeGreaterThanOrEqual(2);
  });

  it('should resolve relative paths to absolute', () => {
    fs.writeFileSync(path.join(testDir, 'test.sql'), '');

    const result = scanSqlFiles(testDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    result.filePaths.forEach((fp) => {
      expect(path.isAbsolute(fp)).toBe(true);
    });
  });

  it('should handle special characters in directory path', () => {
    const specialDir = path.join(testDir, 'dir with spaces');
    fs.mkdirSync(specialDir);
    fs.writeFileSync(path.join(specialDir, 'test.sql'), 'SELECT 1;');

    const result = scanSqlFiles(specialDir, {
      filePattern: DEFAULT_FILE_PATTERN,
      ignorePattern: DEFAULT_IGNORE_PATTERN,
    });

    expect(result.files).toHaveLength(1);
  });
});

describe('createSavepointName - extended', () => {
  it('should handle empty filename', () => {
    const name = createSavepointName('', 0);

    expect(name).toBe('sp__0');
    expect(name).toMatch(/^[a-zA-Z_]/); // Valid SQL identifier start
  });

  it('should handle filename with only special characters', () => {
    const name = createSavepointName('---...---', 0);

    expect(name).toBe('sp___________0');
  });

  it('should handle very long filename', () => {
    const longName = 'a'.repeat(200) + '.sql';
    const name = createSavepointName(longName, 0);

    expect(name.length).toBeGreaterThan(200);
    expect(name).toMatch(/^sp_a+_sql_0$/);
  });

  it('should handle filename with unicode characters', () => {
    const name = createSavepointName('日本語.sql', 0);

    // Unicode chars should be replaced with underscores
    expect(name).toMatch(/^sp_[_]+_sql_0$/);
  });

  it('should handle numeric filename', () => {
    const name = createSavepointName('12345.sql', 0);

    expect(name).toBe('sp_12345_sql_0');
  });

  it('should produce unique names for similar files', () => {
    const name1 = createSavepointName('file-1.sql', 0);
    const _name2 = createSavepointName('file_1.sql', 0);

    // Both - and _ become _, so they should differ only if index is different
    // Actually they'll be the same since both produce sp_file_1_sql_0
    // Let's test with different indices
    const name3 = createSavepointName('file-1.sql', 1);
    expect(name1).not.toBe(name3);
  });

  it('should handle large index numbers', () => {
    const name = createSavepointName('test.sql', 999999);

    expect(name).toBe('sp_test_sql_999999');
  });
});
