/**
 * Detector for DNS resolution failures on Supabase Direct Connection
 *
 * This is the most common error users encounter when using Direct Connection,
 * which only supports IPv6. Most networks don't have IPv6 support.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class DnsDirectConnectionDetector extends BaseErrorDetector {
  readonly name = 'dns-direct-connection';

  canHandle(error: unknown, context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error);
    const errorCode = this.getErrorCode(error);

    const isDnsError =
      errorCode === 'ENOTFOUND' || errorMessage.includes('getaddrinfo ENOTFOUND');

    return isDnsError && this.isDirectConnection(context.databaseUrl);
  }

  getHelp(error: unknown, context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);
    const hostname =
      this.extractHostnameFromError(errorMessage) || context.hostname || 'unknown host';
    const projectRef = this.extractProjectRef(context.databaseUrl) || 'YOUR_PROJECT_REF';

    return this.createErrorHelp({
      title: 'DNS Resolution Failed - Direct Connection (IPv6 Only)',
      explanation:
        `Cannot resolve hostname: ${hostname}\n\n` +
        'You are using a Supabase Direct Connection, which only supports IPv6.\n' +
        'Your network likely does not support IPv6, causing the DNS lookup to fail.\n\n' +
        'This is the most common connection error with Supabase.',
      suggestions: [
        'SOLUTION: Switch to Session Pooler',
        '',
        '1. Go to your Supabase Dashboard (https://supabase.com/dashboard)',
        '2. Select your project',
        '3. Click the "Connect" button at the top',
        '4. Select "Session Pooler" (NOT "Direct Connection")',
        '5. Copy the new connection string',
        '',
        'Your connection string format will change:',
        '',
        'FROM (Direct - IPv6 only, does NOT work on most networks):',
        `  postgres://postgres:PASSWORD@db.${projectRef}.supabase.co:5432/postgres`,
        '',
        'TO (Session Pooler - works everywhere):',
        `  postgres://postgres.${projectRef}:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres`,
        '',
        'Note: The username changes from "postgres" to "postgres.PROJECT_REF"',
        '',
        'After updating your .env file, make sure the URL is wrapped in quotes:',
        '  DATABASE_URL="postgres://postgres.xxx:password@aws-0-region.pooler.supabase.com:5432/postgres"',
      ],
      docsUrl: 'https://supabase.com/docs/guides/database/connecting-to-postgres',
      originalMessage: errorMessage,
    });
  }
}
