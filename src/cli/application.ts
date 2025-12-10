/**
 * CLI Application
 *
 * Main orchestrator that coordinates all CLI components.
 * Follows Dependency Inversion - depends on abstractions, not concrete implementations.
 */

import type { CliOutput, FileSystem, ExitHandler } from './types.js';
import { ArgParser } from './arg-parser.js';
import { EnvLoader, defaultFileSystem, defaultProcessEnv } from './env-loader.js';
import { CliValidator } from './validators.js';
import { HelpDisplay, defaultCliOutput } from './help.js';
import { CliExecutor } from './executor.js';
import { ConfigLoader } from './config-loader.js';
import { ConfigMerger, type MergedConfig } from './config-merger.js';

/**
 * Application dependencies (for DI)
 */
export interface CliDependencies {
  output: CliOutput;
  fileSystem: FileSystem;
  exitHandler: ExitHandler;
}

/**
 * Default exit handler
 */
const defaultExitHandler: ExitHandler = {
  exit: (code: number) => process.exit(code),
};

/**
 * Create default dependencies
 */
export function createDefaultDependencies(): CliDependencies {
  return {
    output: defaultCliOutput,
    fileSystem: defaultFileSystem,
    exitHandler: defaultExitHandler,
  };
}

/**
 * CLI Application class
 *
 * Orchestrates the entire CLI workflow using injected dependencies.
 */
export class CliApplication {
  private argParser: ArgParser;
  private envLoader: EnvLoader;
  private validator: CliValidator;
  private helpDisplay: HelpDisplay;
  private executor: CliExecutor;
  private configLoader: ConfigLoader;
  private configMerger: ConfigMerger;
  private output: CliOutput;
  private exitHandler: ExitHandler;

  constructor(deps: Partial<CliDependencies> = {}) {
    const fullDeps = { ...createDefaultDependencies(), ...deps };

    this.output = fullDeps.output;
    this.exitHandler = fullDeps.exitHandler;

    this.argParser = new ArgParser();
    this.envLoader = new EnvLoader(fullDeps.fileSystem, defaultProcessEnv);
    this.validator = new CliValidator(fullDeps.fileSystem);
    this.helpDisplay = new HelpDisplay(fullDeps.output, fullDeps.fileSystem);
    this.executor = new CliExecutor(fullDeps.output);
    this.configLoader = new ConfigLoader();
    this.configMerger = new ConfigMerger();
  }

  /**
   * Run the CLI application
   */
  async run(argv: string[]): Promise<void> {
    // Parse CLI arguments
    const cliArgs = this.argParser.parse(argv);

    // Handle help and version (before loading config)
    if (cliArgs.help) {
      this.helpDisplay.showHelp();
      this.exitHandler.exit(0);
    }

    if (cliArgs.version) {
      this.helpDisplay.showVersion();
      this.exitHandler.exit(0);
    }

    // Load configuration file
    const configResult = await this.configLoader.load();

    // Merge CLI args with config file
    const args = this.configMerger.merge(cliArgs, configResult.config, configResult.filepath);

    // Show config file info in verbose mode
    if (args.verbose && args.configFileUsed) {
      this.output.log(`Using config file: ${args.configFilePath}`);
    }

    // Load environment
    this.loadEnvironment(args);

    // Get database URL
    const databaseUrl = this.getDatabaseUrl(args);

    // Validate SQL directory
    const sqlDirectory = this.validateSqlDirectory(args);

    // Execute
    const config = { databaseUrl, sqlDirectory, args };

    if (args.watch) {
      await this.executor.executeWithWatch(config);
      // Watch mode keeps running, don't exit
    } else {
      const result = await this.executor.execute(config);
      if (!result.success) {
        this.exitHandler.exit(result.exitCode);
      }
    }
  }

  /**
   * Load environment from file
   */
  private loadEnvironment(args: MergedConfig): void {
    const envFile = args.envFile ?? '.env';

    if (this.envLoader.exists(envFile)) {
      const result = this.envLoader.load(envFile);
      if (!result.success && args.envFile) {
        // Only error if user explicitly specified the env file
        this.output.error(`Error: ${result.error}`);
        this.exitHandler.exit(1);
      }
    } else if (args.envFile) {
      // User specified an env file that doesn't exist
      const validation = this.validator.validateEnvFile(args.envFile);
      if (!validation.valid) {
        this.output.error(`Error: ${validation.error}`);
        this.exitHandler.exit(1);
      }
    }
  }

  /**
   * Get and validate database URL
   */
  private getDatabaseUrl(args: MergedConfig): string {
    const databaseUrl = args.databaseUrl ?? this.envLoader.get('DATABASE_URL');

    const validation = this.validator.validateDatabaseUrl(databaseUrl);
    if (!validation.valid) {
      this.output.error(`Error: ${validation.error}`);
      this.exitHandler.exit(1);
    }

    return databaseUrl!;
  }

  /**
   * Validate and resolve SQL directory
   */
  private validateSqlDirectory(args: MergedConfig): string {
    const validation = this.validator.validateSqlDirectory(args.sqlDirectory);
    if (!validation.valid) {
      this.output.error(`Error: ${validation.error}`);
      this.exitHandler.exit(1);
    }

    return this.validator.resolveSqlDirectory(args.sqlDirectory);
  }
}

/**
 * Create and run CLI application
 */
export async function runCli(argv: string[], deps?: Partial<CliDependencies>): Promise<void> {
  const app = new CliApplication(deps);
  await app.run(argv);
}
