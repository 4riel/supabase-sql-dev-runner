import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  ArgParser,
  parseArgs,
  EnvLoader,
  parseEnvContent,
  loadEnvFile,
  CliValidator,
  DatabaseUrlValidator,
  SqlDirectoryValidator,
  EnvFileValidator,
  HelpDisplay,
  showHelp,
  showVersion,
  getHelpText,
  buildRunnerConfig,
  buildRunOptions,
  CLI_DEFAULTS,
} from '../src/cli/index.js';
import type { CliArgs, FileSystem, ProcessEnv, CliOutput } from '../src/cli/index.js';

// =============================================================================
// Argument Parser Tests
// =============================================================================

describe('ArgParser', () => {
  let parser: ArgParser;

  beforeEach(() => {
    parser = new ArgParser();
  });

  describe('help and version', () => {
    it('should parse -h flag', () => {
      const result = parser.parse(['-h']);
      expect(result.help).toBe(true);
    });

    it('should parse --help flag', () => {
      const result = parser.parse(['--help']);
      expect(result.help).toBe(true);
    });

    it('should parse -v flag', () => {
      const result = parser.parse(['-v']);
      expect(result.version).toBe(true);
    });

    it('should parse --version flag', () => {
      const result = parser.parse(['--version']);
      expect(result.version).toBe(true);
    });
  });

  describe('directory options', () => {
    it('should parse -d option', () => {
      const result = parser.parse(['-d', './custom/dir']);
      expect(result.sqlDirectory).toBe('./custom/dir');
    });

    it('should parse --directory option', () => {
      const result = parser.parse(['--directory', './custom/dir']);
      expect(result.sqlDirectory).toBe('./custom/dir');
    });

    it('should parse --sql-directory option', () => {
      const result = parser.parse(['--sql-directory', './custom/dir']);
      expect(result.sqlDirectory).toBe('./custom/dir');
    });

    it('should parse positional directory argument', () => {
      const result = parser.parse(['./my/sql/files']);
      expect(result.sqlDirectory).toBe('./my/sql/files');
    });

    it('should use default directory when not specified', () => {
      const result = parser.parse([]);
      expect(result.sqlDirectory).toBe('./sql');
    });
  });

  describe('database URL options', () => {
    it('should parse -u option', () => {
      const result = parser.parse(['-u', 'postgres://localhost/db']);
      expect(result.databaseUrl).toBe('postgres://localhost/db');
    });

    it('should parse --url option', () => {
      const result = parser.parse(['--url', 'postgres://localhost/db']);
      expect(result.databaseUrl).toBe('postgres://localhost/db');
    });

    it('should parse --database-url option', () => {
      const result = parser.parse(['--database-url', 'postgres://localhost/db']);
      expect(result.databaseUrl).toBe('postgres://localhost/db');
    });
  });

  describe('environment file options', () => {
    it('should parse -e option', () => {
      const result = parser.parse(['-e', '.env.local']);
      expect(result.envFile).toBe('.env.local');
    });

    it('should parse --env option', () => {
      const result = parser.parse(['--env', '.env.production']);
      expect(result.envFile).toBe('.env.production');
    });

    it('should parse --env-file option', () => {
      const result = parser.parse(['--env-file', './config/.env']);
      expect(result.envFile).toBe('./config/.env');
    });
  });

  describe('confirmation options', () => {
    it('should parse -y flag', () => {
      const result = parser.parse(['-y']);
      expect(result.skipConfirmation).toBe(true);
    });

    it('should parse --yes flag', () => {
      const result = parser.parse(['--yes']);
      expect(result.skipConfirmation).toBe(true);
    });

    it('should parse --skip-confirmation flag', () => {
      const result = parser.parse(['--skip-confirmation']);
      expect(result.skipConfirmation).toBe(true);
    });

    it('should parse --confirmation-phrase option', () => {
      const result = parser.parse(['--confirmation-phrase', 'EXECUTE']);
      expect(result.confirmationPhrase).toBe('EXECUTE');
    });

    it('should use default confirmation phrase', () => {
      const result = parser.parse([]);
      expect(result.confirmationPhrase).toBe('CONFIRM');
    });
  });

  describe('logging options', () => {
    it('should parse --verbose flag', () => {
      const result = parser.parse(['--verbose']);
      expect(result.verbose).toBe(true);
    });

    it('should parse --no-logs flag', () => {
      const result = parser.parse(['--no-logs']);
      expect(result.noLogs).toBe(true);
    });

    it('should parse --log-directory option', () => {
      const result = parser.parse(['--log-directory', './my-logs']);
      expect(result.logDirectory).toBe('./my-logs');
    });

    it('should use default log directory', () => {
      const result = parser.parse([]);
      expect(result.logDirectory).toBe('./logs');
    });
  });

  describe('execution options', () => {
    it('should parse --dry-run flag', () => {
      const result = parser.parse(['--dry-run']);
      expect(result.dryRun).toBe(true);
    });

    it('should parse --watch flag', () => {
      const result = parser.parse(['--watch']);
      expect(result.watch).toBe(true);
    });

    it('should parse -w flag', () => {
      const result = parser.parse(['-w']);
      expect(result.watch).toBe(true);
    });

    it('should parse --only option with single file', () => {
      const result = parser.parse(['--only', 'test.sql']);
      expect(result.onlyFiles).toEqual(['test.sql']);
    });

    it('should parse --only option with multiple files', () => {
      const result = parser.parse(['--only', '01_first.sql,02_second.sql,03_third.sql']);
      expect(result.onlyFiles).toEqual(['01_first.sql', '02_second.sql', '03_third.sql']);
    });

    it('should parse --skip option with single file', () => {
      const result = parser.parse(['--skip', 'seed.sql']);
      expect(result.skipFiles).toEqual(['seed.sql']);
    });

    it('should parse --skip option with multiple files', () => {
      const result = parser.parse(['--skip', 'seed.sql, test.sql']);
      expect(result.skipFiles).toEqual(['seed.sql', 'test.sql']);
    });
  });

  describe('combined options', () => {
    it('should parse multiple options together', () => {
      const result = parser.parse([
        '-d', './migrations',
        '-u', 'postgres://localhost/db',
        '-y',
        '--verbose',
        '--dry-run',
      ]);

      expect(result.sqlDirectory).toBe('./migrations');
      expect(result.databaseUrl).toBe('postgres://localhost/db');
      expect(result.skipConfirmation).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.dryRun).toBe(true);
    });

    it('should handle all flags', () => {
      const result = parser.parse([
        '-y',
        '--verbose',
        '--dry-run',
        '--no-logs',
        '-w',
      ]);

      expect(result.skipConfirmation).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.noLogs).toBe(true);
      expect(result.watch).toBe(true);
    });
  });

  describe('parseArgs convenience function', () => {
    it('should work the same as ArgParser.parse', () => {
      const result = parseArgs(['-y', '--verbose', './sql']);
      expect(result.skipConfirmation).toBe(true);
      expect(result.verbose).toBe(true);
      expect(result.sqlDirectory).toBe('./sql');
    });
  });

  describe('getSupportedFlags', () => {
    it('should return all supported flags', () => {
      const flags = parser.getSupportedFlags();
      expect(flags).toContain('-h');
      expect(flags).toContain('--help');
      expect(flags).toContain('-y');
      expect(flags).toContain('--yes');
      expect(flags).toContain('-d');
      expect(flags).toContain('--directory');
    });
  });
});

