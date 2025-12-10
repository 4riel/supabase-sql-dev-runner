/**
 * Database connection utilities
 *
 * This module provides utilities for parsing, validating, and handling
 * database connection strings and errors.
 */

import type { ConnectionConfig } from '../types.js';

// Re-export from the new error handling system for backwards compatibility
export {
  getConnectionErrorHelp,
  formatConnectionErrorHelp,
  ConnectionErrorHandler,
} from './errors/index.js';

// Re-export types for backwards compatibility
export type { ErrorHelp as ConnectionErrorHelp } from './errors/index.js';

/**
 * Extracts a human-readable error message from an unknown error
 *
 * @param error - Unknown error value
 * @returns Error message string
 *
 * @example
 * ```ts
 * try {
 *   await someOperation();
 * } catch (error) {
 *   console.error(getErrorMessage(error));
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Parses a PostgreSQL/Supabase database URL into connection config
 *
 * @param databaseUrl - PostgreSQL connection URL
 * @param sslOption - SSL configuration option
 * @returns Parsed connection configuration
 * @throws Error if URL format is invalid
 *
 * @example
 * ```ts
 * const config = parseDatabaseUrl(
 *   'postgres://user:pass@host:5432/dbname'
 * );
 * ```
 */
export function parseDatabaseUrl(
  databaseUrl: string,
  sslOption: boolean | { rejectUnauthorized: boolean } = true
): ConnectionConfig {
  try {
    const url = new URL(databaseUrl);

    if (!url.hostname) {
      throw new Error('Missing hostname in database URL');
    }

    if (!url.username) {
      throw new Error('Missing username in database URL');
    }

    return {
      host: url.hostname,
      port: parseInt(url.port, 10) || 5432,
      database: url.pathname.slice(1) || 'postgres',
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: sslOption === true ? { rejectUnauthorized: false } : sslOption,
    };
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Invalid database URL format. Expected: postgres://user:password@host:port/database\nReceived: ${maskPassword(databaseUrl)}`
      );
    }
    throw error;
  }
}

/**
 * Masks the password in a database URL for safe logging
 *
 * @param url - Database URL that may contain a password
 * @returns URL with password replaced by '***'
 *
 * @example
 * ```ts
 * maskPassword('postgres://user:secret@localhost/db');
 * // Returns: 'postgres://user:***@localhost/db'
 * ```
 */
export function maskPassword(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    // If URL parsing fails, try regex replacement
    return url.replace(/:([^@:]+)@/, ':***@');
  }
}

/**
 * Validates that a database URL is provided
 *
 * @param databaseUrl - Database URL to validate
 * @returns The validated database URL
 * @throws Error if database URL is undefined or empty
 *
 * @example
 * ```ts
 * const url = validateDatabaseUrl(process.env.DATABASE_URL);
 * // Throws if DATABASE_URL is not set
 * ```
 */
export function validateDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL is required.\n\n' +
        'Please provide it via:\n' +
        '  - Environment variable: DATABASE_URL\n' +
        '  - Config option: { databaseUrl: "postgres://..." }\n\n' +
        'Format: postgres://user:password@host:port/database'
    );
  }

  return databaseUrl;
}
