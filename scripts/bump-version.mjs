#!/usr/bin/env node
/**
 * Bump version in all project files
 * Usage: node scripts/bump-version.mjs <version>
 * Example: node scripts/bump-version.mjs 1.0.0
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

/**
 * Ensure LF line endings (for prettier compatibility on Windows)
 */
function ensureLF(content) {
  return content.replace(/\r\n/g, '\n');
}

// Files to update
const FILES = {
  'package.json': {
    path: join(ROOT_DIR, 'package.json'),
    update: (content, version) => {
      const json = JSON.parse(content);
      json.version = version;
      return ensureLF(JSON.stringify(json, null, 2) + '\n');
    },
  },
  'tauri.conf.json': {
    path: join(ROOT_DIR, 'src-tauri', 'tauri.conf.json'),
    update: (content, version) => {
      const json = JSON.parse(content);
      json.version = version;
      return ensureLF(JSON.stringify(json, null, 2) + '\n');
    },
  },
  'Cargo.toml': {
    path: join(ROOT_DIR, 'src-tauri', 'Cargo.toml'),
    update: (content, version) => {
      // Replace version in [package] section only (first occurrence)
      return ensureLF(content.replace(/^(version\s*=\s*)"[^"]*"/m, `$1"${version}"`));
    },
  },
};

function main() {
  const version = process.argv[2];

  if (!version) {
    console.error('Usage: node scripts/bump-version.mjs <version>');
    console.error('Example: node scripts/bump-version.mjs 1.0.0');
    process.exit(1);
  }

  // Validate version format (semver)
  if (!/^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/.test(version)) {
    console.error(`Invalid version format: ${version}`);
    console.error('Expected format: X.Y.Z or X.Y.Z-prerelease');
    process.exit(1);
  }

  console.log(`Bumping version to ${version}...\n`);

  for (const [name, config] of Object.entries(FILES)) {
    try {
      const content = readFileSync(config.path, 'utf-8');
      const updated = config.update(content, version);
      writeFileSync(config.path, updated);
      console.log(`✓ Updated ${name}`);
    } catch (error) {
      console.error(`✗ Failed to update ${name}: ${error.message}`);
      process.exit(1);
    }
  }

  // Run prettier on JSON files to ensure consistent formatting
  const jsonFiles = Object.entries(FILES)
    .filter(([name]) => name.endsWith('.json'))
    .map(([, config]) => config.path);

  if (jsonFiles.length > 0) {
    try {
      console.log('\nRunning prettier on JSON files...');
      execSync(`npx prettier --write ${jsonFiles.join(' ')}`, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
    } catch {
      console.warn('⚠ Prettier not available, skipping formatting');
    }
  }

  console.log(`\n✓ All files updated to version ${version}`);
}

main();
