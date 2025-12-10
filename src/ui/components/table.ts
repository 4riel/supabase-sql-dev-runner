/**
 * Table Component
 *
 * Renders data in aligned columns with optional borders.
 * Single responsibility: tabular data display.
 */

import { symbols, c, visibleLength } from '../theme.js';

export interface Column {
  key: string;
  label?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableOptions {
  columns: Column[];
  showHeader?: boolean;
  showBorder?: boolean;
  compact?: boolean;
}

/**
 * Pads a string to a specific width
 */
function padString(str: string, width: number, align: 'left' | 'center' | 'right' = 'left'): string {
  const len = visibleLength(str);
  const padding = Math.max(0, width - len);

  if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  } else if (align === 'right') {
    return ' '.repeat(padding) + str;
  }
  return str + ' '.repeat(padding);
}

/**
 * Renders a data table with columns
 *
 * @example
 * ```
 * ┌──────────────────────┬──────────┐
 * │ File                 │ Status   │
 * ├──────────────────────┼──────────┤
 * │ 01_tables.sql        │ ✓ 12ms   │
 * │ 02_functions.sql     │ ✓ 45ms   │
 * └──────────────────────┴──────────┘
 * ```
 */
export function renderTable(
  data: Record<string, string>[],
  options: TableOptions
): string {
  const { columns, showHeader = true, showBorder = true, compact = false } = options;

  // Calculate column widths
  const colWidths: number[] = columns.map((col) => {
    const headerWidth = visibleLength(col.label ?? col.key);
    const maxDataWidth = Math.max(
      ...data.map((row) => visibleLength(row[col.key] ?? ''))
    );
    return col.width ?? Math.max(headerWidth, maxDataWidth);
  });

  const lines: string[] = [];
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + (colWidths.length - 1) * 3 + 4;

  if (showBorder) {
    // Top border
    const topBorder =
      symbols.sharpTopLeft +
      colWidths.map((w) => symbols.sharpHorizontal.repeat(w + 2)).join(symbols.sharpTeeDown) +
      symbols.sharpTopRight;
    lines.push(c.muted(topBorder));
  }

  // Header row
  if (showHeader) {
    const headerCells = columns.map((col, i) =>
      padString(c.muted(col.label ?? col.key), colWidths[i], col.align)
    );

    if (showBorder) {
      lines.push(
        c.muted(symbols.sharpVertical) +
          ' ' +
          headerCells.join(c.muted(' ' + symbols.sharpVertical + ' ')) +
          ' ' +
          c.muted(symbols.sharpVertical)
      );

      // Header separator
      const separator =
        symbols.sharpTeeRight +
        colWidths.map((w) => symbols.sharpHorizontal.repeat(w + 2)).join(symbols.sharpCross) +
        symbols.sharpTeeLeft;
      lines.push(c.muted(separator));
    } else {
      lines.push(headerCells.join('  '));
      if (!compact) {
        lines.push(c.muted(symbols.horizontal.repeat(totalWidth - 4)));
      }
    }
  }

  // Data rows
  for (const row of data) {
    const cells = columns.map((col, i) =>
      padString(row[col.key] ?? '', colWidths[i], col.align)
    );

    if (showBorder) {
      lines.push(
        c.muted(symbols.sharpVertical) +
          ' ' +
          cells.join(c.muted(' ' + symbols.sharpVertical + ' ')) +
          ' ' +
          c.muted(symbols.sharpVertical)
      );
    } else {
      lines.push(cells.join('  '));
    }
  }

  if (showBorder) {
    // Bottom border
    const bottomBorder =
      symbols.sharpBottomLeft +
      colWidths.map((w) => symbols.sharpHorizontal.repeat(w + 2)).join(symbols.sharpTeeUp) +
      symbols.sharpBottomRight;
    lines.push(c.muted(bottomBorder));
  }

  return lines.join('\n');
}

/**
 * Renders a simple list with bullets
 *
 * @example
 * ```
 * • 01_extensions.sql
 * • 02_tables.sql
 * • 03_functions.sql
 * ```
 */
export function renderList(items: string[], bullet = symbols.bullet): string {
  return items.map((item) => `${c.muted(bullet)} ${item}`).join('\n');
}

/**
 * Renders key-value pairs aligned
 *
 * @example
 * ```
 * Database:  aws-0-us-east-1.pooler.supabase.com
 * Directory: ./sql
 * Files:     6 found
 * ```
 */
export function renderKeyValue(
  pairs: Array<{ key: string; value: string }>,
  options: { separator?: string; keyWidth?: number } = {}
): string {
  const { separator = ':', keyWidth } = options;

  // Calculate max key width
  const maxKeyLen = keyWidth ?? Math.max(...pairs.map((p) => p.key.length));

  return pairs
    .map((pair) => {
      const paddedKey = pair.key.padEnd(maxKeyLen);
      return `${c.label(paddedKey)}${c.muted(separator)} ${c.value(pair.value)}`;
    })
    .join('\n');
}

/**
 * Renders a file list with status indicators
 *
 * @example
 * ```
 *   01_extensions.sql     ✓ 12ms
 *   02_tables.sql         ✓ 45ms
 *   03_functions.sql      ● running
 * ```
 */
export function renderFileStatus(
  files: Array<{
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    duration?: number;
    error?: string;
  }>,
  options: { nameWidth?: number } = {}
): string {
  const maxNameLen = options.nameWidth ?? Math.max(...files.map((f) => f.name.length));

  return files
    .map((file) => {
      const paddedName = file.name.padEnd(maxNameLen);
      let statusStr: string;

      switch (file.status) {
        case 'pending':
          statusStr = c.muted(`${symbols.pending} pending`);
          break;
        case 'running':
          statusStr = c.primary(`${symbols.running} running`);
          break;
        case 'success':
          statusStr = c.success(`${symbols.success} ${file.duration}ms`);
          break;
        case 'error':
          statusStr = c.error(`${symbols.error} failed`);
          break;
      }

      return `  ${paddedName}  ${statusStr}`;
    })
    .join('\n');
}