// =============================================================================
// Environment Loader Tests
// =============================================================================

describe('EnvLoader', () => {
  let testDir: string;
  let mockEnv: Map<string, string>;
  let mockProcessEnv: ProcessEnv;
  let mockFileSystem: FileSystem;
  let fileContents: Map<string, string>;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-env-test-'));
    mockEnv = new Map();
    fileContents = new Map();

    mockProcessEnv = {
      get: (key) => mockEnv.get(key),
      set: (key, value) => mockEnv.set(key, value),
    };

    mockFileSystem = {
      exists: (p) => fileContents.has(p),
      readFile: (p) => {
        const content = fileContents.get(p);
        if (!content) throw new Error('File not found');
        return content;
      },
    };
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseEnvContent', () => {
    it('should parse simple key=value pairs', () => {
      const result = parseEnvContent('KEY=value');
      expect(result.get('KEY')).toBe('value');
    });

    it('should skip comments', () => {
      const result = parseEnvContent('# comment\nKEY=value');
      expect(result.size).toBe(1);
      expect(result.get('KEY')).toBe('value');
    });

    it('should skip empty lines', () => {
      const result = parseEnvContent('\n\nKEY=value\n\n');
      expect(result.size).toBe(1);
    });

    it('should remove double quotes', () => {
      const result = parseEnvContent('KEY="quoted value"');
      expect(result.get('KEY')).toBe('quoted value');
    });

    it('should remove single quotes', () => {
      const result = parseEnvContent("KEY='single quoted'");
      expect(result.get('KEY')).toBe('single quoted');
    });

    it('should handle values with equals signs', () => {
      const result = parseEnvContent('KEY=value=with=equals');
      expect(result.get('KEY')).toBe('value=with=equals');
    });

    it('should handle multiple entries', () => {
      const result = parseEnvContent('KEY1=value1\nKEY2=value2\nKEY3=value3');
      expect(result.size).toBe(3);
      expect(result.get('KEY1')).toBe('value1');
      expect(result.get('KEY2')).toBe('value2');
      expect(result.get('KEY3')).toBe('value3');
    });
  });

  describe('EnvLoader class', () => {
    it('should load environment from file', () => {
      fileContents.set('/test/.env', 'TEST_VAR=test_value');
      const loader = new EnvLoader(mockFileSystem, mockProcessEnv);

      const result = loader.load('/test/.env');

      expect(result.success).toBe(true);
      expect(result.loadedKeys).toContain('TEST_VAR');
      expect(mockEnv.get('TEST_VAR')).toBe('test_value');
    });

    it('should not override existing env vars', () => {
      mockEnv.set('TEST_VAR', 'original');
      fileContents.set('/test/.env', 'TEST_VAR=new_value');
      const loader = new EnvLoader(mockFileSystem, mockProcessEnv);

      const result = loader.load('/test/.env');

      expect(result.success).toBe(true);
      expect(mockEnv.get('TEST_VAR')).toBe('original');
    });

    it('should return error for non-existent file', () => {
      const loader = new EnvLoader(mockFileSystem, mockProcessEnv);

      const result = loader.load('/nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should check if file exists', () => {
      fileContents.set('/test/.env', '');
      const loader = new EnvLoader(mockFileSystem, mockProcessEnv);

      expect(loader.exists('/test/.env')).toBe(true);
      expect(loader.exists('/nonexistent')).toBe(false);
    });

    it('should get environment variable', () => {
      mockEnv.set('MY_VAR', 'my_value');
      const loader = new EnvLoader(mockFileSystem, mockProcessEnv);

      expect(loader.get('MY_VAR')).toBe('my_value');
      expect(loader.get('NONEXISTENT')).toBeUndefined();
    });
  });

  describe('loadEnvFile with real file system', () => {
    it('should load from actual file', () => {
      const envFile = path.join(testDir, '.env');
      fs.writeFileSync(envFile, 'TEST_KEY=test_value');

      const result = loadEnvFile(envFile, undefined, mockProcessEnv);

      expect(result.success).toBe(true);
      expect(mockEnv.get('TEST_KEY')).toBe('test_value');
    });
  });
});

