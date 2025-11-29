#!/usr/bin/env node
/**
 * Postinstall script - Downloads sidecars and prepares the repository
 * Skips download if sidecars already exist
 *
 * Usage: node scripts/postinstall.mjs [--force]
 */

import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);
const BINARIES_DIR = join(ROOT_DIR, 'src-tauri', 'binaries');
const RESOURCES_DIR = join(ROOT_DIR, 'src-tauri', 'resources', 'lighthouse-sidecar');

// Platform detection
const PLATFORM = (() => {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') return 'win';
  if (platform === 'linux') return 'linux';
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'mac-arm' : 'mac-x64';
  }
  return null;
})();

// Expected sidecar paths per platform
const SIDECARS = {
  win: {
    chrome: 'chrome-headless-shell-x86_64-pc-windows-msvc',
    node: 'node-x86_64-pc-windows-msvc.exe',
  },
  linux: {
    chrome: 'chrome-headless-shell-x86_64-unknown-linux-gnu',
    node: 'node-x86_64-unknown-linux-gnu',
  },
  'mac-arm': {
    chrome: 'chrome-headless-shell-aarch64-apple-darwin',
    node: 'node-aarch64-apple-darwin',
  },
  'mac-x64': {
    chrome: 'chrome-headless-shell-x86_64-apple-darwin',
    node: 'node-x86_64-apple-darwin',
  },
};

function log(msg) {
  console.log(`[postinstall] ${msg}`);
}

function logSuccess(msg) {
  console.log(`[postinstall] ✓ ${msg}`);
}

function logSkip(msg) {
  console.log(`[postinstall] ⏭ ${msg}`);
}

function logError(msg) {
  console.error(`[postinstall] ✗ ${msg}`);
}

function run(command, options = {}) {
  try {
    execSync(command, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      ...options,
    });
    return true;
  } catch (error) {
    return false;
  }
}

function checkChromeExists() {
  if (!PLATFORM || !SIDECARS[PLATFORM]) return false;
  const chromePath = join(BINARIES_DIR, SIDECARS[PLATFORM].chrome);
  if (!existsSync(chromePath)) return false;

  // Check if directory has the executable
  try {
    const files = readdirSync(chromePath);
    return files.some((f) => f.includes('chrome-headless-shell'));
  } catch {
    return false;
  }
}

function checkNodeExists() {
  if (!PLATFORM || !SIDECARS[PLATFORM]) return false;
  const nodePath = join(BINARIES_DIR, SIDECARS[PLATFORM].node);
  return existsSync(nodePath);
}

function checkLighthouseExists() {
  if (!existsSync(RESOURCES_DIR)) return false;

  // Check if node_modules exists and has lighthouse
  const nodeModulesPath = join(RESOURCES_DIR, 'node_modules', 'lighthouse');
  return existsSync(nodeModulesPath);
}

async function main() {
  const forceMode = process.argv.includes('--force');

  log('=== EcoIndex App - Postinstall Setup ===');
  log(`Platform: ${PLATFORM || 'unknown'}`);

  if (!PLATFORM) {
    logError('Unsupported platform. Manual setup required.');
    process.exit(1);
  }

  if (forceMode) {
    log('Force mode enabled - will download all sidecars');
  }

  let hasChanges = false;

  // 1. Check and download Chrome Headless Shell
  log('');
  log('--- Chrome Headless Shell ---');
  if (!forceMode && checkChromeExists()) {
    logSkip('Chrome Headless Shell already exists');
  } else {
    log('Downloading Chrome Headless Shell...');
    if (run('node scripts/download-chrome.mjs')) {
      logSuccess('Chrome Headless Shell downloaded');
      hasChanges = true;
    } else {
      logError('Failed to download Chrome Headless Shell');
    }
  }

  // 2. Check and download Node.js
  log('');
  log('--- Node.js Portable ---');
  if (!forceMode && checkNodeExists()) {
    logSkip('Node.js portable already exists');
  } else {
    log('Downloading Node.js portable...');
    if (run('node scripts/download-node.mjs')) {
      logSuccess('Node.js portable downloaded');
      hasChanges = true;
    } else {
      logError('Failed to download Node.js portable');
    }
  }

  // 3. Check and bundle Lighthouse sidecar
  log('');
  log('--- Lighthouse Sidecar Bundle ---');
  if (!forceMode && checkLighthouseExists()) {
    logSkip('Lighthouse sidecar already bundled');
  } else {
    log('Bundling Lighthouse sidecar...');
    if (run('node scripts/bundle-lighthouse.mjs')) {
      logSuccess('Lighthouse sidecar bundled');
      hasChanges = true;
    } else {
      logError('Failed to bundle Lighthouse sidecar');
    }
  }

  // Summary
  log('');
  log('=== Setup Complete ===');
  if (hasChanges) {
    log('Sidecars have been downloaded/updated.');
  } else {
    log('All sidecars already in place. Use --force to re-download.');
  }
  log('');
  log('Run `pnpm tauri:dev` to start development.');
}

main().catch((err) => {
  logError(`Unexpected error: ${err.message}`);
  process.exit(1);
});
