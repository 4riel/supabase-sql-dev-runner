import { describe, it, expect } from 'vitest';
import {
  parseDatabaseUrl,
  maskPassword,
  validateDatabaseUrl,
  getConnectionErrorHelp,
  formatConnectionErrorHelp,
} from '../src/core/connection.js';

describe('parseDatabaseUrl', () => {
  it('should parse a valid Supabase URL', () => {
    const url = 'postgres://postgres.abc123:mypassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
    const config = parseDatabaseUrl(url);

    expect(config.host).toBe('aws-0-us-east-1.pooler.supabase.com');
    expect(config.port).toBe(5432);
    expect(config.database).toBe('postgres');
    expect(config.user).toBe('postgres.abc123');
    expect(config.password).toBe('mypassword');
    expect(config.ssl).toEqual({ rejectUnauthorized: false });
  });

  it('should parse URL with default port', () => {
    const url = 'postgres://user:pass@localhost/mydb';
    const config = parseDatabaseUrl(url);

    expect(config.port).toBe(5432);
  });

  it('should parse URL with special characters in password', () => {
    const url = 'postgres://user:p%40ss%3Dword@localhost:5432/db';
    const config = parseDatabaseUrl(url);

    expect(config.password).toBe('p@ss=word');
  });

  it('should handle custom SSL option', () => {
    const url = 'postgres://user:pass@localhost/db';
    const config = parseDatabaseUrl(url, false);

    expect(config.ssl).toBe(false);
  });

  it('should throw on invalid URL', () => {
    expect(() => parseDatabaseUrl('not-a-url')).toThrow('Invalid database URL format');
  });

  it('should throw on missing hostname', () => {
    expect(() => parseDatabaseUrl('postgres://:pass@/db')).toThrow();
  });
});

describe('maskPassword', () => {
  it('should mask password in URL', () => {
    const url = 'postgres://user:secretpassword@localhost:5432/db';
    const masked = maskPassword(url);

    expect(masked).toBe('postgres://user:***@localhost:5432/db');
  });

  it('should handle URL without password', () => {
    const url = 'postgres://user@localhost:5432/db';
    const masked = maskPassword(url);

    expect(masked).toBe('postgres://user@localhost:5432/db');
  });

  it('should handle invalid URL gracefully', () => {
    const url = 'invalid://user:pass@somewhere';
    const masked = maskPassword(url);

    expect(masked).toBe('invalid://user:***@somewhere');
  });
});

describe('validateDatabaseUrl', () => {
  it('should return URL if valid', () => {
    const url = 'postgres://user:pass@localhost/db';
    const result = validateDatabaseUrl(url);

    expect(result).toBe(url);
  });

  it('should throw if URL is undefined', () => {
    expect(() => validateDatabaseUrl(undefined)).toThrow('DATABASE_URL is required');
  });

  it('should throw if URL is empty string', () => {
    expect(() => validateDatabaseUrl('')).toThrow('DATABASE_URL is required');
  });
});

describe('getConnectionErrorHelp', () => {
  it('should detect DNS error for Direct Connection (IPv6 issue)', () => {
    const error = new Error('getaddrinfo ENOTFOUND db.abc123.supabase.co');
    (error as NodeJS.ErrnoException).code = 'ENOTFOUND';
    const databaseUrl = 'postgres://postgres:pass@db.abc123.supabase.co:5432/postgres';

    const help = getConnectionErrorHelp(error, databaseUrl);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toContain('Direct Connection');
    expect(help.title).toContain('IPv6');
    expect(help.explanation).toContain('IPv6');
    expect(help.suggestions.some(s => s.includes('Session Pooler'))).toBe(true);
    expect(help.docsUrl).toBeDefined();
  });

  it('should detect generic DNS error', () => {
    const error = new Error('getaddrinfo ENOTFOUND somehost.example.com');
    (error as NodeJS.ErrnoException).code = 'ENOTFOUND';

    const help = getConnectionErrorHelp(error);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toBe('DNS Resolution Failed');
    expect(help.explanation).toContain('somehost.example.com');
  });

  it('should detect connection refused error', () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:5432');
    (error as NodeJS.ErrnoException).code = 'ECONNREFUSED';

    const help = getConnectionErrorHelp(error);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toBe('Connection Refused');
    expect(help.suggestions.some(s => s.toLowerCase().includes('port'))).toBe(true);
  });

  it('should detect connection timeout', () => {
    const error = new Error('connect ETIMEDOUT');
    (error as NodeJS.ErrnoException).code = 'ETIMEDOUT';

    const help = getConnectionErrorHelp(error);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toBe('Connection Timeout');
  });

  it('should detect authentication failure', () => {
    const error = new Error('password authentication failed for user "postgres"');

    const help = getConnectionErrorHelp(error);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toBe('Authentication Failed');
    expect(help.suggestions.some(s => s.toLowerCase().includes('password'))).toBe(true);
  });

  it('should detect SSL error', () => {
    const error = new Error('SSL connection required');

    const help = getConnectionErrorHelp(error);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toBe('SSL Connection Error');
    expect(help.docsUrl).toContain('ssl');
  });

  it('should detect prepared statement error on Transaction Pooler', () => {
    const error = new Error('prepared statement "s1" already exists');
    const databaseUrl = 'postgres://postgres.abc123:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

    const help = getConnectionErrorHelp(error, databaseUrl);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toContain('Prepared Statement');
    expect(help.suggestions.some(s => s.includes('5432'))).toBe(true);
  });

  it('should detect database not found error', () => {
    const error = new Error('database "mydb" does not exist');

    const help = getConnectionErrorHelp(error);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toBe('Database Not Found');
  });

  it('should detect too many connections error', () => {
    const error = new Error('too many connections for role');

    const help = getConnectionErrorHelp(error);

    expect(help.isKnownError).toBe(true);
    expect(help.title).toBe('Too Many Connections');
  });

  it('should return generic error for unknown errors', () => {
    const error = new Error('Some completely unknown error');

    const help = getConnectionErrorHelp(error);

    expect(help.isKnownError).toBe(false);
    expect(help.title).toBe('Connection Error');
    expect(help.explanation).toBe('Some completely unknown error');
  });
});

describe('formatConnectionErrorHelp', () => {
  it('should format help with all fields', () => {
    const help = {
      isKnownError: true,
      title: 'Test Error',
      explanation: 'This is a test',
      suggestions: ['Try this', 'Or this'],
      docsUrl: 'https://example.com/docs',
    };

    const formatted = formatConnectionErrorHelp(help);

    expect(formatted).toContain('Test Error');
    expect(formatted).toContain('This is a test');
    expect(formatted).toContain('Try this');
    expect(formatted).toContain('Or this');
    expect(formatted).toContain('https://example.com/docs');
    expect(formatted).toContain('═'); // Border characters
  });

  it('should format help without docsUrl', () => {
    const help = {
      isKnownError: true,
      title: 'Test Error',
      explanation: 'This is a test',
      suggestions: [],
    };

    const formatted = formatConnectionErrorHelp(help);

    expect(formatted).toContain('Test Error');
    expect(formatted).not.toContain('Documentation:');
  });
});
