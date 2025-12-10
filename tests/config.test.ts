/**
 * Configuration Loading Tests
 *
 * Tests for config file loading, merging, and schema validation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigLoader } from '../src/cli/config-loader.js';
import { ConfigMerger } from '../src/cli/config-merger.js';
import { CONFIG_MODULE_NAME, type ConfigFileSchema } from '../src/cli/config-schema.js';
import type { CliArgs } from '../src/cli/types.js';
import { CLI_DEFAULTS } from '../src/cli/types.js';

describe('ConfigLoader', () => {
  let testDir: string;
  let loader: ConfigLoader;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'config-test-'));
    loader = new ConfigLoader();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    loader.clearCache();
  });

  describe('load()', () => {
    it('should return empty config when no config file exists', async () => {
      const result = await loader.load(testDir);

      expect(result.found).toBe(false);
      expect(result.config).toEqual({});
      expect(result.filepath).toBeUndefined();
    });

    it('should load .sql-runnerrc.json config file', async () => {
      const config: ConfigFileSchema = {
        directory: './custom-sql',
        verbose: true,
        skip: ['seed.sql'],
      };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config));

      const result = await loader.load(testDir);

      expect(result.found).toBe(true);
      expect(result.config.directory).toBe('./custom-sql');
      expect(result.config.verbose).toBe(true);
      expect(result.config.skip).toEqual(['seed.sql']);
      expect(result.filepath).toContain('.sql-runnerrc.json');
    });

    it('should load sql-runner.config.mjs config file', async () => {
      const configContent = `export default {
        directory: './migrations',
        yes: true,
        logDirectory: './custom-logs'
      };`;
      writeFileSync(join(testDir, 'sql-runner.config.mjs'), configContent);

      const result = await loader.load(testDir);

      expect(result.found).toBe(true);
      expect(result.config.directory).toBe('./migrations');
      expect(result.config.yes).toBe(true);
      expect(result.config.logDirectory).toBe('./custom-logs');
    });

    it('should load config from package.json sql-runner field', async () => {
      const packageJson = {
        name: 'test-project',
        [CONFIG_MODULE_NAME]: {
          directory: './db-scripts',
          ssl: false,
        },
      };
      writeFileSync(join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

      const result = await loader.load(testDir);

      expect(result.found).toBe(true);
      expect(result.config.directory).toBe('./db-scripts');
      expect(result.config.ssl).toBe(false);
    });

    it('should cache loaded config', async () => {
      const config = { directory: './cached' };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config));

      const result1 = await loader.load(testDir);
      const result2 = await loader.load(testDir);

      expect(result1).toBe(result2); // Same reference (cached)
    });

    it('should clear cache when requested', async () => {
      const config1 = { directory: './first' };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config1));

      const result1 = await loader.load(testDir);
      loader.clearCache();

      const config2 = { directory: './second' };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config2));

      const result2 = await loader.load(testDir);

      expect(result1.config.directory).toBe('./first');
      expect(result2.config.directory).toBe('./second');
    });
  });

  describe('loadFromPath()', () => {
    it('should load config from specific file path', async () => {
      const configPath = join(testDir, 'custom-config.json');
      const config = { directory: './specific-path', verbose: true };
      writeFileSync(configPath, JSON.stringify(config));

      const result = await loader.loadFromPath(configPath);

      expect(result.found).toBe(true);
      expect(result.config.directory).toBe('./specific-path');
      expect(result.config.verbose).toBe(true);
    });

    it('should throw error for non-existent file', async () => {
      const configPath = join(testDir, 'nonexistent.json');

      await expect(loader.loadFromPath(configPath)).rejects.toThrow();
    });
  });

  describe('validation and normalization', () => {
    it('should normalize string properties', async () => {
      const config = {
        directory: './sql',
        databaseUrl: 'postgres://localhost/db',
        envFile: '.env.local',
        confirmationPhrase: 'YES',
        logDirectory: './logs',
        filePattern: '\\.sql$',
        ignorePattern: '^_',
      };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config));

      const result = await loader.load(testDir);

      expect(result.config.directory).toBe('./sql');
      expect(result.config.databaseUrl).toBe('postgres://localhost/db');
      expect(result.config.envFile).toBe('.env.local');
      expect(result.config.confirmationPhrase).toBe('YES');
      expect(result.config.logDirectory).toBe('./logs');
      expect(result.config.filePattern).toBe('\\.sql$');
      expect(result.config.ignorePattern).toBe('^_');
    });

    it('should normalize boolean properties', async () => {
      const config = {
        yes: true,
        verbose: false,
        dryRun: true,
        noLogs: false,
        watch: true,
        ssl: false,
      };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config));

      const result = await loader.load(testDir);

      expect(result.config.yes).toBe(true);
      expect(result.config.verbose).toBe(false);
      expect(result.config.dryRun).toBe(true);
      expect(result.config.noLogs).toBe(false);
      expect(result.config.watch).toBe(true);
      expect(result.config.ssl).toBe(false);
    });

    it('should normalize array properties', async () => {
      const config = {
        only: ['01_setup.sql', '02_data.sql'],
        skip: ['seed.sql'],
      };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config));

      const result = await loader.load(testDir);

      expect(result.config.only).toEqual(['01_setup.sql', '02_data.sql']);
      expect(result.config.skip).toEqual(['seed.sql']);
    });

    it('should filter out non-string values from arrays', async () => {
      const config = {
        only: ['valid.sql', 123, null, 'another.sql'],
        skip: [true, 'skip.sql', {}],
      };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config));

      const result = await loader.load(testDir);

      expect(result.config.only).toEqual(['valid.sql', 'another.sql']);
      expect(result.config.skip).toEqual(['skip.sql']);
    });

    it('should ignore invalid property types', async () => {
      const config = {
        directory: 123, // Should be string
        verbose: 'yes', // Should be boolean
        only: 'single.sql', // Should be array
      };
      writeFileSync(join(testDir, '.sql-runnerrc.json'), JSON.stringify(config));

      const result = await loader.load(testDir);

      expect(result.config.directory).toBeUndefined();
      expect(result.config.verbose).toBeUndefined();
      expect(result.config.only).toBeUndefined();
    });
  });
});

describe('ConfigMerger', () => {
  let merger: ConfigMerger;

  beforeEach(() => {
    merger = new ConfigMerger();
  });

  describe('merge()', () => {
    it('should use defaults when no config file and default CLI args', () => {
      const cliArgs: CliArgs = { ...CLI_DEFAULTS };
      const fileConfig: ConfigFileSchema = {};

      const result = merger.merge(cliArgs, fileConfig);

      expect(result.sqlDirectory).toBe(CLI_DEFAULTS.sqlDirectory);
      expect(result.skipConfirmation).toBe(CLI_DEFAULTS.skipConfirmation);
      expect(result.verbose).toBe(CLI_DEFAULTS.verbose);
      expect(result.configFileUsed).toBe(false);
    });

    it('should apply config file values over defaults', () => {
      const cliArgs: CliArgs = { ...CLI_DEFAULTS };
      const fileConfig: ConfigFileSchema = {
        directory: './custom-sql',
        verbose: true,
        yes: true,
      };

      const result = merger.merge(cliArgs, fileConfig, '/path/to/config');

      expect(result.sqlDirectory).toBe('./custom-sql');
      expect(result.verbose).toBe(true);
      expect(result.skipConfirmation).toBe(true);
      expect(result.configFileUsed).toBe(true);
      expect(result.configFilePath).toBe('/path/to/config');
    });

    it('should apply CLI args over config file values', () => {
      const cliArgs: CliArgs = {
        ...CLI_DEFAULTS,
        sqlDirectory: './cli-sql',
        verbose: true,
      };
      const fileConfig: ConfigFileSchema = {
        directory: './config-sql',
        verbose: false,
        yes: true,
      };

      const result = merger.merge(cliArgs, fileConfig);

      expect(result.sqlDirectory).toBe('./cli-sql'); // CLI wins
      expect(result.verbose).toBe(true); // CLI wins
      expect(result.skipConfirmation).toBe(true); // From config (not overridden by CLI)
    });

    it('should map config file properties to CLI args correctly', () => {
      const cliArgs: CliArgs = { ...CLI_DEFAULTS };
      const fileConfig: ConfigFileSchema = {
        directory: './sql',
        databaseUrl: 'postgres://localhost/db',
        envFile: '.env.local',
        yes: true,
        confirmationPhrase: 'DO IT',
        verbose: true,
        dryRun: true,
        noLogs: true,
        logDirectory: './custom-logs',
        only: ['01.sql'],
        skip: ['seed.sql'],
        watch: true,
        ssl: false,
        filePattern: '\\.psql$',
        ignorePattern: '^skip_',
      };

      const result = merger.merge(cliArgs, fileConfig);

      expect(result.sqlDirectory).toBe('./sql');
      expect(result.databaseUrl).toBe('postgres://localhost/db');
      expect(result.envFile).toBe('.env.local');
      expect(result.skipConfirmation).toBe(true);
      expect(result.confirmationPhrase).toBe('DO IT');
      expect(result.verbose).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.noLogs).toBe(true);
      expect(result.logDirectory).toBe('./custom-logs');
      expect(result.onlyFiles).toEqual(['01.sql']);
      expect(result.skipFiles).toEqual(['seed.sql']);
      expect(result.watch).toBe(true);
      expect(result.ssl).toBe(false);
      expect(result.filePattern).toBe('\\.psql$');
      expect(result.ignorePattern).toBe('^skip_');
    });

    it('should preserve help and version flags from CLI', () => {
      const cliArgs: CliArgs = {
        ...CLI_DEFAULTS,
        help: true,
        version: true,
      };
      const fileConfig: ConfigFileSchema = {};

      const result = merger.merge(cliArgs, fileConfig);

      expect(result.help).toBe(true);
      expect(result.version).toBe(true);
    });

    it('should only override CLI values that differ from defaults', () => {
      const cliArgs: CliArgs = {
        ...CLI_DEFAULTS,
        // Only sqlDirectory is explicitly set (differs from default)
        sqlDirectory: './explicit-cli',
      };
      const fileConfig: ConfigFileSchema = {
        directory: './from-config',
        logDirectory: './config-logs',
      };

      const result = merger.merge(cliArgs, fileConfig);

      // CLI arg was explicitly set, so it wins
      expect(result.sqlDirectory).toBe('./explicit-cli');
      // Config file value used since CLI didn't override
      expect(result.logDirectory).toBe('./config-logs');
    });
  });
});

describe('Config file formats', () => {
  let testDir: string;
  let loader: ConfigLoader;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'config-format-test-'));
    loader = new ConfigLoader();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    loader.clearCache();
  });

  it('should load .sql-runnerrc (JSON format)', async () => {
    const config = { directory: './json-rc' };
    writeFileSync(join(testDir, '.sql-runnerrc'), JSON.stringify(config));

    const result = await loader.load(testDir);

    expect(result.found).toBe(true);
    expect(result.config.directory).toBe('./json-rc');
  });

  it('should load .sql-runnerrc.yaml', async () => {
    const yamlContent = `directory: ./yaml-config
verbose: true
skip:
  - seed.sql
  - test.sql`;
    writeFileSync(join(testDir, '.sql-runnerrc.yaml'), yamlContent);

    const result = await loader.load(testDir);

    expect(result.found).toBe(true);
    expect(result.config.directory).toBe('./yaml-config');
    expect(result.config.verbose).toBe(true);
    expect(result.config.skip).toEqual(['seed.sql', 'test.sql']);
  });

  it('should load .sql-runnerrc.yml', async () => {
    const yamlContent = `directory: ./yml-config
yes: true`;
    writeFileSync(join(testDir, '.sql-runnerrc.yml'), yamlContent);

    const result = await loader.load(testDir);

    expect(result.found).toBe(true);
    expect(result.config.directory).toBe('./yml-config');
    expect(result.config.yes).toBe(true);
  });

  it('should load sql-runner.config.cjs', async () => {
    const cjsContent = `module.exports = {
      directory: './cjs-config',
      verbose: true
    };`;
    writeFileSync(join(testDir, 'sql-runner.config.cjs'), cjsContent);

    const result = await loader.load(testDir);

    expect(result.found).toBe(true);
    expect(result.config.directory).toBe('./cjs-config');
    expect(result.config.verbose).toBe(true);
  });
});
