#!/usr/bin/env node

/**
 * Supabase SQL Dev Runner CLI
 *
 * Entry point for the CLI application.
 * This file is intentionally minimal - all logic is delegated to the application module.
 */

import { runCli } from './application.js';

// Run CLI with process arguments
runCli(process.argv.slice(2));
