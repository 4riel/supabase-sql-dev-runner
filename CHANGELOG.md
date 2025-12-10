# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-12-11

### Changed

- Updated README documentation with clearer examples and setup instructions

## [1.0.0] - 2025-12-10

### Added

- Initial release
- Comprehensive test suite with 352 tests across 13 test files
- Test coverage for: CLI parsing, connection handling, logging, file scanning, SQL execution, watcher, UI components, and integration flows

#### Core Features
- Sequential SQL file execution with alphabetical ordering
- Transaction safety with automatic rollback on errors
- Savepoint support for granular rollback per file
- Human confirmation prompt before execution (configurable)
- Watch mode (`--watch`) for development - re-runs on file changes with 30-second countdown
- Dry run mode (`--dry-run`) to preview execution without making changes
- File filtering with `--only` and `--skip` options
- Configuration file support (`.sqlrunnerrc`, `sql-runner.config.js`, etc.)

#### CLI Tool
- CLI commands: `sql-runner`, `supabase-sql-runner`, `npx sql-runner`
- Extensive CLI options for all features
- Colored output with symbols for better readability
- Progress display during execution
- Argument combination validation (warns about conflicting options)

#### Programmatic API
- `SqlRunner` class for full control
- `runSqlScripts` convenience function for simple usage
- Progress callbacks (`onBeforeFile`, `onAfterFile`, `onComplete`, `onError`)
- SQL NOTICE message handling via `onNotice` callback

#### Error Handling
- 10 specialized error detectors for common connection issues:
  - DNS resolution errors (direct connection vs pooler)
  - Connection refused/timeout
  - Authentication failures
  - SSL/TLS errors
  - Prepared statement conflicts (transaction pooler)
  - Database not found
  - Too many connections
  - Invalid URL format
- Helpful error messages with actionable suggestions
- PostgreSQL error details: code, line number, column, and visual pointer to error location
- Graceful handling of connection termination after rollback

#### Security
- SQL injection prevention with quoted identifiers for savepoints
- Password masking in logs
- SSL enabled by default for secure connections

#### Logging
- Execution logging to file (`./logs/sql-runner.log`)
- Separate error log (`./logs/sql-runner-error.log`)
- Graceful handling of log file write failures
- Verbose mode for detailed output

#### Build & Distribution
- Dual module support (ESM and CommonJS)
- Full TypeScript type definitions (`.d.ts` and `.d.cts`)
- Zero external dependencies except `pg` and `cosmiconfig`

#### UI System
- Custom terminal UI components (box, banner, table, spinner)
- Theming support with configurable colors
- Cross-platform symbol support (Unicode with ASCII fallbacks)

#### Developer Experience
- Environment file loading (`.env` support)
- CLAUDE.md documentation for AI assistants
- SOLID architecture throughout the codebase
