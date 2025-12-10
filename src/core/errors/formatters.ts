/**
 * Error Formatters
 *
 * Responsible for converting ErrorHelp objects to display formats.
 * Follows Dependency Inversion Principle - high-level modules depend
 * on abstractions (ErrorFormatter interface), not concrete implementations.
 */

import type { ErrorHelp, ErrorFormatter } from './types.js';

/**
 * Console formatter with box drawing characters
 * Creates a visually distinct error message for terminal output
 */
export class ConsoleErrorFormatter implements ErrorFormatter {
  private readonly borderChar: string;
  private readonly width: number;

  constructor(options: { borderChar?: string; width?: number } = {}) {
    this.borderChar = options.borderChar ?? '═';
    this.width = options.width ?? 70;
  }

  format(help: ErrorHelp): string {
    const lines: string[] = [];
    const border = this.borderChar.repeat(this.width);

    // Header
    lines.push('');
    lines.push(border);
    lines.push(this.centerText(help.title, this.width));
    lines.push(border);
    lines.push('');

    // Explanation
    lines.push(help.explanation);
    lines.push('');

    // Suggestions
    if (help.suggestions.length > 0) {
      for (const suggestion of help.suggestions) {
        lines.push(suggestion);
      }
      lines.push('');
    }

    // Documentation link
    if (help.docsUrl) {
      lines.push(`📚 Documentation: ${help.docsUrl}`);
      lines.push('');
    }

    // Footer
    lines.push(border);

    return lines.join('\n');
  }

  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }
}

/**
 * Simple text formatter without decorations
 * Useful for logging or non-terminal output
 */
export class SimpleErrorFormatter implements ErrorFormatter {
  format(help: ErrorHelp): string {
    const lines: string[] = [];

    lines.push(`ERROR: ${help.title}`);
    lines.push('');
    lines.push(help.explanation);
    lines.push('');

    if (help.suggestions.length > 0) {
      lines.push('Suggestions:');
      for (const suggestion of help.suggestions) {
        if (suggestion.trim()) {
          lines.push(`  ${suggestion}`);
        }
      }
      lines.push('');
    }

    if (help.docsUrl) {
      lines.push(`Documentation: ${help.docsUrl}`);
    }

    return lines.join('\n');
  }
}

/**
 * JSON formatter for structured output
 * Useful for programmatic error handling or logging systems
 */
export class JsonErrorFormatter implements ErrorFormatter {
  private readonly pretty: boolean;

  constructor(options: { pretty?: boolean } = {}) {
    this.pretty = options.pretty ?? false;
  }

  format(help: ErrorHelp): string {
    const output = {
      error: {
        title: help.title,
        explanation: help.explanation,
        suggestions: help.suggestions.filter((s) => s.trim()),
        documentation: help.docsUrl,
        originalMessage: help.originalMessage,
      },
    };

    return this.pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
  }
}

/**
 * Markdown formatter for documentation or issue reporting
 */
export class MarkdownErrorFormatter implements ErrorFormatter {
  format(help: ErrorHelp): string {
    const lines: string[] = [];

    lines.push(`## ❌ ${help.title}`);
    lines.push('');
    lines.push(help.explanation);
    lines.push('');

    if (help.suggestions.length > 0) {
      lines.push('### Suggested Solutions');
      lines.push('');
      lines.push('```');
      for (const suggestion of help.suggestions) {
        lines.push(suggestion);
      }
      lines.push('```');
      lines.push('');
    }

    if (help.docsUrl) {
      lines.push(`### Documentation`);
      lines.push('');
      lines.push(`📚 [View Documentation](${help.docsUrl})`);
      lines.push('');
    }

    if (help.originalMessage) {
      lines.push('### Original Error');
      lines.push('');
      lines.push('```');
      lines.push(help.originalMessage);
      lines.push('```');
    }

    return lines.join('\n');
  }
}

/**
 * Factory function to create the default formatter
 */
export function createDefaultFormatter(): ErrorFormatter {
  return new ConsoleErrorFormatter();
}
