import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  colors,
  theme,
  symbols,
  spinnerFrames,
  supportsColor,
  stripAnsi,
  visibleLength,
  colorize,
  c,
} from '../../src/ui/theme.js';

describe('UI Theme', () => {
  describe('colors', () => {
    it('should have reset code', () => {
      expect(colors.reset).toBe('\x1b[0m');
    });

    it('should have all basic colors', () => {
      expect(colors.red).toBe('\x1b[31m');
      expect(colors.green).toBe('\x1b[32m');
      expect(colors.yellow).toBe('\x1b[33m');
      expect(colors.blue).toBe('\x1b[34m');
      expect(colors.cyan).toBe('\x1b[36m');
      expect(colors.gray).toBe('\x1b[90m');
    });

    it('should have modifier codes', () => {
      expect(colors.bold).toBe('\x1b[1m');
      expect(colors.dim).toBe('\x1b[2m');
    });
  });

  describe('theme', () => {
    it('should map semantic colors', () => {
      expect(theme.success).toBe(colors.green);
      expect(theme.error).toBe(colors.red);
      expect(theme.warning).toBe(colors.yellow);
      expect(theme.info).toBe(colors.cyan);
      expect(theme.muted).toBe(colors.gray);
    });

    it('should have UI element colors', () => {
      expect(theme.primary).toBe(colors.cyan);
      expect(theme.secondary).toBe(colors.gray);
    });
  });

  describe('symbols', () => {
    it('should have status indicators', () => {
      expect(symbols.success).toBe('✓');
      expect(symbols.error).toBe('✗');
      expect(symbols.warning).toBe('⚠');
      expect(symbols.info).toBe('ℹ');
      expect(symbols.pending).toBe('○');
      expect(symbols.running).toBe('●');
    });

    it('should have box drawing characters', () => {
      expect(symbols.topLeft).toBe('╭');
      expect(symbols.topRight).toBe('╮');
      expect(symbols.bottomLeft).toBe('╰');
      expect(symbols.bottomRight).toBe('╯');
      expect(symbols.horizontal).toBe('─');
      expect(symbols.vertical).toBe('│');
    });

    it('should have arrow symbols', () => {
      expect(symbols.arrow).toBe('→');
      expect(symbols.arrowRight).toBe('▸');
      expect(symbols.bullet).toBe('•');
    });
  });

  describe('spinnerFrames', () => {
    it('should have spinner animation frames', () => {
      expect(spinnerFrames).toHaveLength(10);
      expect(spinnerFrames[0]).toBe('⠋');
    });
  });

  describe('supportsColor', () => {
    let originalNoColor: string | undefined;
    let originalForceColor: string | undefined;
    let originalIsTTY: boolean | undefined;

    beforeEach(() => {
      originalNoColor = process.env.NO_COLOR;
      originalForceColor = process.env.FORCE_COLOR;
      originalIsTTY = process.stdout.isTTY;
      delete process.env.NO_COLOR;
      delete process.env.FORCE_COLOR;
    });

    afterEach(() => {
      if (originalNoColor !== undefined) {
        process.env.NO_COLOR = originalNoColor;
      } else {
        delete process.env.NO_COLOR;
      }
      if (originalForceColor !== undefined) {
        process.env.FORCE_COLOR = originalForceColor;
      } else {
        delete process.env.FORCE_COLOR;
      }
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        writable: true,
      });
    });

    it('should return false when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      expect(supportsColor()).toBe(false);
    });

    it('should return true when FORCE_COLOR is set', () => {
      process.env.FORCE_COLOR = '1';
      expect(supportsColor()).toBe(true);
    });

    it('should return true when stdout is TTY', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      expect(supportsColor()).toBe(true);
    });

    it('should return false when stdout is not TTY and no env vars', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
      expect(supportsColor()).toBe(false);
    });
  });

  describe('stripAnsi', () => {
    it('should remove ANSI color codes', () => {
      const colored = '\x1b[31mred text\x1b[0m';
      expect(stripAnsi(colored)).toBe('red text');
    });

    it('should handle multiple color codes', () => {
      const colored = '\x1b[1m\x1b[32mbold green\x1b[0m normal';
      expect(stripAnsi(colored)).toBe('bold green normal');
    });

    it('should return unchanged string if no ANSI codes', () => {
      const plain = 'plain text';
      expect(stripAnsi(plain)).toBe('plain text');
    });

    it('should handle empty string', () => {
      expect(stripAnsi('')).toBe('');
    });
  });

  describe('visibleLength', () => {
    it('should return correct length without ANSI codes', () => {
      const colored = '\x1b[31mhello\x1b[0m';
      expect(visibleLength(colored)).toBe(5);
    });

    it('should return correct length for plain text', () => {
      expect(visibleLength('hello')).toBe(5);
    });

    it('should handle unicode symbols', () => {
      expect(visibleLength('✓ success')).toBe(9);
    });
  });

  describe('colorize', () => {
    let originalNoColor: string | undefined;

    beforeEach(() => {
      originalNoColor = process.env.NO_COLOR;
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
    });

    afterEach(() => {
      if (originalNoColor !== undefined) {
        process.env.NO_COLOR = originalNoColor;
      } else {
        delete process.env.NO_COLOR;
      }
    });

    it('should wrap text with color codes when colors supported', () => {
      const result = colorize('test', colors.red);
      expect(result).toBe('\x1b[31mtest\x1b[0m');
    });

    it('should return plain text when NO_COLOR is set', () => {
      process.env.NO_COLOR = '1';
      const result = colorize('test', colors.red);
      expect(result).toBe('test');
    });
  });

  describe('c (color shortcuts)', () => {
    let originalNoColor: string | undefined;

    beforeEach(() => {
      originalNoColor = process.env.NO_COLOR;
      delete process.env.NO_COLOR;
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
    });

    afterEach(() => {
      if (originalNoColor !== undefined) {
        process.env.NO_COLOR = originalNoColor;
      } else {
        delete process.env.NO_COLOR;
      }
    });

    it('should have status color functions', () => {
      expect(c.success('ok')).toContain('ok');
      expect(c.error('fail')).toContain('fail');
      expect(c.warning('warn')).toContain('warn');
      expect(c.info('info')).toContain('info');
      expect(c.muted('muted')).toContain('muted');
    });

    it('should have UI color functions', () => {
      expect(c.primary('primary')).toContain('primary');
      expect(c.secondary('secondary')).toContain('secondary');
      expect(c.accent('accent')).toContain('accent');
    });

    it('should have text style functions', () => {
      expect(c.title('title')).toContain('title');
      expect(c.subtitle('subtitle')).toContain('subtitle');
      expect(c.label('label')).toContain('label');
    });

    it('should have raw color functions', () => {
      expect(c.bold('bold')).toContain('bold');
      expect(c.dim('dim')).toContain('dim');
      expect(c.green('green')).toContain('green');
      expect(c.red('red')).toContain('red');
      expect(c.cyan('cyan')).toContain('cyan');
    });

    it('should apply ANSI codes when colors supported', () => {
      const result = c.success('ok');
      expect(result).toContain('\x1b[');
    });
  });
});
