/**
 * Detector for connection refused errors
 *
 * Occurs when the server actively refuses the connection,
 * usually due to wrong port, firewall, or server not running.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class ConnectionRefusedDetector extends BaseErrorDetector {
  readonly name = 'connection-refused';

  canHandle(error: unknown, _context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error);
    const errorCode = this.getErrorCode(error);

    return errorCode === 'ECONNREFUSED' || errorMessage.includes('ECONNREFUSED');
  }

  getHelp(error: unknown, context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);
    const isPooler = this.isPoolerConnection(context.databaseUrl);

    const suggestions = [
      'The database server actively refused the connection.',
      '',
      'Possible causes and solutions:',
      '',
      '1. WRONG PORT NUMBER',
    ];

    if (isPooler) {
      suggestions.push(
        '   For Supabase Pooler:',
        '   - Session Pooler: port 5432',
        '   - Transaction Pooler: port 6543',
        '   Check your connection string has the correct port.'
      );
    } else {
      suggestions.push(
        '   - Verify the port number in your DATABASE_URL',
        '   - Default PostgreSQL port is 5432'
      );
    }

    suggestions.push(
      '',
      '2. IP NOT ALLOWED (Supabase)',
      '   - Go to Supabase Dashboard > Settings > Database > Network',
      '   - Add your IP address to the allowlist',
      '   - Or enable "Allow all IPs" for development',
      '',
      '3. SERVER NOT RUNNING',
      '   - If using local PostgreSQL, ensure it is running',
      '   - Check server status: pg_isready -h localhost -p 5432',
      '',
      '4. FIREWALL BLOCKING',
      '   - Check if firewall is blocking outbound connections',
      '   - Port 5432 and 6543 need to be accessible',
      '',
      '5. ENV FILE FORMAT',
      '   - Ensure DATABASE_URL is properly quoted:',
      '     DATABASE_URL="postgres://..."'
    );

    return this.createErrorHelp({
      title: 'Connection Refused',
      explanation: 'The database server refused the connection.',
      suggestions,
      docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
      originalMessage: errorMessage,
    });
  }
}
