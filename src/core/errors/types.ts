/**
 * Error handling types and interfaces
 * Following Interface Segregation Principle (ISP)
 */

/**
 * Context information about the connection attempt
 */
export interface ConnectionContext {
  /** The database URL that was used (may be undefined) */
  databaseUrl?: string;
  /** The hostname extracted from the URL */
  hostname?: string;
  /** The port number */
  port?: number;
}

/**
 * Structured error information for display
 */
export interface ErrorHelp {
  /** Whether this error was recognized and handled */
  isKnownError: boolean;
  /** Short, descriptive title for the error */
  title: string;
  /** Detailed explanation of what went wrong */
  explanation: string;
  /** List of suggested solutions or next steps */
  suggestions: string[];
  /** Optional link to relevant documentation */
  docsUrl?: string;
  /** Original error message for reference */
  originalMessage?: string;
}

/**
 * Interface for error detectors
 * Each detector is responsible for identifying ONE type of error (SRP)
 */
export interface ErrorDetector {
  /** Unique identifier for this detector */
  readonly name: string;

  /**
   * Check if this detector can handle the given error
   * @param error - The error to check
   * @param context - Additional context about the connection
   * @returns true if this detector can handle the error
   */
  canHandle(error: unknown, context: ConnectionContext): boolean;

  /**
   * Generate help information for the error
   * Should only be called if canHandle() returned true
   * @param error - The error to analyze
   * @param context - Additional context about the connection
   * @returns Structured help information
   */
  getHelp(error: unknown, context: ConnectionContext): ErrorHelp;
}

/**
 * Interface for error formatters
 * Responsible for converting ErrorHelp to display format
 */
export interface ErrorFormatter {
  /**
   * Format error help for output
   * @param help - The error help to format
   * @returns Formatted string for display
   */
  format(help: ErrorHelp): string;
}

/**
 * Interface for the error handler registry
 * Manages collection of error detectors
 */
export interface ErrorDetectorRegistry {
  /**
   * Register a new error detector
   * @param detector - The detector to register
   */
  register(detector: ErrorDetector): void;

  /**
   * Find a detector that can handle the given error
   * @param error - The error to find a detector for
   * @param context - Additional context about the connection
   * @returns The matching detector, or undefined if none found
   */
  findDetector(error: unknown, context: ConnectionContext): ErrorDetector | undefined;

  /**
   * Get all registered detectors
   */
  getDetectors(): readonly ErrorDetector[];
}
