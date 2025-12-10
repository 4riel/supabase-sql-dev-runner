/**
 * Detector for SSL/TLS connection errors
 *
 * Occurs when there are SSL handshake failures or certificate issues.
 */

import type { ErrorHelp, ConnectionContext } from '../types.js';
import { BaseErrorDetector } from './base-detector.js';

export class SslDetector extends BaseErrorDetector {
  readonly name = 'ssl';

  canHandle(error: unknown, _context: ConnectionContext): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    return (
      errorMessage.includes('ssl') ||
      errorMessage.includes('tls') ||
      errorMessage.includes('certificate') ||
      errorMessage.includes('cert') ||
      errorMessage.includes('handshake') ||
      errorMessage.includes('self signed') ||
      errorMessage.includes('unable to verify')
    );
  }

  getHelp(error: unknown, _context: ConnectionContext): ErrorHelp {
    const errorMessage = this.getErrorMessage(error);

    const isCertError =
      errorMessage.toLowerCase().includes('certificate') ||
      errorMessage.toLowerCase().includes('self signed') ||
      errorMessage.toLowerCase().includes('unable to verify');

    const suggestions = [
      'There was a problem with the SSL/TLS connection.',
      '',
      'Possible causes and solutions:',
      '',
      '1. SSL REQUIRED BUT NOT ENABLED',
      '   Supabase requires SSL connections by default.',
      '   Make sure you are NOT disabling SSL in your config:',
      '',
      '   // DON\'T do this:',
      '   ssl: false  // This will fail!',
      '',
      '   // DO this (default):',
      '   ssl: true',
      '   // or',
      '   ssl: { rejectUnauthorized: false }',
    ];

    if (isCertError) {
      suggestions.push(
        '',
        '2. CERTIFICATE VERIFICATION FAILED',
        '   If you see "self signed" or "unable to verify" errors:',
        '',
        '   Use this SSL configuration:',
        '   ssl: { rejectUnauthorized: false }',
        '',
        '   This is the default in this package and should work.',
        '   If you overrode it, try removing your custom SSL config.'
      );
    }

    suggestions.push(
      '',
      `${isCertError ? '3' : '2'}. NETWORK INTERCEPTING SSL`,
      '   - Corporate proxies may intercept SSL traffic',
      '   - VPNs might interfere with SSL connections',
      '   - Try disabling VPN/proxy temporarily',
      '',
      `${isCertError ? '4' : '3'}. OUTDATED NODE.JS`,
      '   - Very old Node.js versions may have SSL issues',
      '   - This package requires Node.js 18+',
      '   - Check your version: node --version'
    );

    return this.createErrorHelp({
      title: 'SSL Connection Error',
      explanation:
        'There was a problem establishing a secure SSL connection.\n' +
        'Supabase requires SSL for all database connections.',
      suggestions,
      docsUrl: 'https://supabase.com/docs/guides/platform/ssl-enforcement',
      originalMessage: errorMessage,
    });
  }
}
