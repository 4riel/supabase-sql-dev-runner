/**
 * Spinner Component
 *
 * Animated progress indicator for long-running operations.
 * Single responsibility: show activity feedback.
 */

import { spinnerFrames, c } from '../theme.js';

export interface SpinnerOptions {
  text?: string;
  frames?: readonly string[];
  interval?: number;
  stream?: NodeJS.WriteStream;
}

/**
 * Creates an animated spinner instance
 *
 * @example
 * ```ts
 * const spinner = createSpinner({ text: 'Loading...' });
 * spinner.start();
 * // ... do work
 * spinner.stop();
 * ```
 */
export function createSpinner(options: SpinnerOptions = {}) {
  const {
    text = '',
    frames = spinnerFrames,
    interval = 80,
    stream = process.stdout,
  } = options;

  let frameIndex = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let currentText = text;
  let isSpinning = false;

  const clearLine = (): void => {
    stream.clearLine?.(0);
    stream.cursorTo?.(0);
  };

  const render = (): void => {
    const frame = c.primary(frames[frameIndex]);
    clearLine();
    stream.write(`${frame} ${currentText}`);
    frameIndex = (frameIndex + 1) % frames.length;
  };

  return {
    /**
     * Start the spinner animation
     */
    start(newText?: string): void {
      if (isSpinning) return;
      if (newText) currentText = newText;
      isSpinning = true;

      // Hide cursor
      stream.write('\x1b[?25l');

      render();
      timer = setInterval(render, interval);
    },

    /**
     * Stop the spinner and clear the line
     */
    stop(): void {
      if (!isSpinning) return;
      isSpinning = false;

      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      clearLine();
      // Show cursor
      stream.write('\x1b[?25h');
    },

    /**
     * Stop with a success message
     */
    success(message?: string): void {
      this.stop();
      if (message) {
        stream.write(`${c.success('✓')} ${message}\n`);
      }
    },

    /**
     * Stop with an error message
     */
    error(message?: string): void {
      this.stop();
      if (message) {
        stream.write(`${c.error('✗')} ${message}\n`);
      }
    },

    /**
     * Stop with a warning message
     */
    warn(message?: string): void {
      this.stop();
      if (message) {
        stream.write(`${c.warning('⚠')} ${message}\n`);
      }
    },

    /**
     * Update the spinner text
     */
    update(newText: string): void {
      currentText = newText;
      if (isSpinning) {
        render();
      }
    },

    /**
     * Check if spinner is currently active
     */
    isActive(): boolean {
      return isSpinning;
    },
  };
}

/**
 * Simple inline progress indicator (no animation)
 *
 * @example
 * ```
 * ● Connecting to database...
 * ```
 */
export function renderProgress(text: string, status: 'active' | 'done' | 'error' = 'active'): string {
  switch (status) {
    case 'done':
      return `${c.success('✓')} ${text}`;
    case 'error':
      return `${c.error('✗')} ${text}`;
    default:
      return `${c.primary('●')} ${text}`;
  }
}

/**
 * Countdown display for watch mode
 *
 * @example
 * ```
 * ⏳ Running in 5s... (save again to reset)
 * ```
 */
export function renderCountdown(seconds: number): string {
  return c.muted(`⏳ Running in ${seconds}s... (save again to reset)`);
}
