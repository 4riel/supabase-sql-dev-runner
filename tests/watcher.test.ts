import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import { startWatcher, type WatchOptions } from '../src/core/watcher.js';

// Mock fs.watch
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs');
  return {
    ...actual,
    watch: vi.fn(),
  };
});

// Mock UI module
vi.mock('../src/ui/index.js', () => ({
  c: {
    muted: (s: string) => s,
    primary: (s: string) => s,
    cyan: (s: string) => s,
  },
  symbols: {
    pending: '⏳',
    arrowRight: '▸',
    running: '👀',
  },
}));

describe('Watcher Module', () => {
  let mockWatcher: {
    on: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    listeners: Record<string, ((err: Error) => void)[]>;
  };
  let watchCallback: ((eventType: string, filename: string | null) => void) | null;
  let mockLogger: { info: ReturnType<typeof vi.fn>; warning: ReturnType<typeof vi.fn> };
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>;
  let _consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    watchCallback = null;

    // Create mock watcher
    mockWatcher = {
      listeners: {},
      on: vi.fn((event: string, handler: (err: Error) => void) => {
        if (!mockWatcher.listeners[event]) {
          mockWatcher.listeners[event] = [];
        }
        mockWatcher.listeners[event].push(handler);
      }),
      close: vi.fn(),
    };

    // Mock fs.watch to capture callback and return mock watcher
    vi.mocked(fs.watch).mockImplementation((_path, callback) => {
      watchCallback = callback as (eventType: string, filename: string | null) => void;
      return mockWatcher as unknown as fs.FSWatcher;
    });

    // Mock logger
    mockLogger = {
      info: vi.fn(),
      warning: vi.fn(),
    };

    // Spy on stdout.write and console.log
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    _consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function createWatchOptions(overrides: Partial<WatchOptions> = {}): WatchOptions {
    return {
      directory: './sql',
      pattern: /\.sql$/,
      countdownSeconds: 30,
      onExecute: vi.fn().mockResolvedValue(undefined),
      logger: mockLogger,
      ...overrides,
    };
  }

  describe('startWatcher', () => {
    it('should start watching the specified directory', () => {
      const options = createWatchOptions();
      startWatcher(options);

      expect(fs.watch).toHaveBeenCalledWith('./sql', expect.any(Function));
    });

    it('should return a cleanup function', () => {
      const options = createWatchOptions();
      const cleanup = startWatcher(options);

      expect(typeof cleanup).toBe('function');
    });

    it('should close watcher when cleanup is called', () => {
      const options = createWatchOptions();
      const cleanup = startWatcher(options);

      cleanup();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should register error handler on watcher', () => {
      const options = createWatchOptions();
      startWatcher(options);

      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('file change detection', () => {
    it('should react to .sql file changes', () => {
      const options = createWatchOptions();
      startWatcher(options);

      // Simulate file change
      watchCallback?.('change', 'test.sql');

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('test.sql'));
    });

    it('should ignore non-sql file changes', () => {
      const options = createWatchOptions();
      startWatcher(options);

      // Simulate non-SQL file change
      watchCallback?.('change', 'test.txt');

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should ignore null filename', () => {
      const options = createWatchOptions();
      startWatcher(options);

      // Simulate change with null filename (can happen on some platforms)
      watchCallback?.('change', null);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should use custom pattern for file matching', () => {
      const options = createWatchOptions({ pattern: /\.psql$/ });
      startWatcher(options);

      // SQL should not match
      watchCallback?.('change', 'test.sql');
      expect(mockLogger.info).not.toHaveBeenCalled();

      // PSQL should match
      watchCallback?.('change', 'test.psql');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('test.psql'));
    });
  });

  describe('countdown timer', () => {
    it('should show countdown message after file change', () => {
      const options = createWatchOptions({ countdownSeconds: 5 });
      startWatcher(options);

      watchCallback?.('change', 'test.sql');

      expect(stdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('Running in 5s')
      );
    });

    it('should decrement countdown every second', () => {
      const options = createWatchOptions({ countdownSeconds: 3 });
      startWatcher(options);

      watchCallback?.('change', 'test.sql');

      // Initial countdown
      expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('3s'));

      // After 1 second
      vi.advanceTimersByTime(1000);
      expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('2s'));

      // After 2 seconds
      vi.advanceTimersByTime(1000);
      expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('1s'));
    });

    it('should execute after countdown completes', async () => {
      const onExecute = vi.fn().mockResolvedValue(undefined);
      const options = createWatchOptions({ countdownSeconds: 2, onExecute });
      startWatcher(options);

      watchCallback?.('change', 'test.sql');

      // Before countdown completes
      expect(onExecute).not.toHaveBeenCalled();

      // After countdown completes
      await vi.advanceTimersByTimeAsync(2000);

      expect(onExecute).toHaveBeenCalled();
    });

    it('should reset countdown on new file change', async () => {
      const onExecute = vi.fn().mockResolvedValue(undefined);
      const options = createWatchOptions({ countdownSeconds: 3, onExecute });
      startWatcher(options);

      // First change
      watchCallback?.('change', 'first.sql');

      // Wait 2 seconds (before execution)
      vi.advanceTimersByTime(2000);

      // Second change - should reset timer
      watchCallback?.('change', 'second.sql');

      // Wait another 2 seconds (total 4 from first change, but only 2 from reset)
      vi.advanceTimersByTime(2000);

      // Should not have executed yet (reset to 3s, only 2s passed)
      expect(onExecute).not.toHaveBeenCalled();

      // Wait 1 more second
      await vi.advanceTimersByTimeAsync(1000);

      // Now should have executed
      expect(onExecute).toHaveBeenCalledTimes(1);
    });

    it('should show watching message after execution', async () => {
      const options = createWatchOptions({ countdownSeconds: 1 });
      startWatcher(options);

      watchCallback?.('change', 'test.sql');
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Watching for changes')
      );
    });
  });

  describe('execution guard', () => {
    it('should not start new countdown while executing', async () => {
      let resolveExecution: () => void;
      const executionPromise = new Promise<void>((resolve) => {
        resolveExecution = resolve;
      });
      const onExecute = vi.fn().mockReturnValue(executionPromise);
      const options = createWatchOptions({ countdownSeconds: 1, onExecute });
      startWatcher(options);

      // Trigger first execution
      watchCallback?.('change', 'first.sql');
      await vi.advanceTimersByTimeAsync(1000);

      // Execution started
      expect(onExecute).toHaveBeenCalledTimes(1);

      // Try to trigger another change while executing
      watchCallback?.('change', 'second.sql');

      // Should log that execution is in progress
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Execution in progress')
      );

      // Complete the execution
      resolveExecution!();
      await vi.advanceTimersByTimeAsync(0);
    });

    it('should allow new countdown after execution completes', async () => {
      const onExecute = vi.fn().mockResolvedValue(undefined);
      const options = createWatchOptions({ countdownSeconds: 1, onExecute });
      startWatcher(options);

      // First execution
      watchCallback?.('change', 'first.sql');
      await vi.advanceTimersByTimeAsync(1000);
      expect(onExecute).toHaveBeenCalledTimes(1);

      // Second change after execution completes
      watchCallback?.('change', 'second.sql');
      await vi.advanceTimersByTimeAsync(1000);

      expect(onExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle execution errors gracefully', async () => {
      const onExecute = vi.fn().mockRejectedValue(new Error('Execution failed'));
      const options = createWatchOptions({ countdownSeconds: 1, onExecute });
      startWatcher(options);

      watchCallback?.('change', 'test.sql');
      await vi.advanceTimersByTimeAsync(1000);

      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('Execution error')
      );
    });

    it('should continue watching after execution error', async () => {
      const onExecute = vi.fn()
        .mockRejectedValueOnce(new Error('First failed'))
        .mockResolvedValueOnce(undefined);
      const options = createWatchOptions({ countdownSeconds: 1, onExecute });
      startWatcher(options);

      // First execution (fails)
      watchCallback?.('change', 'test.sql');
      await vi.advanceTimersByTimeAsync(1000);

      // Second execution (succeeds)
      watchCallback?.('change', 'test.sql');
      await vi.advanceTimersByTimeAsync(1000);

      expect(onExecute).toHaveBeenCalledTimes(2);
    });

    it('should handle watcher errors', () => {
      const options = createWatchOptions();
      startWatcher(options);

      // Trigger watcher error
      const errorHandler = mockWatcher.listeners['error']?.[0];
      errorHandler?.(new Error('Watch error'));

      expect(mockLogger.warning).toHaveBeenCalledWith(
        expect.stringContaining('Watch error')
      );
    });
  });

  describe('cleanup', () => {
    it('should clear countdown timers on cleanup', async () => {
      const onExecute = vi.fn().mockResolvedValue(undefined);
      const options = createWatchOptions({ countdownSeconds: 5, onExecute });
      const cleanup = startWatcher(options);

      // Start countdown
      watchCallback?.('change', 'test.sql');

      // Cleanup before countdown completes
      cleanup();

      // Advance time past countdown
      await vi.advanceTimersByTimeAsync(10000);

      // Execute should not have been called
      expect(onExecute).not.toHaveBeenCalled();
    });

    it('should close watcher on cleanup', () => {
      const options = createWatchOptions();
      const cleanup = startWatcher(options);

      cleanup();

      expect(mockWatcher.close).toHaveBeenCalled();
    });
  });
});
