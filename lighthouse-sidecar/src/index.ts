#!/usr/bin/env node

/**
 * Lighthouse Sidecar CLI Entry Point
 *
 * Usage: lighthouse-sidecar <url> <chrome-path> [--html]
 */

import { runAnalysis } from './runner.js';
import type { CliArgs, AnalysisOutput } from './types.js';

/**
 * Parse les arguments CLI.
 * Usage: lighthouse-sidecar <url> <chrome-path> [--html]
 */
function parseArgs(): CliArgs | null {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    return null;
  }

  const url = args[0];
  const chromePath = args[1];
  const outputFormat = args.includes('--html') ? 'html' : 'json';

  // Valider l'URL
  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url, chromePath, outputFormat };
}

/**
 * Affiche l'usage.
 */
function printUsage(): void {
  const usage = {
    error: true,
    code: 'INVALID_ARGS',
    message: 'Usage: lighthouse-sidecar <url> <chrome-path> [--html]',
    details: 'Example: lighthouse-sidecar https://example.com /path/to/chrome',
  };
  console.log(JSON.stringify(usage));
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const args = parseArgs();

  if (!args) {
    printUsage();
    process.exit(1);
  }

  const { url, chromePath, outputFormat } = args;
  const includeHtml = outputFormat === 'html';

  const result: AnalysisOutput = await runAnalysis(url, chromePath, includeHtml);

  // Toujours output JSON sur stdout
  console.log(JSON.stringify(result));

  // Exit code basé sur succès/échec
  if ('error' in result && result.error) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error: unknown) => {
  const errorOutput = {
    error: true,
    code: 'UNEXPECTED_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  };
  console.log(JSON.stringify(errorOutput));
  process.exit(1);
});
