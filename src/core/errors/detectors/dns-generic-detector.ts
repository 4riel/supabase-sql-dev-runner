/**
 * Detector for generic DNS resolution failures
 *
 * Handles DNS errors that are not specifically related to Supabase Direct Connection.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class DnsGenericDetector extends BaseErrorDetector {
  readonly name = 'dns-generic';

  canHandle(error: unknown, _context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error);
    const errorCode = this.getErrorCode(error);

    return errorCode === 'ENOTFOUND' || errorMessage.includes('getaddrinfo ENOTFOUND');
  }

  getHelp(error: unknown, context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);
    const hostname =
      this.extractHostnameFromError(errorMessage) || context.hostname || 'unknown host';

    return this.createErrorHelp({
      title: 'DNS Resolution Failed',
      explanation:
        `Cannot resolve hostname: ${hostname}\n\n` +
        'The DNS lookup failed, meaning the hostname could not be found.',
      suggestions: [
        'Possible causes and solutions:',
        '',
        '1. TYPO IN HOSTNAME',
        '   - Double-check the hostname in your DATABASE_URL',
        '   - Copy a fresh connection string from Supabase Dashboard > Connect',
        '',
        '2. NETWORK ISSUES',
        '   - Check your internet connection',
        '   - Try pinging a known host: ping google.com',
        '   - Check if your DNS server is working',
        '',
        '3. FIREWALL/VPN BLOCKING',
        '   - Try disabling VPN temporarily',
        '   - Check if corporate firewall is blocking the connection',
        '',
        '4. ENV FILE FORMAT',
        '   - Make sure your .env file has the URL in quotes:',
        '     DATABASE_URL="postgres://..."',
        '   - Check for invisible characters or line break issues',
        '',
        'For Supabase users:',
        '   - Use Session Pooler instead of Direct Connection',
        '   - Get connection string from Dashboard > Connect > Session Pooler',
      ],
      docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
      originalMessage: errorMessage,
    });
  }
}
