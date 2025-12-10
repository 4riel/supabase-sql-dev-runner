/**
 * Box Component
 *
 * Reusable box drawing utility for bordered content.
 * Single responsibility: render content within borders.
 */

import { symbols, c, visibleLength } from '../theme.js';

export type BoxStyle = 'rounded' | 'sharp' | 'double' | 'none';

export interface BoxOptions {
  style?: BoxStyle;
  padding?: number;
  width?: number;
  title?: string;
  titleAlign?: 'left' | 'center' | 'right';
}

interface BoxChars {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  horizontal: string;
  vertical: string;
}

const boxStyles: Record<BoxStyle, BoxChars> = {
  rounded: {
    topLeft: symbols.topLeft,
    topRight: symbols.topRight,
    bottomLeft: symbols.bottomLeft,
    bottomRight: symbols.bottomRight,
    horizontal: symbols.horizontal,
    vertical: symbols.vertical,
  },
  sharp: {
    topLeft: symbols.sharpTopLeft,
    topRight: symbols.sharpTopRight,
    bottomLeft: symbols.sharpBottomLeft,
    bottomRight: symbols.sharpBottomRight,
    horizontal: symbols.sharpHorizontal,
    vertical: symbols.sharpVertical,
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  },
  none: {
    topLeft: ' ',
    topRight: ' ',
    bottomLeft: ' ',
    bottomRight: ' ',
    horizontal: ' ',
    vertical: ' ',
  },
};

/**
 * Renders content within a box
 *
 * @example
 * ```
 * ╭────────────────────╮
 * │ Content goes here  │
 * ╰────────────────────╯
 * ```
 */
export function renderBox(content: string | string[], options: BoxOptions = {}): string {
  const { style = 'rounded', padding = 1, title, titleAlign = 'left' } = options;
  const chars = boxStyles[style];
  const lines = Array.isArray(content) ? content : content.split('\n');

  // Calculate width
  const contentWidth = Math.max(...lines.map((line) => visibleLength(line)));
  const innerWidth = options.width ?? contentWidth + padding * 2;

  const result: string[] = [];

  // Top border with optional title
  if (title) {
    const titleText = ` ${title} `;
    const titleLen = visibleLength(titleText);
    const remainingWidth = innerWidth - titleLen;

    let topBorder: string;
    if (titleAlign === 'center') {
      const leftPad = Math.floor(remainingWidth / 2);
      const rightPad = remainingWidth - leftPad;
      topBorder =
        chars.topLeft +
        chars.horizontal.repeat(leftPad) +
        c.muted(titleText) +
        chars.horizontal.repeat(rightPad) +
        chars.topRight;
    } else if (titleAlign === 'right') {
      topBorder =
        chars.topLeft +
        chars.horizontal.repeat(remainingWidth) +
        c.muted(titleText) +
        chars.topRight;
    } else {
      topBorder =
        chars.topLeft +
        c.muted(titleText) +
        chars.horizontal.repeat(remainingWidth) +
        chars.topRight;
    }
    result.push(c.muted(topBorder));
  } else {
    result.push(c.muted(chars.topLeft + chars.horizontal.repeat(innerWidth) + chars.topRight));
  }

  // Content lines
  for (const line of lines) {
    const lineLen = visibleLength(line);
    const rightPad = innerWidth - padding - lineLen;
    result.push(
      c.muted(chars.vertical) +
        ' '.repeat(padding) +
        line +
        ' '.repeat(Math.max(0, rightPad)) +
        c.muted(chars.vertical)
    );
  }

  // Bottom border
  result.push(c.muted(chars.bottomLeft + chars.horizontal.repeat(innerWidth) + chars.bottomRight));

  return result.join('\n');
}

/**
 * Renders a horizontal divider line
 *
 * @example
 * ```
 * ────────────────────────────
 * ```
 */
export function renderDivider(width = 40, char = symbols.horizontal): string {
  return c.muted(char.repeat(width));
}

/**
 * Renders a section header with line
 *
 * @example
 * ```
 * ── Section Title ──────────────
 * ```
 */
export function renderSectionHeader(title: string, width = 40): string {
  const prefix = `${symbols.horizontal}${symbols.horizontal} `;
  const suffix = ` ${symbols.horizontal.repeat(Math.max(0, width - visibleLength(title) - 4))}`;
  return c.muted(prefix) + c.title(title) + c.muted(suffix);
}
