import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderBanner, renderMinimalBanner } from '../../src/ui/components/banner.js';
import { renderBox, renderDivider, renderSectionHeader } from '../../src/ui/components/box.js';
import { renderList, renderKeyValue, renderFileStatus } from '../../src/ui/components/table.js';
import { renderProgress, renderCountdown } from '../../src/ui/components/spinner.js';
import { stripAnsi } from '../../src/ui/theme.js';

describe('UI Components', () => {
  // Ensure colors are enabled for tests
  beforeEach(() => {
    delete process.env.NO_COLOR;
    Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
  });

  describe('banner', () => {
    describe('renderBanner', () => {
      it('should render banner with name and version', () => {
        const result = renderBanner({ name: 'test-app', version: '1.0.0' });
        const plain = stripAnsi(result);

        expect(plain).toContain('test-app');
        expect(plain).toContain('v1.0.0');
      });

      it('should render banner with subtitle', () => {
        const result = renderBanner({
          name: 'test-app',
          version: '1.0.0',
          subtitle: 'My Subtitle',
        });
        const plain = stripAnsi(result);

        expect(plain).toContain('My Subtitle');
      });

      it('should include box drawing characters', () => {
        const result = renderBanner({ name: 'test', version: '1.0.0' });
        const plain = stripAnsi(result);

        expect(plain).toContain('╭');
        expect(plain).toContain('╯');
        expect(plain).toContain('│');
      });

      it('should respect custom width', () => {
        const result = renderBanner({ name: 'test', version: '1.0.0', width: 60 });
        const lines = result.split('\n');
        const plainFirstLine = stripAnsi(lines[0]);

        expect(plainFirstLine.length).toBe(60);
      });
    });

    describe('renderMinimalBanner', () => {
      it('should render single line banner', () => {
        const result = renderMinimalBanner('app', '2.0.0');
        const plain = stripAnsi(result);

        expect(plain).toContain('app');
        expect(plain).toContain('v2.0.0');
        expect(result.split('\n')).toHaveLength(1);
      });

      it('should include arrow symbol', () => {
        const result = renderMinimalBanner('app', '1.0.0');
        const plain = stripAnsi(result);

        expect(plain).toContain('▸');
      });
    });
  });

  describe('box', () => {
    describe('renderBox', () => {
      it('should render content in a box', () => {
        const result = renderBox('Hello World');
        const plain = stripAnsi(result);

        expect(plain).toContain('Hello World');
        expect(plain).toContain('╭');
        expect(plain).toContain('╰');
      });

      it('should handle array content', () => {
        const result = renderBox(['Line 1', 'Line 2']);
        const plain = stripAnsi(result);

        expect(plain).toContain('Line 1');
        expect(plain).toContain('Line 2');
      });

      it('should support sharp style', () => {
        const result = renderBox('Content', { style: 'sharp' });
        const plain = stripAnsi(result);

        expect(plain).toContain('┌');
        expect(plain).toContain('└');
      });

      it('should support double style', () => {
        const result = renderBox('Content', { style: 'double' });
        const plain = stripAnsi(result);

        expect(plain).toContain('╔');
        expect(plain).toContain('╚');
      });

      it('should render with title', () => {
        const result = renderBox('Content', { title: 'Title' });
        const plain = stripAnsi(result);

        expect(plain).toContain('Title');
      });
    });

    describe('renderDivider', () => {
      it('should render horizontal line of default width', () => {
        const result = renderDivider();
        const plain = stripAnsi(result);

        expect(plain).toHaveLength(40);
        expect(plain).toMatch(/^─+$/);
      });

      it('should respect custom width', () => {
        const result = renderDivider(20);
        const plain = stripAnsi(result);

        expect(plain).toHaveLength(20);
      });

      it('should use custom character', () => {
        const result = renderDivider(10, '=');
        const plain = stripAnsi(result);

        expect(plain).toBe('==========');
      });
    });

    describe('renderSectionHeader', () => {
      it('should render section header with title', () => {
        const result = renderSectionHeader('Section');
        const plain = stripAnsi(result);

        expect(plain).toContain('Section');
        expect(plain).toContain('──');
      });
    });
  });

  describe('table', () => {
    describe('renderList', () => {
      it('should render items with bullets', () => {
        const result = renderList(['Item 1', 'Item 2', 'Item 3']);
        const plain = stripAnsi(result);

        expect(plain).toContain('• Item 1');
        expect(plain).toContain('• Item 2');
        expect(plain).toContain('• Item 3');
      });

      it('should use custom bullet', () => {
        const result = renderList(['Item'], '-');
        const plain = stripAnsi(result);

        expect(plain).toContain('- Item');
      });

      it('should handle empty array', () => {
        const result = renderList([]);
        expect(result).toBe('');
      });
    });

    describe('renderKeyValue', () => {
      it('should render key-value pairs aligned', () => {
        const result = renderKeyValue([
          { key: 'Name', value: 'Test' },
          { key: 'Version', value: '1.0.0' },
        ]);
        const plain = stripAnsi(result);

        expect(plain).toContain('Name');
        expect(plain).toContain('Test');
        expect(plain).toContain('Version');
        expect(plain).toContain('1.0.0');
      });

      it('should use separator', () => {
        const result = renderKeyValue(
          [{ key: 'Key', value: 'Value' }],
          { separator: ':' }
        );
        const plain = stripAnsi(result);

        expect(plain).toContain(':');
      });
    });

    describe('renderFileStatus', () => {
      it('should render pending status', () => {
        const result = renderFileStatus([
          { name: 'file.sql', status: 'pending' },
        ]);
        const plain = stripAnsi(result);

        expect(plain).toContain('file.sql');
        expect(plain).toContain('○');
        expect(plain).toContain('pending');
      });

      it('should render running status', () => {
        const result = renderFileStatus([
          { name: 'file.sql', status: 'running' },
        ]);
        const plain = stripAnsi(result);

        expect(plain).toContain('●');
        expect(plain).toContain('running');
      });

      it('should render success status with duration', () => {
        const result = renderFileStatus([
          { name: 'file.sql', status: 'success', duration: 42 },
        ]);
        const plain = stripAnsi(result);

        expect(plain).toContain('✓');
        expect(plain).toContain('42ms');
      });

      it('should render error status', () => {
        const result = renderFileStatus([
          { name: 'file.sql', status: 'error' },
        ]);
        const plain = stripAnsi(result);

        expect(plain).toContain('✗');
        expect(plain).toContain('failed');
      });

      it('should align file names', () => {
        const result = renderFileStatus([
          { name: 'short.sql', status: 'success', duration: 10 },
          { name: 'very_long_filename.sql', status: 'success', duration: 20 },
        ]);
        const lines = result.split('\n');

        // Both lines should have same structure with aligned names
        expect(lines).toHaveLength(2);
      });
    });
  });

  describe('spinner', () => {
    describe('renderProgress', () => {
      it('should render active progress', () => {
        const result = renderProgress('Loading...');
        const plain = stripAnsi(result);

        expect(plain).toContain('●');
        expect(plain).toContain('Loading...');
      });

      it('should render done progress', () => {
        const result = renderProgress('Complete', 'done');
        const plain = stripAnsi(result);

        expect(plain).toContain('✓');
        expect(plain).toContain('Complete');
      });

      it('should render error progress', () => {
        const result = renderProgress('Failed', 'error');
        const plain = stripAnsi(result);

        expect(plain).toContain('✗');
        expect(plain).toContain('Failed');
      });
    });

    describe('renderCountdown', () => {
      it('should render countdown message', () => {
        const result = renderCountdown(30);
        const plain = stripAnsi(result);

        expect(plain).toContain('30s');
        expect(plain).toContain('Running in');
      });

      it('should include reset hint', () => {
        const result = renderCountdown(10);
        const plain = stripAnsi(result);

        expect(plain).toContain('save again to reset');
      });
    });
  });
});
