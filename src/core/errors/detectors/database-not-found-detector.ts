/**
 * Detector for database not found errors
 *
 * Occurs when the specified database doesn't exist on the server.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class DatabaseNotFoundDetector extends BaseErrorDetector {
  readonly name = 'database-not-found';

  canHandle(error: unknown, _context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    return (
      errorMessage.includes('database') &&
      (errorMessage.includes('does not exist') || errorMessage.includes('not found'))
    );
  }

  getHelp(error: unknown, _context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);

    // Try to extract database name from error
    const dbMatch = errorMessage.match(/database "([^"]+)" does not exist/i);
    const databaseName = dbMatch ? dbMatch[1] : 'specified database';

    return this.createErrorHelp({
      title: 'Database Not Found',
      explanation:
        `The database "${databaseName}" does not exist on the server.\n` +
        'The connection was successful, but the specified database was not found.',
      suggestions: [
        'Possible causes and solutions:',
        '',
        '1. WRONG DATABASE NAME',
        '   For Supabase, the default database is "postgres"',
        '   Check your DATABASE_URL ends with /postgres',
        '',
        '   Example:',
        '   postgres://user:pass@host:5432/postgres',
        '                                 ^^^^^^^^',
        '',
        '2. TYPO IN DATABASE NAME',
        '   Check for typos in the database name',
        '   Copy a fresh connection string from Supabase Dashboard',
        '',
        '3. DATABASE WAS DELETED',
        '   If using a custom database, it may have been deleted',
        '   Check your Supabase dashboard for available databases',
        '',
        '4. ENV FILE FORMAT',
        '   Make sure the full URL is correct:',
        '   DATABASE_URL="postgres://user:pass@host:5432/postgres"',
        '   Note: The database name comes after the last /',
      ],
      originalMessage: errorMessage,
    });
  }
}
