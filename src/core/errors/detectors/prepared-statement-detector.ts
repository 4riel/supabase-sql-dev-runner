/**
 * Detector for prepared statement errors on Transaction Pooler
 *
 * Transaction Pooler (port 6543) does not support prepared statements.
 * This error is rare with this package since node-postgres doesn't use
 * prepared statements by default.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class PreparedStatementDetector extends BaseErrorDetector {
  readonly name = 'prepared-statement';

  canHandle(error: unknown, context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    const isPreparedStatementError =
      errorMessage.includes('prepared statement') ||
      errorMessage.includes('prepared_statement');

    // Only flag as known error if using Transaction Pooler
    return isPreparedStatementError && this.isTransactionPooler(context.databaseUrl);
  }

  getHelp(error: unknown, context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);
    const projectRef = this.extractProjectRef(context.databaseUrl) || 'YOUR_PROJECT_REF';

    return this.createErrorHelp({
      title: 'Prepared Statement Error (Transaction Pooler)',
      explanation:
        'You are using Transaction Pooler (port 6543), which does NOT support prepared statements.\n\n' +
        'Transaction Pooler shares database connections between clients, so prepared statements\n' +
        'from one client may conflict with another.',
      suggestions: [
        'SOLUTION: Switch to Session Pooler (port 5432)',
        '',
        'Change your connection string port from 6543 to 5432:',
        '',
        'FROM (Transaction Pooler - port 6543):',
        `  postgres://postgres.${projectRef}:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres`,
        '',
        'TO (Session Pooler - port 5432):',
        `  postgres://postgres.${projectRef}:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres`,
        '',
        'Session Pooler supports:',
        '  - Prepared statements',
        '  - Long-running transactions',
        '  - Full PostgreSQL compatibility',
        '',
        'Transaction Pooler (port 6543) is only recommended for:',
        '  - Serverless functions with very short queries',
        '  - High-concurrency scenarios with simple queries',
        '',
        'NOTE: This package uses node-postgres which doesn\'t use prepared',
        'statements by default, so this error is unusual. You may have',
        'custom code that explicitly creates prepared statements.',
      ],
      docsUrl:
        'https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL',
      originalMessage: errorMessage,
    });
  }
}
