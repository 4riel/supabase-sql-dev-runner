# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-10

### Added

- Initial release
- Comprehensive test suite with 165 tests across 8 test files
- Test coverage for: CLI parsing, connection handling, logging, file scanning, SQL execution, and integration flows
- Sequential SQL file execution with alphabetical ordering
- Transaction safety with automatic rollback on errors
- Savepoint support for granular rollback per file
- Human confirmation prompt before execution (configurable)
- CLI tool with extensive options (`sql-runner`, `supabase-sql-runner`)
- Programmatic API with `SqlRunner` class and `runSqlScripts` convenience function
- Dual module support (ESM and CommonJS)
- Full TypeScript type definitions
- SSL enabled by default for secure connections
- Password masking in logs
- Verbose mode for detailed output
- Dry run mode to preview execution
- File filtering with `--only` and `--skip` options
- Environment file loading (`.env` support)
- Execution logging to file
- Progress callbacks (`onBeforeFile`, `onAfterFile`, `onComplete`, `onError`)
- SQL NOTICE message handling via `onNotice` callback
