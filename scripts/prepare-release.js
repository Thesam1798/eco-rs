#!/usr/bin/env node

/**
 * Prepares a release:
 * 1. Verifies version consistency across package.json and tauri.conf.json
 * 2. Ensures all tests pass
 * 3. Creates a git tag
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  try {
    return execSync(cmd, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    });
  } catch (error) {
    if (options.silent) {
      throw error;
    }
    process.exit(1);
  }
}

async function main() {
  console.log('=== Prepare Release ===\n');

  // 1. Read versions
  const pkg = readJson(join(ROOT_DIR, 'package.json'));
  const tauri = readJson(join(ROOT_DIR, 'src-tauri', 'tauri.conf.json'));

  const pkgVersion = pkg.version;
  const tauriVersion = tauri.version;

  console.log(`package.json version: ${pkgVersion}`);
  console.log(`tauri.conf.json version: ${tauriVersion}`);

  if (pkgVersion !== tauriVersion) {
    console.error('\nVersion mismatch! Please sync versions.');
    console.error(`  package.json: ${pkgVersion}`);
    console.error(`  tauri.conf.json: ${tauriVersion}`);
    process.exit(1);
  }

  // 2. Check git status
  console.log('\nChecking git status...');
  const status = execSync('git status --porcelain', {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
  });

  if (status.trim()) {
    console.error('Working directory not clean. Commit or stash changes first.');
    console.error(status);
    process.exit(1);
  }

  // 3. Run tests
  console.log('\nRunning frontend tests...');
  run('pnpm test:ci');

  console.log('\nRunning Rust tests...');
  run('cargo test --all-features', { cwd: join(ROOT_DIR, 'src-tauri') });

  // 4. Check if tag already exists
  const tagName = `v${pkgVersion}`;
  try {
    execSync(`git rev-parse ${tagName}`, {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    console.error(`\nTag ${tagName} already exists!`);
    process.exit(1);
  } catch {
    // Tag doesn't exist, good
  }

  // 5. Create the tag
  console.log(`\nCreating tag ${tagName}...`);
  run(`git tag -a ${tagName} -m "Release ${tagName}"`);

  console.log('\n=== Release prepared! ===');
  console.log(`\nTo publish, run:`);
  console.log(`  git push origin ${tagName}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
