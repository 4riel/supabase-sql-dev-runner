/**
 * UI Module - Public Exports
 *
 * Central export point for all UI components and utilities.
 *
 * This module provides:
 * - Theme system (colors, symbols, styling utilities)
 * - Reusable UI components (banner, box, table, spinner)
 * - UIRenderer facade for coordinated console output
 *
 * @example
 * ```ts
 * import { c, symbols, renderBanner, createUIRenderer } from 'supabase-sql-dev-runner/ui';
 *
 * // Use color utilities
 * console.log(c.success('Operation completed'));
 *
 * // Render a banner
 * console.log(renderBanner({ name: 'my-app', version: '1.0.0' }));
 *
 * // Use the full renderer
 * const ui = createUIRenderer({ name: 'my-app', version: '1.0.0' });
 * ui.banner();
 * ui.info('Starting...');
 * ```
 *
 * @packageDocumentation
 */

// Theme and styling
export {
  colors,
  theme,
  symbols,
  spinnerFrames,
  spinnerStyles,
  supportsColor,
  stripAnsi,
  visibleLength,
  colorize,
  c,
} from './theme.js';

// Components - Banner
export { renderBanner, renderMinimalBanner } from './components/banner.js';
export type { BannerOptions } from './components/banner.js';

// Components - Box
export { renderBox, renderDivider, renderSectionHeader } from './components/box.js';
export type { BoxStyle, BoxOptions } from './components/box.js';

// Components - Table
export {
  renderTable,
  renderList,
  renderKeyValue,
  renderFileStatus,
} from './components/table.js';
export type { Column, TableOptions } from './components/table.js';

// Components - Spinner
export { createSpinner, renderProgress, renderCountdown } from './components/spinner.js';
export type { SpinnerOptions } from './components/spinner.js';

// Main renderer (facade)
export { UIRenderer, createUIRenderer } from './renderer.js';
export type {
  UIRendererOptions,
  FileResult,
  ExecutionSummaryData,
} from './renderer.js';