// =============================================================================
// Validators Tests
// =============================================================================

describe('Validators', () => {
  describe('DatabaseUrlValidator', () => {
    const validator = new DatabaseUrlValidator();

    it('should accept valid postgres URL', () => {
      const result = validator.validate('postgres://user:pass@localhost/db');
      expect(result.valid).toBe(true);
    });

    it('should accept valid postgresql URL', () => {
      const result = validator.validate('postgresql://user:pass@localhost/db');
      expect(result.valid).toBe(true);
    });

    it('should reject undefined', () => {
      const result = validator.validate(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('DATABASE_URL is required');
    });

    it('should reject empty string', () => {
      const result = validator.validate('');
      expect(result.valid).toBe(false);
    });

    it('should reject invalid protocol', () => {
      const result = validator.validate('mysql://user:pass@localhost/db');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('postgres://');
    });
  });

  describe('SqlDirectoryValidator', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sql-dir-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should accept existing directory', () => {
      const validator = new SqlDirectoryValidator();
      const result = validator.validate(testDir);
      expect(result.valid).toBe(true);
    });

    it('should reject non-existent directory', () => {
      const validator = new SqlDirectoryValidator();
      const result = validator.validate('/nonexistent/path/to/sql');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject file path', () => {
      const filePath = path.join(testDir, 'file.txt');
      fs.writeFileSync(filePath, 'content');

      const validator = new SqlDirectoryValidator();
      const result = validator.validate(filePath);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not a directory');
    });

    it('should resolve path', () => {
      const validator = new SqlDirectoryValidator();
      const resolved = validator.resolve('./sql');
      expect(path.isAbsolute(resolved)).toBe(true);
    });
  });

  describe('EnvFileValidator', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-file-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should accept undefined (optional)', () => {
      const validator = new EnvFileValidator();
      const result = validator.validate(undefined);
      expect(result.valid).toBe(true);
    });

    it('should accept existing file', () => {
      const envFile = path.join(testDir, '.env');
      fs.writeFileSync(envFile, 'KEY=value');

      const validator = new EnvFileValidator();
      const result = validator.validate(envFile);
      expect(result.valid).toBe(true);
    });

    it('should reject non-existent file', () => {
      const validator = new EnvFileValidator();
      const result = validator.validate('/nonexistent/.env');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('CliValidator', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-validator-test-'));
    });

    afterEach(() => {
      fs.rmSync(testDir, { recursive: true, force: true });
    });

    it('should validate all inputs', () => {
      const validator = new CliValidator();

      // Database URL
      expect(validator.validateDatabaseUrl('postgres://localhost/db').valid).toBe(true);
      expect(validator.validateDatabaseUrl(undefined).valid).toBe(false);

      // SQL directory
      expect(validator.validateSqlDirectory(testDir).valid).toBe(true);
      expect(validator.validateSqlDirectory('/nonexistent').valid).toBe(false);

      // Env file
      expect(validator.validateEnvFile(undefined).valid).toBe(true);
    });

    describe('argument combinations', () => {
      it('should reject --watch with --dry-run', () => {
        const validator = new CliValidator();
        const result = validator.validateArgumentCombinations({
          watch: true,
          dryRun: true,
        });

        expect(result.valid).toBe(false);
        expect(result.error).toContain('--watch and --dry-run cannot be used together');
      });

      it('should warn when --only and --skip are both specified', () => {
        const validator = new CliValidator();
        const result = validator.validateArgumentCombinations({
          onlyFiles: ['file1.sql'],
          skipFiles: ['file2.sql'],
        });

        expect(result.valid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings![0]).toContain('--only and --skip');
      });

      it('should warn about watch mode with confirmation prompt', () => {
        const validator = new CliValidator();
        const result = validator.validateArgumentCombinations({
          watch: true,
          skipConfirmation: false,
        });

        expect(result.valid).toBe(true);
        expect(result.warnings).toBeDefined();
        expect(result.warnings![0]).toContain('confirmation');
      });

      it('should not warn about watch mode when -y is specified', () => {
        const validator = new CliValidator();
        const result = validator.validateArgumentCombinations({
          watch: true,
          skipConfirmation: true,
        });

        expect(result.valid).toBe(true);
        expect(result.warnings).toBeUndefined();
      });

      it('should return no warnings for valid combinations', () => {
        const validator = new CliValidator();
        const result = validator.validateArgumentCombinations({
          verbose: true,
          skipConfirmation: true,
        });

        expect(result.valid).toBe(true);
        expect(result.warnings).toBeUndefined();
      });
    });
  });
});

