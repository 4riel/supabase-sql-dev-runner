/**
 * Connection Error Handler
 *
 * Main entry point for error handling. Coordinates between:
 * - Error detectors (identify error type)
 * - Error formatters (format for display)
 *
 * Follows Dependency Inversion Principle - depends on abstractions
 * (interfaces), not concrete implementations.
 */

import type {
  ErrorHelp,
  ErrorFormatter,
  ErrorDetectorRegistry,
  ConnectionContext,
} from './types.js';
import { createDefaultRegistry } from './registry.js';
import { ConsoleErrorFormatter } from './formatters.js';

/**
 * Options for the ConnectionErrorHandler
 */
export interface ErrorHandlerOptions {
  /** Custom registry with detectors (optional, uses default if not provided) */
  registry?: ErrorDetectorRegistry;
  /** Custom formatter (optional, uses ConsoleErrorFormatter if not provided) */
  formatter?: ErrorFormatter;
}

/**
 * Main error handler class
 *
 * Usage:
 * ```ts
 * const handler = new ConnectionErrorHandler();
 * const help = handler.getHelp(error, { databaseUrl });
 * console.error(handler.format(help));
 * ```
 */
export class ConnectionErrorHandler {
  private readonly registry: ErrorDetectorRegistry;
  private readonly formatter: ErrorFormatter;

  constructor(options: ErrorHandlerOptions = {}) {
    this.registry = options.registry ?? createDefaultRegistry();
    this.formatter = options.formatter ?? new ConsoleErrorFormatter();
  }

  /**
   * Analyze an error and get help information
   *
   * @param error - The error to analyze
   * @param context - Connection context (URL, etc.)
   * @returns ErrorHelp object with analysis and suggestions
   */
  getHelp(error: unknown, context: ConnectionContext = {}): ErrorHelp {
    const detector = this.registry.findDetector(error, context);

    if (detector) {
      return detector.getHelp(error, context);
    }

    // No detector found - return generic error
    return this.createGenericError(error);
  }

  /**
   * Format error help for display
   *
   * @param help - The ErrorHelp to format
   * @returns Formatted string
   */
  format(help: ErrorHelp): string {
    return this.formatter.format(help);
  }

  /**
   * Convenience method: analyze and format in one call
   *
   * @param error - The error to handle
   * @param context - Connection context
   * @returns Formatted error string
   */
  handleError(error: unknown, context: ConnectionContext = {}): string {
    const help = this.getHelp(error, context);
    return this.format(help);
  }

  /**
   * Check if an error is a known connection error
   *
   * @param error - The error to check
   * @param context - Connection context
   * @returns true if error is recognized
   */
  isKnownError(error: unknown, context: ConnectionContext = {}): boolean {
    return this.registry.findDetector(error, context) !== undefined;
  }

  /**
   * Get the registry (for advanced usage)
   */
  getRegistry(): ErrorDetectorRegistry {
    return this.registry;
  }

  /**
   * Create generic error response when no detector matches
   */
  private createGenericError(error: unknown): ErrorHelp {
    const message = error instanceof Error ? error.message : String(error);

    return {
      isKnownError: false,
      title: 'Connection Error',
      explanation: message,
      suggestions: [
        'This error was not recognized. Here are some general suggestions:',
        '',
        '1. Check your DATABASE_URL is correct',
        '2. Verify the database server is running',
        '3. Check your network connection',
        '4. Try copying a fresh connection string from Supabase Dashboard > Connect',
        '',
        'If using Supabase, make sure to use Session Pooler (not Direct Connection)',
        'for best compatibility.',
      ],
      docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
      originalMessage: message,
    };
  }
}

// ============================================================================
// Convenience functions for simple usage
// ============================================================================

/** Singleton instance for convenience functions */
let defaultHandler: ConnectionErrorHandler | null = null;

/**
 * Get or create the default error handler
 */
function getDefaultHandler(): ConnectionErrorHandler {
  if (!defaultHandler) {
    defaultHandler = new ConnectionErrorHandler();
  }
  return defaultHandler;
}

/**
 * Analyze a connection error and get help
 *
 * @param error - The error to analyze
 * @param databaseUrl - The database URL that was used (optional)
 * @returns ErrorHelp object
 */
export function getConnectionErrorHelp(
  error: unknown,
  databaseUrl?: string
): ErrorHelp {
  return getDefaultHandler().getHelp(error, { databaseUrl });
}

/**
 * Format error help for console output
 *
 * @param help - The ErrorHelp to format
 * @returns Formatted string
 */
export function formatConnectionErrorHelp(help: ErrorHelp): string {
  return getDefaultHandler().format(help);
}

