/**
 * Error Detector Registry
 *
 * Manages a collection of error detectors and finds the appropriate one
 * for a given error. Follows Open/Closed Principle - open for extension
 * (adding new detectors) but closed for modification.
 */

import type { ErrorDetector, ErrorDetectorRegistry, ConnectionContext } from './types.js';
import { DnsDirectConnectionDetector } from './detectors/dns-direct-connection-detector.js';
import { DnsGenericDetector } from './detectors/dns-generic-detector.js';
import { ConnectionRefusedDetector } from './detectors/connection-refused-detector.js';
import { ConnectionTimeoutDetector } from './detectors/connection-timeout-detector.js';
import { AuthenticationDetector } from './detectors/authentication-detector.js';
import { SslDetector } from './detectors/ssl-detector.js';
import { PreparedStatementDetector } from './detectors/prepared-statement-detector.js';
import { DatabaseNotFoundDetector } from './detectors/database-not-found-detector.js';
import { TooManyConnectionsDetector } from './detectors/too-many-connections-detector.js';
import { InvalidUrlDetector } from './detectors/invalid-url-detector.js';

/**
 * Default implementation of ErrorDetectorRegistry
 *
 * Detectors are checked in order of registration, so more specific
 * detectors should be registered before more generic ones.
 */
export class DefaultErrorDetectorRegistry implements ErrorDetectorRegistry {
  private detectors: ErrorDetector[] = [];

  /**
   * Register a new error detector
   * Order matters - first registered detector that matches wins
   *
   * @param detector - The detector to register
   */
  register(detector: ErrorDetector): void {
    this.detectors.push(detector);
  }

  /**
   * Register multiple detectors at once
   *
   * @param detectors - Array of detectors to register
   */
  registerAll(detectors: ErrorDetector[]): void {
    for (const detector of detectors) {
      this.register(detector);
    }
  }

  /**
   * Find a detector that can handle the given error
   *
   * @param error - The error to find a detector for
   * @param context - Additional context about the connection
   * @returns The first matching detector, or undefined if none found
   */
  findDetector(error: unknown, context: ConnectionContext): ErrorDetector | undefined {
    for (const detector of this.detectors) {
      if (detector.canHandle(error, context)) {
        return detector;
      }
    }
    return undefined;
  }

  /**
   * Get all registered detectors (readonly)
   */
  getDetectors(): readonly ErrorDetector[] {
    return [...this.detectors];
  }

  /**
   * Get count of registered detectors
   */
  get count(): number {
    return this.detectors.length;
  }

  /**
   * Check if a detector with the given name is registered
   */
  hasDetector(name: string): boolean {
    return this.detectors.some((d) => d.name === name);
  }
}

/**
 * Create a registry with all default detectors pre-registered
 * Detectors are registered in order of specificity (most specific first)
 */
export function createDefaultRegistry(): DefaultErrorDetectorRegistry {
  const registry = new DefaultErrorDetectorRegistry();

  // Register detectors in order of specificity
  // More specific detectors first, more generic ones last

  // DNS errors - specific before generic
  registry.register(new DnsDirectConnectionDetector());
  registry.register(new DnsGenericDetector());

  // Connection errors
  registry.register(new ConnectionRefusedDetector());
  registry.register(new ConnectionTimeoutDetector());

  // Authentication and authorization
  registry.register(new AuthenticationDetector());
  registry.register(new DatabaseNotFoundDetector());
  registry.register(new TooManyConnectionsDetector());

  // Protocol-specific errors
  registry.register(new SslDetector());
  registry.register(new PreparedStatementDetector());

  // URL parsing errors
  registry.register(new InvalidUrlDetector());

  return registry;
}
