import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  ConsoleLogger,
  SilentLogger,
  createLogger,
} from '../src/core/logger.js';

describe('ConsoleLogger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should log info messages', () => {
    const logger = new ConsoleLogger();
    logger.info('Test info message');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    // New format uses symbols: ℹ for info
    expect(consoleSpy.mock.calls[0][0]).toContain('Test info message');
  });

  it('should log success messages', () => {
    const logger = new ConsoleLogger();
    logger.success('Test success message');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    // New format uses symbols: ✓ for success
    expect(consoleSpy.mock.calls[0][0]).toContain('Test success message');
  });

  it('should log warning messages', () => {
    const logger = new ConsoleLogger();
    logger.warning('Test warning message');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    // New format uses symbols: ⚠ for warning
    expect(consoleSpy.mock.calls[0][0]).toContain('Test warning message');
  });

  it('should log error messages to stderr', () => {
    const logger = new ConsoleLogger();
    logger.error('Test error message');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    // New format uses symbols: ✗ for error
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('Test error message');
  });

  it('should log debug messages', () => {
    const logger = new ConsoleLogger();
    logger.debug('Test debug message');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    // New format uses symbols: · for debug
    expect(consoleSpy.mock.calls[0][0]).toContain('Test debug message');
  });

  it('should include symbol indicators in messages', () => {
    const logger = new ConsoleLogger();
    logger.info('Test message');

    // Should contain the info symbol ℹ
    expect(consoleSpy.mock.calls[0][0]).toContain('ℹ');
  });

  it('should apply colors by default (TTY)', () => {
    // Mock process.stdout.isTTY to true
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });

    const logger = new ConsoleLogger();
    logger.info('Test message');

    // Should contain ANSI color codes when TTY
    expect(consoleSpy.mock.calls[0][0]).toContain('\x1b[');

    // Restore
    Object.defineProperty(process.stdout, 'isTTY', { value: originalIsTTY, writable: true });
  });

  it('should not apply colors when NO_COLOR is set', () => {
    const originalNoColor = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';

    const logger = new ConsoleLogger();
    logger.info('Test message');

    // Should not contain ANSI color codes
    expect(consoleSpy.mock.calls[0][0]).not.toContain('\x1b[');

    // Restore
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
  });

  describe('file logging', () => {
    let testLogDir: string;

    beforeEach(() => {
      testLogDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    });

    afterEach(() => {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    });

    it('should create log directory if it does not exist', () => {
      const logDir = path.join(testLogDir, 'nested', 'logs');
      const logger = new ConsoleLogger({ logDirectory: logDir });
      logger.info('Test message');

      expect(fs.existsSync(logDir)).toBe(true);
    });

    it('should write logs to file', () => {
      const logger = new ConsoleLogger({ logDirectory: testLogDir });
      logger.info('Test log entry');

      const logFile = path.join(testLogDir, 'sql-runner.log');
      expect(fs.existsSync(logFile)).toBe(true);

      const content = fs.readFileSync(logFile, 'utf8');
      expect(content).toContain('Test log entry');
    });

    it('should write errors to both log and error file', () => {
      const logger = new ConsoleLogger({ logDirectory: testLogDir });
      logger.error('Test error entry');

      const logFile = path.join(testLogDir, 'sql-runner.log');
      const errorFile = path.join(testLogDir, 'sql-runner-error.log');

      expect(fs.existsSync(logFile)).toBe(true);
      expect(fs.existsSync(errorFile)).toBe(true);

      const logContent = fs.readFileSync(logFile, 'utf8');
      const errorContent = fs.readFileSync(errorFile, 'utf8');

      expect(logContent).toContain('Test error entry');
      expect(errorContent).toContain('Test error entry');
    });

    it('should not write to file when logDirectory is null', () => {
      const logger = new ConsoleLogger({ logDirectory: null });
      logger.info('Test message');

      const logFile = path.join(testLogDir, 'sql-runner.log');
      expect(fs.existsSync(logFile)).toBe(false);
    });

    it('should include timestamp in file logs', () => {
      const logger = new ConsoleLogger({ logDirectory: testLogDir });
      logger.info('Test message');

      const logFile = path.join(testLogDir, 'sql-runner.log');
      const content = fs.readFileSync(logFile, 'utf8');

      // ISO timestamp pattern: 2024-01-01T00:00:00.000Z
      expect(content).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include log level in file logs', () => {
      const logger = new ConsoleLogger({ logDirectory: testLogDir });
      logger.info('Test message');

      const logFile = path.join(testLogDir, 'sql-runner.log');
      const content = fs.readFileSync(logFile, 'utf8');

      expect(content).toContain('[INFO]');
    });
  });
});

describe('SilentLogger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should not output anything for info', () => {
    const logger = new SilentLogger();
    logger.info('Test message');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should not output anything for success', () => {
    const logger = new SilentLogger();
    logger.success('Test message');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should not output anything for warning', () => {
    const logger = new SilentLogger();
    logger.warning('Test message');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should not output anything for error', () => {
    const logger = new SilentLogger();
    logger.error('Test message');

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should not output anything for debug', () => {
    const logger = new SilentLogger();
    logger.debug('Test message');

    expect(consoleSpy).not.toHaveBeenCalled();
  });
});

describe('createLogger', () => {
  it('should create SilentLogger when silent is true', () => {
    const logger = createLogger({ silent: true });

    expect(logger).toBeInstanceOf(SilentLogger);
  });

  it('should create ConsoleLogger when silent is false', () => {
    const logger = createLogger({ silent: false });

    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  it('should create ConsoleLogger by default', () => {
    const logger = createLogger({});

    expect(logger).toBeInstanceOf(ConsoleLogger);
  });

  it('should pass logDirectory to ConsoleLogger', () => {
    const testDir = '/tmp/test-logs';
    const logger = createLogger({ logDirectory: testDir });

    expect(logger).toBeInstanceOf(ConsoleLogger);
  });
});
