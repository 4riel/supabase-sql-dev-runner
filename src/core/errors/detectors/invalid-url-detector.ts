/**
 * Detector for invalid database URL format errors
 *
 * Occurs when the DATABASE_URL is malformed or has invalid syntax.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class InvalidUrlDetector extends BaseErrorDetector {
  readonly name = 'invalid-url';

  canHandle(error: unknown, _context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    return (
      errorMessage.includes('invalid url') ||
      errorMessage.includes('invalid database url') ||
      errorMessage.includes('malformed url') ||
      errorMessage.includes('url parse') ||
      errorMessage.includes('invalid protocol') ||
      (error instanceof TypeError && errorMessage.includes('url'))
    );
  }

  getHelp(error: unknown, _context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);

    return this.createErrorHelp({
      title: 'Invalid Database URL Format',
      explanation:
        'The DATABASE_URL format is invalid or malformed.\n' +
        'Cannot parse the connection string.',
      suggestions: [
        'CORRECT FORMAT:',
        '  postgres://USERNAME:PASSWORD@HOST:PORT/DATABASE',
        '',
        'SUPABASE EXAMPLES:',
        '',
        'Session Pooler (recommended):',
        '  postgres://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres',
        '',
        'Direct Connection:',
        '  postgres://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres',
        '',
        'COMMON MISTAKES:',
        '',
        '1. MISSING QUOTES IN .env FILE',
        '   WRONG: DATABASE_URL=postgres://...',
        '   RIGHT: DATABASE_URL="postgres://..."',
        '',
        '2. SPACES IN THE URL',
        '   Make sure there are no spaces in the URL',
        '',
        '3. WRONG PROTOCOL',
        '   Use "postgres://" or "postgresql://"',
        '   NOT "http://" or "https://"',
        '',
        '4. SPECIAL CHARACTERS NOT ENCODED',
        '   If password contains special chars, URL encode them:',
        '   @ -> %40, # -> %23, : -> %3A',
        '',
        '5. MISSING PARTS',
        '   Make sure URL has: protocol://user:pass@host:port/database',
        '',
        'GET A FRESH CONNECTION STRING:',
        '   1. Go to Supabase Dashboard',
        '   2. Click "Connect" at the top',
        '   3. Select "Session Pooler"',
        '   4. Copy the connection string',
      ],
      docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
      originalMessage: errorMessage,
    });
  }
}
