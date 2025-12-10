/**
 * Banner Component
 *
 * Renders the startup banner with tool name and version.
 * Single responsibility: display application identity.
 */

import { symbols, c, visibleLength } from '../theme.js';

export interface BannerOptions {
  name: string;
  version: string;
  subtitle?: string;
  width?: number;
}

/**
 * Renders a startup banner with rounded box
 *
 * @example
 * ```
 * ╭──────────────────────────────────────────╮
 * │                                          │
 * │  ▸ sql-runner v1.2.0                     │
 * │    Supabase SQL Dev Runner               │
 * │                                          │
 * ╰──────────────────────────────────────────╯
 * ```
 */
export function renderBanner(options: BannerOptions): string {
  const { name, version, subtitle } = options;
  const width = options.width ?? 44;
  const innerWidth = width - 4; // Account for border and padding

  const lines: string[] = [];

  // Top border
  lines.push(
    c.muted(`${symbols.topLeft}${symbols.horizontal.repeat(width - 2)}${symbols.topRight}`)
  );

  // Empty line
  lines.push(c.muted(symbols.vertical) + ' '.repeat(width - 2) + c.muted(symbols.vertical));

  // Title line: ▸ sql-runner v1.2.0
  const titleContent = `${c.primary(symbols.arrowRight)} ${c.title(name)} ${c.muted(`v${version}`)}`;
  const titlePadding = innerWidth - visibleLength(titleContent);
  lines.push(
    c.muted(symbols.vertical) +
      '  ' +
      titleContent +
      ' '.repeat(Math.max(0, titlePadding)) +
      c.muted(symbols.vertical)
  );

  // Subtitle line
  if (subtitle) {
    const subtitleContent = c.subtitle(subtitle);
    const subtitlePadding = innerWidth - visibleLength(subtitleContent);
    lines.push(
      c.muted(symbols.vertical) +
        '    ' +
        subtitleContent +
        ' '.repeat(Math.max(0, subtitlePadding - 2)) +
        c.muted(symbols.vertical)
    );
  }

  // Empty line
  lines.push(c.muted(symbols.vertical) + ' '.repeat(width - 2) + c.muted(symbols.vertical));

  // Bottom border
  lines.push(
    c.muted(`${symbols.bottomLeft}${symbols.horizontal.repeat(width - 2)}${symbols.bottomRight}`)
  );

  return lines.join('\n');
}

/**
 * Renders a minimal banner (just name and version)
 *
 * @example
 * ```
 * ▸ sql-runner v1.2.0
 * ```
 */
export function renderMinimalBanner(name: string, version: string): string {
  return `${c.primary(symbols.arrowRight)} ${c.title(name)} ${c.muted(`v${version}`)}`;
}
