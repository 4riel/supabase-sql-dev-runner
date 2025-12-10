# supabase-sql-dev-runner

[![npm version](https://img.shields.io/npm/v/supabase-sql-dev-runner.svg)](https://www.npmjs.com/package/supabase-sql-dev-runner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Run SQL scripts on Supabase with transaction safety. No more copy-pasting into the dashboard.

```bash
npx sql-runner -y
```

## Why?

We've all been there: you have 10 SQL files to set up your dev database. You open Supabase Dashboard, copy-paste each file, run them one by one, pray you didn't miss anything... and if something fails halfway through? Good luck figuring out what state your DB is in.

This tool fixes that. One command, all your SQL files run in order, wrapped in a transaction. If anything fails, everything rolls back. Simple.

> ⚠️ **This is a development tool.** For production migrations, use [Supabase Migrations](https://supabase.com/docs/guides/deployment/database-migrations) or similar tools with proper version control and audit trails.

## Install

```bash
npm install supabase-sql-dev-runner
```

## Setup

### 1. Get your Database URL

Go to [Supabase Dashboard](https://supabase.com/dashboard) → Select your project → Click **Connect**

You'll see three connection types:

| Type | Port | When to use |
|------|------|-------------|
| **Session Pooler** | 5432 | ✅ **Use this one** - supports long transactions |
| Transaction Pooler | 6543 | Serverless functions (short-lived) |
| Direct Connection | 5432 | Requires IPv6 |

Copy the **Session Pooler** connection string. It looks like this:

```
postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### 2. Set the environment variable

```bash
# Linux/macOS
export DATABASE_URL="postgres://postgres.abc123:mypassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Windows (PowerShell)
$env:DATABASE_URL="postgres://postgres.abc123:mypassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Or create a .env file (recommended)
echo 'DATABASE_URL="postgres://postgres.abc123:mypassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres"' > .env
```

> 💡 Add `.env` to your `.gitignore` - never commit database credentials!

### 3. Create your SQL files

Create a `sql/` folder with numbered files:

```
sql/
├── 00_extensions.sql
├── 01_tables.sql
├── 02_functions.sql
├── 03_triggers.sql
├── 04_views.sql
├── 05_rls_policies.sql
└── 06_seed.sql
```

Files run in alphabetical order. Use numeric prefixes to control the sequence.

### 4. Run!

```bash
npx sql-runner
```

That's it! 🎉

## CLI

```bash
sql-runner [directory] [options]

Options:
  -y, --yes              Skip confirmation
  -d, --directory        SQL folder (default: ./sql)
  -u, --database-url     Database URL
  -e, --env-file         Path to .env file (default: .env)
  --dry-run              Preview without executing
  --only <files>         Run specific files (comma-separated)
  --skip <files>         Skip specific files (comma-separated)
  --watch, -w            Re-run on file changes
  --verbose              Detailed output
  --no-logs              Disable file logging
  -h, --help             Show help
```

### Examples

```bash
# Run all SQL files
sql-runner

# Different directory
sql-runner ./migrations

# Skip confirmation
sql-runner -y

# Preview what would run
sql-runner --dry-run

# Run specific files only
sql-runner --only "01_tables.sql,02_functions.sql"

# Skip seed data
sql-runner --skip "06_seed.sql"

# Watch mode - re-run on save
sql-runner --watch

# Combine options
sql-runner ./sql -y --verbose --skip "06_seed.sql"
```

## Configuration File

Instead of passing CLI arguments every time, you can create a configuration file. The tool automatically searches for configuration in several places:

| File | Format |
|------|--------|
| `package.json` | `"sql-runner"` field |
| `.sql-runnerrc` | JSON or YAML |
| `.sql-runnerrc.json` | JSON |
| `.sql-runnerrc.yaml` / `.sql-runnerrc.yml` | YAML |
| `.sql-runnerrc.js` / `.sql-runnerrc.cjs` / `.sql-runnerrc.mjs` | JavaScript |
| `sql-runner.config.js` / `sql-runner.config.cjs` / `sql-runner.config.mjs` | JavaScript |
| `sql-runner.config.ts` | TypeScript |

### Example configurations

**In `package.json`:**

```json
{
  "name": "my-project",
  "sql-runner": {
    "directory": "./database/scripts",
    "verbose": true,
    "skip": ["06_seed.sql"]
  }
}
```

**Or `.sql-runnerrc.json`:**

```json
{
  "directory": "./database/scripts",
  "verbose": true,
  "skip": ["06_seed.sql"],
  "yes": true
}
```

**Or `.sql-runnerrc.yaml`:**

```yaml
directory: ./database/scripts
verbose: true
skip:
  - 06_seed.sql
yes: true
```

**Or `sql-runner.config.js`:**

```js
export default {
  directory: './database/scripts',
  verbose: true,
  skip: ['06_seed.sql'],
  yes: true,
};
```

### Configuration options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `directory` | `string` | `./sql` | SQL files directory |
| `databaseUrl` | `string` | - | Database connection URL |
| `envFile` | `string` | `.env` | Path to .env file |
| `yes` | `boolean` | `false` | Skip confirmation prompt |
| `confirmationPhrase` | `string` | `CONFIRM` | Confirmation text |
| `verbose` | `boolean` | `false` | Verbose output |
| `dryRun` | `boolean` | `false` | Preview without executing |
| `noLogs` | `boolean` | `false` | Disable file logging |
| `logDirectory` | `string` | `./logs` | Log files directory |
| `only` | `string[]` | - | Run only these files |
| `skip` | `string[]` | - | Skip these files |
| `watch` | `boolean` | `false` | Watch mode |
| `ssl` | `boolean` | `true` | Use SSL connection |
| `filePattern` | `string` | `\.sql$` | Regex for SQL files |
| `ignorePattern` | `string` | `^_ignored\|README` | Regex for ignored files |

### Priority order

Configuration is merged in this order (highest priority first):

1. **CLI arguments** - Always win
2. **Config file** - Project-level defaults
3. **Built-in defaults** - Fallback values

This means you can set project defaults in your config file and override them with CLI flags when needed:

```bash
# Uses config file defaults, but skips a different file this time
sql-runner --skip "07_dev_data.sql"
```

## Programmatic Usage

```typescript
import { SqlRunner } from 'supabase-sql-dev-runner';

const runner = new SqlRunner({
  databaseUrl: process.env.DATABASE_URL,
  sqlDirectory: './sql',
});

const result = await runner.run();
console.log(`Executed ${result.successfulFiles} files`);
```

### With callbacks

```typescript
const runner = new SqlRunner({
  databaseUrl: process.env.DATABASE_URL,
  sqlDirectory: './sql',
  requireConfirmation: false,
  verbose: true,

  onBeforeFile: (file, index, total) => {
    console.log(`[${index + 1}/${total}] ${file}`);
  },

  onAfterFile: (result) => {
    if (result.success) {
      console.log(`✓ ${result.fileName} (${result.durationMs}ms)`);
    } else {
      console.log(`✗ ${result.fileName}: ${result.error?.message}`);
    }
  },

  onNotice: (message) => {
    console.log(`[SQL] ${message}`);
  },

  onComplete: (summary) => {
    console.log(`Done! ${summary.successfulFiles}/${summary.totalFiles} files`);
  },
});

await runner.run();
```

### Convenience function

```typescript
import { runSqlScripts } from 'supabase-sql-dev-runner';

await runSqlScripts({
  databaseUrl: process.env.DATABASE_URL,
  sqlDirectory: './sql',
});
```

### Run options

```typescript
const result = await runner.run({
  skipConfirmation: true,
  onlyFiles: ['01_tables.sql', '02_functions.sql'],
  skipFiles: ['06_seed.sql'],
  dryRun: false,
});
```

## How It Works

- Files execute in alphabetical order (`00_`, `01_`, `02_`...)
- Everything runs in a single transaction
- Each file gets a savepoint for precise error tracking
- If any file fails, all changes roll back
- Files starting with `_ignored` or `README` are skipped

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `databaseUrl` | - | PostgreSQL connection string (required) |
| `sqlDirectory` | `./sql` | Folder containing SQL files |
| `requireConfirmation` | `true` | Prompt before executing |
| `confirmationPhrase` | `CONFIRM` | Text to type for confirmation |
| `ssl` | `true` | Use SSL connection |
| `verbose` | `false` | Detailed logging |
| `logDirectory` | `./logs` | Log file location (`null` to disable) |
| `filePattern` | `/\.sql$/` | Regex to match SQL files |
| `ignorePattern` | `/^_ignored\|README/` | Regex to ignore files |

## Error Handling

When something fails, you get detailed PostgreSQL error info:

```typescript
interface SqlRunnerError {
  message: string;      // Error message
  code?: string;        // PostgreSQL error code (e.g., "42P01")
  detail?: string;      // Additional detail
  hint?: string;        // Suggestion for fixing
  position?: string;    // Position in SQL
  fileName?: string;    // File that caused the error
}
```

Example error output:

```
✗ 03_tables.sql failed!

Error: relation "users" already exists
Code: 42P07
Hint: Use CREATE TABLE IF NOT EXISTS to avoid this error

Transaction rolled back. No changes were made.
```

## Execution Summary

The `run()` method returns a summary:

```typescript
interface ExecutionSummary {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalDurationMs: number;
  results: FileExecutionResult[];
  allSuccessful: boolean;
  committed: boolean;
  ignoredFiles: string[];
}
```

## Troubleshooting

**"Connection refused"**
- Check your `DATABASE_URL` is correct
- Make sure you're using Session Pooler (port 5432)
- Verify your IP is allowed in Supabase Dashboard → Settings → Database

**"Prepared statement already exists"**
- You're using Transaction Pooler (port 6543). Switch to Session Pooler (port 5432)

**Files not running**
- Check files end with `.sql`
- Make sure they don't start with `_ignored`
- Use `--verbose` to see which files are found

## License

MIT

---

Made with ❤️ by [4riel](https://github.com/4riel)