// =============================================================================
// Help Display Tests
// =============================================================================

describe('HelpDisplay', () => {
  describe('showHelp', () => {
    it('should output help text', () => {
      const logs: string[] = [];
      const mockOutput: CliOutput = {
        log: (msg) => logs.push(msg),
        error: () => {},
        warn: () => {},
      };

      const display = new HelpDisplay(mockOutput);
      display.showHelp();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain('Supabase SQL Dev Runner');
    });
  });

  describe('showVersion', () => {
    it('should output version', () => {
      const logs: string[] = [];
      const mockOutput: CliOutput = {
        log: (msg) => logs.push(msg),
        error: () => {},
        warn: () => {},
      };

      const mockFs: FileSystem = {
        exists: () => false,
        readFile: () => '',
      };

      const display = new HelpDisplay(mockOutput, mockFs);
      display.showVersion();

      expect(logs.length).toBe(1);
      // New format uses styled "sql-runner" name with version
      expect(logs[0]).toContain('sql-runner');
      expect(logs[0]).toMatch(/v\d+\.\d+\.\d+/);
    });

    it('should read version from package.json if available', () => {
      const logs: string[] = [];
      const mockOutput: CliOutput = {
        log: (msg) => logs.push(msg),
        error: () => {},
        warn: () => {},
      };

      const mockFs: FileSystem = {
        exists: (p) => p.endsWith('package.json'),
        readFile: () => JSON.stringify({ name: 'test-pkg', version: '2.5.0' }),
      };

      const display = new HelpDisplay(mockOutput, mockFs);
      display.showVersion();

      expect(logs[0]).toContain('v2.5.0');
    });
  });

  describe('getHelpText', () => {
    it('should return help text string', () => {
      const text = getHelpText();
      // New format uses styled section headers without colons
      expect(text).toContain('Usage');
      expect(text).toContain('Options');
      expect(text).toContain('Examples');
    });
  });

  describe('convenience functions', () => {
    it('showHelp should work', () => {
      const logs: string[] = [];
      const mockOutput: CliOutput = {
        log: (msg) => logs.push(msg),
        error: () => {},
        warn: () => {},
      };

      showHelp(mockOutput);
      expect(logs.length).toBeGreaterThan(0);
    });

    it('showVersion should work', () => {
      const logs: string[] = [];
      const mockOutput: CliOutput = {
        log: (msg) => logs.push(msg),
        error: () => {},
        warn: () => {},
      };

      showVersion(mockOutput);
      expect(logs.length).toBe(1);
    });
  });
});

