/**
 * Detector for connection timeout errors
 *
 * Occurs when the connection attempt takes too long,
 * usually due to network issues or firewall silently dropping packets.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class ConnectionTimeoutDetector extends BaseErrorDetector {
  readonly name = 'connection-timeout';

  canHandle(error: unknown, _context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error);
    const errorCode = this.getErrorCode(error);

    return (
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ESOCKETTIMEDOUT' ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out')
    );
  }

  getHelp(error: unknown, context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);
    const isDirectConnection = this.isDirectConnection(context.databaseUrl);

    const suggestions = [
      'The connection attempt timed out before completing.',
      '',
      'Possible causes and solutions:',
      '',
      '1. NETWORK CONNECTIVITY',
      '   - Check your internet connection',
      '   - Try accessing other websites/services',
      '   - Restart your router if needed',
    ];

    if (isDirectConnection) {
      suggestions.push(
        '',
        '2. IPv6 ISSUES (Direct Connection)',
        '   - You are using Direct Connection which requires IPv6',
        '   - Your network may be timing out on IPv6 resolution',
        '   - SOLUTION: Switch to Session Pooler instead',
        '   - Get it from Dashboard > Connect > Session Pooler'
      );
    }

    suggestions.push(
      '',
      `${isDirectConnection ? '3' : '2'}. FIREWALL/VPN`,
      '   - Firewall may be silently dropping packets',
      '   - Try disabling VPN temporarily',
      '   - Check corporate firewall settings',
      '',
      `${isDirectConnection ? '4' : '3'}. SERVER OVERLOADED`,
      '   - The database server might be under heavy load',
      '   - Try again in a few minutes',
      '   - Check Supabase status: https://status.supabase.com',
      '',
      `${isDirectConnection ? '5' : '4'}. WRONG HOST/PORT`,
      '   - Verify your DATABASE_URL is correct',
      '   - Copy a fresh connection string from Supabase Dashboard'
    );

    return this.createErrorHelp({
      title: 'Connection Timeout',
      explanation:
        'The connection to the database timed out.\n' +
        'The server did not respond within the expected time.',
      suggestions,
      originalMessage: errorMessage,
    });
  }
}
