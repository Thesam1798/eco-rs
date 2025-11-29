#!/usr/bin/env node
/**
 * Bundle Lighthouse sidecar for Tauri with optimizations
 * Usage: node scripts/bundle-lighthouse.mjs
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);
const SIDECAR_DIR = join(ROOT_DIR, 'lighthouse-sidecar');
const RESOURCES_DIR = join(ROOT_DIR, 'src-tauri', 'resources', 'lighthouse-sidecar');

// Files/folders to remove from node_modules
const REMOVE_PATTERNS = {
  files: [
    '*.md',
    '*.txt',
    '*.ts',
    '*.map',
    '*.d.ts.map',
    'LICENSE*',
    'CHANGELOG*',
    '.eslint*',
    '.prettier*',
    'tsconfig*',
    '*.flow',
    '.npmignore',
    '.gitignore',
    'Makefile',
    '.editorconfig',
    '.travis.yml',
    'appveyor.yml',
    'circle.yml',
    'Gruntfile.js',
    'Gulpfile.js',
    'karma.conf.js',
    'webpack.config.js',
    '.babelrc',
    '.nycrc',
    'jest.config.*',
    'rollup.config.*',
  ],
  dirs: [
    'test',
    'tests',
    '__tests__',
    'spec',
    'specs',
    'docs',
    'doc',
    'documentation',
    'example',
    'examples',
    'demo',
    'demos',
    '.github',
    '.vscode',
    '.idea',
    'coverage',
    '.nyc_output',
    '.bin', // Remove bin symlinks - not needed at runtime and causes broken symlinks
  ],
  packages: ['typescript', '@types'],
};

function log(msg) {
  console.log(`[bundle-lighthouse] ${msg}`);
}

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function getDirSize(dir) {
  let size = 0;
  if (!existsSync(dir)) return 0;

  const files = readdirSync(dir);
  for (const file of files) {
    const path = join(dir, file);
    try {
      // Use lstatSync to handle symlinks without following them
      const stat = statSync(path);
      if (stat.isDirectory()) {
        size += getDirSize(path);
      } else {
        size += stat.size;
      }
    } catch {
      // Ignore broken symlinks or inaccessible files
    }
  }
  return size;
}

function removeMatchingFiles(dir, patterns) {
  if (!existsSync(dir)) return;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Check if directory should be removed
      if (patterns.dirs.includes(entry.name)) {
        rmSync(fullPath, { recursive: true, force: true });
        continue;
      }
      // Check if it's a package to remove
      if (patterns.packages.includes(entry.name)) {
        rmSync(fullPath, { recursive: true, force: true });
        continue;
      }
      // Recurse into directory
      removeMatchingFiles(fullPath, patterns);
    } else {
      // Check file patterns
      for (const pattern of patterns.files) {
        const regex = new RegExp(
          '^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$',
          'i'
        );
        if (regex.test(entry.name)) {
          unlinkSync(fullPath);
          break;
        }
      }
    }
  }
}

async function main() {
  log('=== Bundling Lighthouse Sidecar ===');

  // Clean previous bundle
  if (existsSync(RESOURCES_DIR)) {
    log('Cleaning previous bundle...');
    rmSync(RESOURCES_DIR, { recursive: true, force: true });
  }
  mkdirSync(RESOURCES_DIR, { recursive: true });

  // Copy the main script
  log('Copying main script...');
  cpSync(join(SIDECAR_DIR, 'src', 'node-main.mjs'), join(RESOURCES_DIR, 'node-main.mjs'));

  // Create minimal package.json
  log('Creating minimal package.json...');
  const packageJson = {
    name: 'lighthouse-sidecar-bundle',
    version: '1.0.0',
    private: true,
    type: 'module',
    dependencies: {
      'chrome-launcher': '^1.2.1',
      lighthouse: '^12.2.1',
      'lighthouse-plugin-ecoindex': '^4.0.0',
    },
  };
  writeFileSync(join(RESOURCES_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));

  // Install production dependencies
  log('Installing production dependencies (this may take a while)...');
  execSync('npm install --omit=dev --ignore-scripts', {
    cwd: RESOURCES_DIR,
    stdio: 'inherit',
  });

  const nodeModulesDir = join(RESOURCES_DIR, 'node_modules');
  const sizeBefore = getDirSize(nodeModulesDir);
  log(`Size before optimization: ${formatSize(sizeBefore)}`);

  // Optimize node_modules
  log('Optimizing node_modules...');
  removeMatchingFiles(nodeModulesDir, REMOVE_PATTERNS);

  // Remove package-lock.json
  const lockFile = join(RESOURCES_DIR, 'package-lock.json');
  if (existsSync(lockFile)) {
    unlinkSync(lockFile);
  }

  const sizeAfter = getDirSize(nodeModulesDir);
  const totalSize = getDirSize(RESOURCES_DIR);

  log('');
  log('=== Bundle Complete ===');
  log(
    `node_modules: ${formatSize(sizeBefore)} -> ${formatSize(sizeAfter)} (-${formatSize(sizeBefore - sizeAfter)})`
  );
  log(`Total bundle size: ${formatSize(totalSize)}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