// =============================================================================
// Executor Config Builder Tests
// =============================================================================

describe('Executor Config Builders', () => {
  describe('buildRunnerConfig', () => {
    it('should build runner config from executor config', () => {
      const args: CliArgs = {
        ...CLI_DEFAULTS,
        skipConfirmation: true,
        verbose: true,
        noLogs: false,
        logDirectory: './custom-logs',
        confirmationPhrase: 'GO',
      };

      const config = buildRunnerConfig({
        databaseUrl: 'postgres://localhost/db',
        sqlDirectory: '/path/to/sql',
        args,
      });

      expect(config.databaseUrl).toBe('postgres://localhost/db');
      expect(config.sqlDirectory).toBe('/path/to/sql');
      expect(config.requireConfirmation).toBe(false);
      expect(config.confirmationPhrase).toBe('GO');
      expect(config.verbose).toBe(true);
      expect(config.logDirectory).toBe('./custom-logs');
    });

    it('should set logDirectory to null when noLogs is true', () => {
      const args: CliArgs = {
        ...CLI_DEFAULTS,
        noLogs: true,
      };

      const config = buildRunnerConfig({
        databaseUrl: 'postgres://localhost/db',
        sqlDirectory: '/path/to/sql',
        args,
      });

      expect(config.logDirectory).toBeNull();
    });
  });

  describe('buildRunOptions', () => {
    it('should build run options from args', () => {
      const args: CliArgs = {
        ...CLI_DEFAULTS,
        skipConfirmation: true,
        dryRun: true,
        onlyFiles: ['01.sql', '02.sql'],
        skipFiles: ['seed.sql'],
      };

      const options = buildRunOptions(args);

      expect(options.skipConfirmation).toBe(true);
      expect(options.dryRun).toBe(true);
      expect(options.onlyFiles).toEqual(['01.sql', '02.sql']);
      expect(options.skipFiles).toEqual(['seed.sql']);
    });

    it('should allow overriding skipConfirmation', () => {
      const args: CliArgs = {
        ...CLI_DEFAULTS,
        skipConfirmation: false,
      };

      const options = buildRunOptions(args, true);
      expect(options.skipConfirmation).toBe(true);
    });
  });
});

// =============================================================================
// CLI Defaults Tests
// =============================================================================

describe('CLI_DEFAULTS', () => {
  it('should have correct default values', () => {
    expect(CLI_DEFAULTS.sqlDirectory).toBe('./sql');
    expect(CLI_DEFAULTS.skipConfirmation).toBe(false);
    expect(CLI_DEFAULTS.confirmationPhrase).toBe('CONFIRM');
    expect(CLI_DEFAULTS.verbose).toBe(false);
    expect(CLI_DEFAULTS.dryRun).toBe(false);
    expect(CLI_DEFAULTS.noLogs).toBe(false);
    expect(CLI_DEFAULTS.logDirectory).toBe('./logs');
    expect(CLI_DEFAULTS.watch).toBe(false);
    expect(CLI_DEFAULTS.help).toBe(false);
    expect(CLI_DEFAULTS.version).toBe(false);
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(CLI_DEFAULTS)).toBe(true);
  });
});
