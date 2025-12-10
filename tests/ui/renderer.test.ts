import { describe, it, expect, beforeEach } from 'vitest';
import { Writable } from 'node:stream';
import { UIRenderer, createUIRenderer } from '../../src/ui/renderer.js';
import { stripAnsi } from '../../src/ui/theme.js';

/**
 * Create a mock writable stream that captures output
 */
function createMockStream(): { stream: NodeJS.WriteStream; output: string[] } {
  const output: string[] = [];

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      output.push(chunk.toString());
      callback();
    },
  }) as NodeJS.WriteStream;

  // Add required TTY methods
  stream.isTTY = true;
  stream.clearLine = () => true;
  stream.cursorTo = () => true;
  stream.moveCursor = () => true;

  return { stream, output };
}

describe('UIRenderer', () => {
  let mockStream: ReturnType<typeof createMockStream>;
  let ui: UIRenderer;

  beforeEach(() => {
    delete process.env.NO_COLOR;
    mockStream = createMockStream();
    ui = new UIRenderer({
      name: 'test-app',
      version: '1.0.0',
      stream: mockStream.stream,
    });
  });

  describe('constructor', () => {
    it('should use default values when no options provided', () => {
      const renderer = createUIRenderer();
      expect(renderer).toBeInstanceOf(UIRenderer);
    });

    it('should accept custom options', () => {
      const renderer = new UIRenderer({
        name: 'custom',
        version: '2.0.0',
        silent: false,
      });
      expect(renderer).toBeInstanceOf(UIRenderer);
    });
  });

  describe('banner', () => {
    it('should render banner to stream', () => {
      ui.banner();
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('test-app');
      expect(plain).toContain('v1.0.0');
      expect(plain).toContain('Supabase SQL Dev Runner');
    });
  });

  describe('minimalBanner', () => {
    it('should render minimal banner to stream', () => {
      ui.minimalBanner();
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('test-app');
      expect(plain).toContain('v1.0.0');
    });
  });

  describe('devWarning', () => {
    it('should render development warning', () => {
      ui.devWarning();
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Development tool');
      expect(plain).toContain('not for production');
    });
  });

  describe('connectionInfo', () => {
    it('should render connection information', () => {
      ui.connectionInfo({
        host: 'localhost',
        directory: './sql',
        fileCount: 5,
        logDirectory: './logs',
      });
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('localhost');
      expect(plain).toContain('./sql');
      expect(plain).toContain('5 found');
      expect(plain).toContain('./logs');
    });

    it('should omit logs when logDirectory is null', () => {
      ui.connectionInfo({
        host: 'localhost',
        directory: './sql',
        fileCount: 3,
        logDirectory: null,
      });
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).not.toContain('Logs');
    });
  });

  describe('fileList', () => {
    it('should render file list with title', () => {
      ui.fileList(['file1.sql', 'file2.sql']);
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Files to execute');
      expect(plain).toContain('file1.sql');
      expect(plain).toContain('file2.sql');
    });

    it('should use custom title', () => {
      ui.fileList(['file.sql'], 'Custom Title');
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Custom Title');
    });
  });

  describe('ignoredFiles', () => {
    it('should render ignored files', () => {
      ui.ignoredFiles(['_ignored.sql', 'README.md']);
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Ignoring 2 files');
      expect(plain).toContain('_ignored.sql');
      expect(plain).toContain('README.md');
    });

    it('should not render anything for empty array', () => {
      ui.ignoredFiles([]);
      expect(mockStream.output).toHaveLength(0);
    });

    it('should handle singular file', () => {
      ui.ignoredFiles(['single.sql']);
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Ignoring 1 file');
      expect(plain).not.toContain('files');
    });
  });

  describe('dryRun', () => {
    it('should render dry run notice', () => {
      ui.dryRun();
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('DRY RUN');
      expect(plain).toContain('No changes');
    });
  });

  describe('confirmationWarning', () => {
    it('should render confirmation warning', () => {
      ui.confirmationWarning();
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('execute SQL scripts');
      expect(plain).toContain('modify or delete');
      expect(plain).toContain('rollback');
    });
  });

  describe('fileResultSimple', () => {
    it('should render successful file result', () => {
      ui.fileResultSimple(
        { fileName: 'test.sql', success: true, durationMs: 42 },
        0,
        3
      );
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('[1/3]');
      expect(plain).toContain('✓');
      expect(plain).toContain('test.sql');
      expect(plain).toContain('42ms');
    });

    it('should render failed file result', () => {
      ui.fileResultSimple(
        { fileName: 'test.sql', success: false },
        1,
        3
      );
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('[2/3]');
      expect(plain).toContain('✗');
      expect(plain).toContain('failed');
    });
  });

  describe('error', () => {
    it('should render error with message', () => {
      ui.error({ message: 'Something went wrong' });
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Error');
      expect(plain).toContain('Something went wrong');
    });

    it('should render error with code and hint', () => {
      ui.error({
        message: 'Table not found',
        code: '42P01',
        hint: 'Create the table first',
      });
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('42P01');
      expect(plain).toContain('Create the table first');
    });
  });

  describe('summary', () => {
    it('should render successful summary', () => {
      ui.summary({
        totalFiles: 5,
        successfulFiles: 5,
        failedFiles: 0,
        totalDurationMs: 150,
        committed: true,
      });
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('5/5 files');
      expect(plain).toContain('150ms');
      expect(plain).toContain('committed');
      expect(plain).toContain('successfully');
    });

    it('should render failed summary', () => {
      ui.summary({
        totalFiles: 5,
        successfulFiles: 3,
        failedFiles: 2,
        totalDurationMs: 100,
        committed: false,
      });
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('3/5 files');
      expect(plain).toContain('rolled back');
    });

    it('should render not committed summary', () => {
      ui.summary({
        totalFiles: 3,
        successfulFiles: 3,
        failedFiles: 0,
        totalDurationMs: 50,
        committed: false,
      });
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('not committed');
    });
  });

  describe('message methods', () => {
    it('should render info message', () => {
      ui.info('Info message');
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('ℹ');
      expect(plain).toContain('Info message');
    });

    it('should render success message', () => {
      ui.success('Success message');
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('✓');
      expect(plain).toContain('Success message');
    });

    it('should render warning message', () => {
      ui.warning('Warning message');
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('⚠');
      expect(plain).toContain('Warning message');
    });

    it('should render error message', () => {
      ui.errorMessage('Error message');
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('✗');
      expect(plain).toContain('Error message');
    });
  });

  describe('sqlNotice', () => {
    it('should render SQL notice', () => {
      ui.sqlNotice('NOTICE: table created');
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('[SQL]');
      expect(plain).toContain('NOTICE: table created');
    });
  });

  describe('cancelled', () => {
    it('should render cancelled message', () => {
      ui.cancelled();
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('cancelled');
    });
  });

  describe('watchMode', () => {
    it('should render watch mode started', () => {
      ui.watchMode.started();
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Watching for changes');
      expect(plain).toContain('Ctrl+C');
    });

    it('should render file changed', () => {
      ui.watchMode.fileChanged('test.sql');
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Changed');
      expect(plain).toContain('test.sql');
    });

    it('should render stopped', () => {
      ui.watchMode.stopped();
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain).toContain('Stopped watching');
    });
  });

  describe('utility methods', () => {
    it('should render newline', () => {
      ui.newline();
      expect(mockStream.output).toContain('\n');
    });

    it('should render divider', () => {
      ui.divider(20);
      const output = mockStream.output.join('');
      const plain = stripAnsi(output);

      expect(plain.trim()).toMatch(/^─+$/);
    });
  });

  describe('silent mode', () => {
    it('should not output anything when silent', () => {
      const silentUi = new UIRenderer({
        stream: mockStream.stream,
        silent: true,
      });

      silentUi.banner();
      silentUi.info('test');
      silentUi.error({ message: 'error' });

      expect(mockStream.output).toHaveLength(0);
    });
  });
});
