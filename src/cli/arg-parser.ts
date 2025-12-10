/**
 * CLI Argument Parser
 *
 * Single Responsibility: Parse command line arguments into a structured object.
 * Follows Open/Closed Principle with extensible argument definitions.
 */

import type { CliArgs } from './types.js';
import { CLI_DEFAULTS } from './types.js';

/**
 * Argument definition for extensibility
 */
interface ArgDefinition {
  flags: string[];
  hasValue: boolean;
  handler: (result: CliArgs, value?: string) => void;
}

/**
 * Create argument definitions
 * Open for extension - add new arguments by adding to this array
 */
function createArgDefinitions(): ArgDefinition[] {
  return [
    // Boolean flags
    {
      flags: ['-h', '--help'],
      hasValue: false,
      handler: (result) => {
        result.help = true;
      },
    },
    {
      flags: ['-v', '--version'],
      hasValue: false,
      handler: (result) => {
        result.version = true;
      },
    },
    {
      flags: ['-y', '--yes', '--skip-confirmation'],
      hasValue: false,
      handler: (result) => {
        result.skipConfirmation = true;
      },
    },
    {
      flags: ['--verbose'],
      hasValue: false,
      handler: (result) => {
        result.verbose = true;
      },
    },
    {
      flags: ['--dry-run'],
      hasValue: false,
      handler: (result) => {
        result.dryRun = true;
      },
    },
    {
      flags: ['--no-logs'],
      hasValue: false,
      handler: (result) => {
        result.noLogs = true;
      },
    },
    {
      flags: ['-w', '--watch'],
      hasValue: false,
      handler: (result) => {
        result.watch = true;
      },
    },

    // Value arguments
    {
      flags: ['-d', '--directory', '--sql-directory'],
      hasValue: true,
      handler: (result, value) => {
        if (value) result.sqlDirectory = value;
      },
    },
    {
      flags: ['-u', '--url', '--database-url'],
      hasValue: true,
      handler: (result, value) => {
        if (value) result.databaseUrl = value;
      },
    },
    {
      flags: ['-e', '--env', '--env-file'],
      hasValue: true,
      handler: (result, value) => {
        if (value) result.envFile = value;
      },
    },
    {
      flags: ['--confirmation-phrase'],
      hasValue: true,
      handler: (result, value) => {
        if (value) result.confirmationPhrase = value;
      },
    },
    {
      flags: ['--log-directory'],
      hasValue: true,
      handler: (result, value) => {
        if (value) result.logDirectory = value;
      },
    },
    {
      flags: ['--only'],
      hasValue: true,
      handler: (result, value) => {
        if (value) {
          result.onlyFiles = parseCommaSeparated(value);
        }
      },
    },
    {
      flags: ['--skip'],
      hasValue: true,
      handler: (result, value) => {
        if (value) {
          result.skipFiles = parseCommaSeparated(value);
        }
      },
    },
  ];
}

/**
 * Parse comma-separated values into array
 */
function parseCommaSeparated(value: string): string[] {
  return value.split(',').map((item) => item.trim());
}

/**
 * Argument Parser class
 */
export class ArgParser {
  private definitions: ArgDefinition[];
  private flagMap: Map<string, ArgDefinition>;

  constructor() {
    this.definitions = createArgDefinitions();
    this.flagMap = this.buildFlagMap();
  }

  /**
   * Build a map from flags to definitions for O(1) lookup
   */
  private buildFlagMap(): Map<string, ArgDefinition> {
    const map = new Map<string, ArgDefinition>();
    for (const def of this.definitions) {
      for (const flag of def.flags) {
        map.set(flag, def);
      }
    }
    return map;
  }

  /**
   * Parse command line arguments
   */
  parse(args: string[]): CliArgs {
    const result: CliArgs = { ...CLI_DEFAULTS };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const definition = this.flagMap.get(arg);

      if (definition) {
        if (definition.hasValue) {
          const nextArg = args[i + 1];
          definition.handler(result, nextArg);
          if (nextArg && !nextArg.startsWith('-')) {
            i++;
          }
        } else {
          definition.handler(result);
        }
      } else if (!arg.startsWith('-')) {
        // Positional argument - treat as directory
        result.sqlDirectory = arg;
      }
    }

    return result;
  }

  /**
   * Get all supported flags (for help/documentation)
   */
  getSupportedFlags(): string[] {
    return Array.from(this.flagMap.keys());
  }
}

/**
 * Convenience function for simple usage
 */
export function parseArgs(args: string[]): CliArgs {
  const parser = new ArgParser();
  return parser.parse(args);
}
