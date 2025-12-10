/**
 * Detector for authentication failures
 *
 * Occurs when username/password combination is rejected by the server.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class AuthenticationDetector extends BaseErrorDetector {
  readonly name = 'authentication';

  canHandle(error: unknown, _context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    return (
      errorMessage.includes('password authentication failed') ||
      errorMessage.includes('authentication failed') ||
      errorMessage.includes('invalid password') ||
      errorMessage.includes('no pg_hba.conf entry') ||
      errorMessage.includes('role') && errorMessage.includes('does not exist')
    );
  }

  getHelp(error: unknown, context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);
    const isPooler = this.isPoolerConnection(context.databaseUrl);
    const isDirectConnection = this.isDirectConnection(context.databaseUrl);
    const projectRef = this.extractProjectRef(context.databaseUrl) || 'YOUR_PROJECT_REF';

    const suggestions = [
      'The database rejected the authentication credentials.',
      '',
      'Possible causes and solutions:',
      '',
      '1. WRONG PASSWORD',
      '   - Copy a fresh connection string from Supabase Dashboard > Connect',
      '   - Make sure there are no extra spaces in the password',
      '   - Check for special characters that may need URL encoding',
      '',
      '2. WRONG USERNAME FORMAT',
    ];

    if (isPooler) {
      suggestions.push(
        `   For Pooler connections, username should be: postgres.${projectRef}`,
        '   (Note the dot between "postgres" and your project reference)'
      );
    } else if (isDirectConnection) {
      suggestions.push(
        '   For Direct connections, username should be: postgres',
        '   (Just "postgres", without the project reference)'
      );
    } else {
      suggestions.push(
        '   For Supabase:',
        '   - Pooler: postgres.PROJECT_REF',
        '   - Direct: postgres'
      );
    }

    suggestions.push(
      '',
      '3. SPECIAL CHARACTERS IN PASSWORD',
      '   If your password contains special characters, they need URL encoding:',
      '   - @ becomes %40',
      '   - # becomes %23',
      '   - : becomes %3A',
      '   - / becomes %2F',
      '   Or use a password without special characters.',
      '',
      '4. ENV FILE ISSUES',
      '   Make sure your .env file is correct:',
      '   - URL should be in quotes: DATABASE_URL="postgres://..."',
      '   - No spaces around the = sign',
      '   - No trailing spaces',
      '',
      '5. DATABASE USER NOT EXISTS',
      '   - The database user may not exist',
      '   - Try using the default "postgres" user connection string'
    );

    return this.createErrorHelp({
      title: 'Authentication Failed',
      explanation:
        'The database rejected the username/password combination.\n' +
        'This usually means the credentials are incorrect.',
      suggestions,
      originalMessage: errorMessage,
    });
  }
}
