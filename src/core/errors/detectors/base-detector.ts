/**
 * Base class for error detectors
 * Provides common utilities for error analysis
 */

import type { ErrorDetector, ErrorHelp, ConnectionContext } from '../types.js';

/**
 * Abstract base class for error detectors
 * Provides utility methods for common error analysis tasks
 */
export abstract class BaseErrorDetector implements ErrorDetector {
  abstract readonly name: string;
  abstract canHandle(error: unknown, context: ConnectionContext): boolean;
  abstract getHelp(error: unknown, context: ConnectionContext): ErrorHelp;

  /**
   * Extract error message from unknown error
   */
  protected getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  /**
   * Extract error code from Node.js errors
   */
  protected getErrorCode(error: unknown): string | undefined {
    if (error instanceof Error) {
      return (error as NodeJS.ErrnoException).code;
    }
    return undefined;
  }

  /**
   * Check if URL is a Supabase Direct Connection
   */
  protected isDirectConnection(databaseUrl?: string): boolean {
    if (!databaseUrl) return false;
    return databaseUrl.includes('db.') && databaseUrl.includes('.supabase.co');
  }

  /**
   * Check if URL is using Supabase Pooler
   */
  protected isPoolerConnection(databaseUrl?: string): boolean {
    if (!databaseUrl) return false;
    return databaseUrl.includes('pooler.supabase.com');
  }

  /**
   * Check if URL is using Transaction Pooler (port 6543)
   */
  protected isTransactionPooler(databaseUrl?: string): boolean {
    if (!databaseUrl) return false;
    return this.isPoolerConnection(databaseUrl) && databaseUrl.includes(':6543');
  }

  /**
   * Check if URL is using Session Pooler (port 5432 on pooler)
   */
  protected isSessionPooler(databaseUrl?: string): boolean {
    if (!databaseUrl) return false;
    return this.isPoolerConnection(databaseUrl) && databaseUrl.includes(':5432');
  }

  /**
   * Extract hostname from error message
   */
  protected extractHostnameFromError(errorMessage: string): string | undefined {
    const match = errorMessage.match(/ENOTFOUND\s+(\S+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract project reference from Supabase URL
   */
  protected extractProjectRef(databaseUrl?: string): string | undefined {
    if (!databaseUrl) return undefined;

    // Direct connection: db.PROJECT_REF.supabase.co
    const directMatch = databaseUrl.match(/db\.([^.]+)\.supabase\.co/);
    if (directMatch) return directMatch[1];

    // Pooler connection: postgres.PROJECT_REF:password@
    const poolerMatch = databaseUrl.match(/postgres\.([^:@]+)[:|@]/);
    if (poolerMatch) return poolerMatch[1];

    return undefined;
  }

  /**
   * Create a base ErrorHelp with common defaults
   */
  protected createErrorHelp(
    partial: Omit<ErrorHelp, 'isKnownError'> & { isKnownError?: boolean }
  ): ErrorHelp {
    return {
      isKnownError: true,
      ...partial,
    };
  }
}
