/**
 * Detector for too many connections errors
 *
 * Occurs when the database has reached its maximum connection limit.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class TooManyConnectionsDetector extends BaseErrorDetector {
  readonly name = 'too-many-connections';

  canHandle(error: unknown, _context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    return (
      errorMessage.includes('too many connections') ||
      errorMessage.includes('connection limit') ||
      errorMessage.includes('max_connections') ||
      errorMessage.includes('remaining connection slots')
    );
  }

  getHelp(error: unknown, context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);
    const isDirectConnection = this.isDirectConnection(context.databaseUrl);
    const isTransactionPooler = this.isTransactionPooler(context.databaseUrl);

    const suggestions = [
      'The database has reached its maximum number of connections.',
      '',
      'Possible causes and solutions:',
      '',
      '1. TOO MANY OPEN CONNECTIONS',
      '   - Close unused database connections',
      '   - Check for connection leaks in your code',
      '   - Make sure connections are properly closed after use',
    ];

    if (isDirectConnection) {
      suggestions.push(
        '',
        '2. USE CONNECTION POOLER',
        '   You are using Direct Connection, which doesn\'t pool connections.',
        '   Switch to Session Pooler for better connection management:',
        '   - Go to Supabase Dashboard > Connect > Session Pooler',
        '   - Copy the new connection string'
      );
    }

    if (!isTransactionPooler) {
      suggestions.push(
        '',
        `${isDirectConnection ? '3' : '2'}. USE TRANSACTION POOLER FOR HIGH CONCURRENCY`,
        '   If you have many short-lived connections (serverless functions),',
        '   consider using Transaction Pooler (port 6543) which allows more',
        '   concurrent connections.'
      );
    }

    suggestions.push(
      '',
      `${isDirectConnection ? '4' : isTransactionPooler ? '2' : '3'}. UPGRADE SUPABASE PLAN`,
      '   Higher Supabase plans have higher connection limits:',
      '   - Free: 60 connections',
      '   - Pro: 200 connections',
      '   - Team: 300 connections',
      '',
      `${isDirectConnection ? '5' : isTransactionPooler ? '3' : '4'}. WAIT AND RETRY`,
      '   The issue may be temporary.',
      '   Wait a few seconds and try again.'
    );

    return this.createErrorHelp({
      title: 'Too Many Connections',
      explanation:
        'The database has reached its maximum connection limit.\n' +
        'No more connections can be established until some are closed.',
      suggestions,
      docsUrl: 'https://supabase.com/docs/guides/database/connection-management',
      originalMessage: errorMessage,
    });
  }
}
