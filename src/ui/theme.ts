/**
 * UI Theme - Colors, Symbols, and Styling Constants
 *
 * Centralized theme system following the Open/Closed principle.
 * Modify theme values here without changing components.
 */

/**
 * ANSI escape codes for terminal colors
 */
export const colors = {
  // Reset
  reset: '\x1b[0m',

  // Modifiers
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright foreground colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
} as const;

/**
 * Semantic color mappings for consistent styling
 */
export const theme = {
  // Status colors
  success: colors.green,
  error: colors.red,
  warning: colors.yellow,
  info: colors.cyan,
  muted: colors.gray,

  // UI elements
  primary: colors.cyan,
  secondary: colors.gray,
  accent: colors.magenta,
  highlight: colors.brightWhite,

  // Text styles
  title: colors.bold + colors.white,
  subtitle: colors.gray,
  label: colors.gray,
  value: colors.white,
} as const;

/**
 * Unicode symbols for visual indicators
 */
export const symbols = {
  // Status indicators
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  pending: '○',
  running: '●',

  // Arrows and pointers
  arrow: '→',
  arrowRight: '▸',
  arrowDown: '▾',
  pointer: '❯',

  // Bullets
  bullet: '•',
  dot: '·',

  // Box drawing (rounded)
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',

  // Box drawing (sharp)
  sharpTopLeft: '┌',
  sharpTopRight: '┐',
  sharpBottomLeft: '└',
  sharpBottomRight: '┘',
  sharpHorizontal: '─',
  sharpVertical: '│',
  sharpCross: '┼',
  sharpTeeRight: '├',
  sharpTeeLeft: '┤',
  sharpTeeDown: '┬',
  sharpTeeUp: '┴',

  // Misc
  ellipsis: '…',
  line: '─',
  doubleLine: '═',
} as const;

/**
 * Spinner frames for animated progress
 */
export const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

/**
 * Alternative spinner styles
 */
export const spinnerStyles = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['|', '/', '-', '\\'],
  circle: ['◐', '◓', '◑', '◒'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
} as const;

/**
 * Detect if terminal supports colors
 */
export function supportsColor(): boolean {
  // Check NO_COLOR env var (https://no-color.org/)
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }

  // Check FORCE_COLOR env var
  if (process.env.FORCE_COLOR !== undefined) {
    return true;
  }

  // Check if stdout is a TTY
  if (process.stdout.isTTY) {
    return true;
  }

  return false;
}

/**
 * Strip ANSI codes from a string
 */
export function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get visible length of string (excluding ANSI codes)
 */
export function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

/**
 * Apply color to text (respects NO_COLOR)
 */
export function colorize(text: string, color: string): string {
  if (!supportsColor()) {
    return text;
  }
  return `${color}${text}${colors.reset}`;
}

/**
 * Shorthand color functions
 */
export const c = {
  // Status
  success: (text: string) => colorize(text, theme.success),
  error: (text: string) => colorize(text, theme.error),
  warning: (text: string) => colorize(text, theme.warning),
  info: (text: string) => colorize(text, theme.info),
  muted: (text: string) => colorize(text, theme.muted),

  // UI
  primary: (text: string) => colorize(text, theme.primary),
  secondary: (text: string) => colorize(text, theme.secondary),
  accent: (text: string) => colorize(text, theme.accent),
  highlight: (text: string) => colorize(text, theme.highlight),

  // Text
  title: (text: string) => colorize(text, theme.title),
  subtitle: (text: string) => colorize(text, theme.subtitle),
  label: (text: string) => colorize(text, theme.label),
  value: (text: string) => colorize(text, theme.value),

  // Raw colors
  bold: (text: string) => colorize(text, colors.bold),
  dim: (text: string) => colorize(text, colors.dim),
  green: (text: string) => colorize(text, colors.green),
  red: (text: string) => colorize(text, colors.red),
  yellow: (text: string) => colorize(text, colors.yellow),
  cyan: (text: string) => colorize(text, colors.cyan),
  gray: (text: string) => colorize(text, colors.gray),
  white: (text: string) => colorize(text, colors.white),
} as const;
