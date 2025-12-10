/**
 * Error handling module
 *
 * Provides comprehensive error detection, analysis, and formatting
 * for database connection errors. Built following SOLID principles.
 *
 * @example Basic usage
 * ```ts
 * import { getConnectionErrorHelp, formatConnectionErrorHelp } from './errors';
 *
 * try {
 *   await connect();
 * } catch (error) {
 *   const help = getConnectionErrorHelp(error, databaseUrl);
 *   console.error(formatConnectionErrorHelp(help));
 * }
 * ```
 *
 * @example Advanced usage with custom handler
 * ```ts
 * import { ConnectionErrorHandler, JsonErrorFormatter } from './errors';
 *
 * const handler = new ConnectionErrorHandler({
 *   formatter: new JsonErrorFormatter({ pretty: true }),
 * });
 *
 * const help = handler.getHelp(error, { databaseUrl });
 * console.log(handler.format(help));
 * ```
 */

// Types
export type {
  ConnectionContext,
  ErrorHelp,
  ErrorDetector,
  ErrorFormatter,
  ErrorDetectorRegistry,
} from './types.js';

// Main error handler
export {
  ConnectionErrorHandler,
  getConnectionErrorHelp,
  formatConnectionErrorHelp,
} from './error-handler.js';
export type { ErrorHandlerOptions } from './error-handler.js';

// Registry
export { DefaultErrorDetectorRegistry, createDefaultRegistry } from './registry.js';

// Formatters
export {
  ConsoleErrorFormatter,
  SimpleErrorFormatter,
  JsonErrorFormatter,
  MarkdownErrorFormatter,
  createDefaultFormatter,
} from './formatters.js';

// Detectors (for extension)
export { BaseErrorDetector } from './detectors/base-detector.js';
export { DnsDirectConnectionDetector } from './detectors/dns-direct-connection-detector.js';
export { DnsGenericDetector } from './detectors/dns-generic-detector.js';
export { ConnectionRefusedDetector } from './detectors/connection-refused-detector.js';
export { ConnectionTimeoutDetector } from './detectors/connection-timeout-detector.js';
export { AuthenticationDetector } from './detectors/authentication-detector.js';
export { SslDetector } from './detectors/ssl-detector.js';
export { PreparedStatementDetector } from './detectors/prepared-statement-detector.js';
export { DatabaseNotFoundDetector } from './detectors/database-not-found-detector.js';
export { TooManyConnectionsDetector } from './detectors/too-many-connections-detector.js';
export { InvalidUrlDetector } from './detectors/invalid-url-detector.js';
