/**
 * CLI Validators
 *
 * Single Responsibility: Validate CLI inputs and configuration.
 * Each validator handles one specific validation concern.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FileSystem, ValidationResult } from './types.js';
import { defaultFileSystem } from './env-loader.js';

/**
 * Validator interface for extensibility
 */
export interface Validator<T> {
  validate(value: T): ValidationResult;
}

/**
 * Database URL validator
 */
export class DatabaseUrlValidator implements Validator<string | undefined> {
  validate(value: string | undefined): ValidationResult {
    if (!value || value.trim() === '') {
      return {
        valid: false,
        error: [
          'DATABASE_URL is required.',
          '',
          'Provide it via:',
          '  - Environment variable: DATABASE_URL="postgres://..."',
          '  - Command line: --database-url "postgres://..."',
          '  - Env file: Create .env with DATABASE_URL="postgres://..."',
          '',
          'Note: Wrap the URL in quotes if it contains special characters.',
          '',
          'Run with --help for more information.',
        ].join('\n'),
      };
    }

    // Basic URL format validation
    if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
      return {
        valid: false,
        error: 'DATABASE_URL must start with postgres:// or postgresql://',
      };
    }

    return { valid: true };
  }
}

/**
 * SQL directory validator
 */
export class SqlDirectoryValidator implements Validator<string> {
  constructor(private fileSystem: FileSystem = defaultFileSystem) {}

  validate(value: string): ValidationResult {
    const resolvedPath = path.resolve(value);

    if (!this.fileSystem.exists(resolvedPath)) {
      return {
        valid: false,
        error: `SQL directory not found: ${resolvedPath}`,
      };
    }

    // Check if it's actually a directory
    try {
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return {
          valid: false,
          error: `Path is not a directory: ${resolvedPath}`,
        };
      }
    } catch {
      return {
        valid: false,
        error: `Cannot access directory: ${resolvedPath}`,
      };
    }

    return { valid: true };
  }

  /**
   * Resolve the directory path
   */
  resolve(value: string): string {
    return path.resolve(value);
  }
}

/**
 * Env file validator
 */
export class EnvFileValidator implements Validator<string | undefined> {
  constructor(private fileSystem: FileSystem = defaultFileSystem) {}

  validate(value: string | undefined): ValidationResult {
    // If no env file specified, it's valid (will use default or skip)
    if (!value) {
      return { valid: true };
    }

    if (!this.fileSystem.exists(value)) {
      return {
        valid: false,
        error: `Specified env file not found: ${value}`,
      };
    }

    return { valid: true };
  }
}

/**
 * Composite validator for all CLI inputs
 */
export class CliValidator {
  private databaseUrlValidator = new DatabaseUrlValidator();
  private sqlDirectoryValidator: SqlDirectoryValidator;
  private envFileValidator: EnvFileValidator;

  constructor(fileSystem: FileSystem = defaultFileSystem) {
    this.sqlDirectoryValidator = new SqlDirectoryValidator(fileSystem);
    this.envFileValidator = new EnvFileValidator(fileSystem);
  }

  /**
   * Validate database URL
   */
  validateDatabaseUrl(url: string | undefined): ValidationResult {
    return this.databaseUrlValidator.validate(url);
  }

  /**
   * Validate SQL directory
   */
  validateSqlDirectory(directory: string): ValidationResult {
    return this.sqlDirectoryValidator.validate(directory);
  }

  /**
   * Validate env file
   */
  validateEnvFile(envFile: string | undefined): ValidationResult {
    return this.envFileValidator.validate(envFile);
  }

  /**
   * Resolve SQL directory path
   */
  resolveSqlDirectory(directory: string): string {
    return this.sqlDirectoryValidator.resolve(directory);
  }
}

