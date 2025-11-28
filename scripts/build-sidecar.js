#!/usr/bin/env node

/**
 * Build script for Lighthouse Sidecar
 *
 * Compiles TypeScript and packages with pkg for the current platform.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const sidecarDir = join(rootDir, 'lighthouse-sidecar');
const binariesDir = join(rootDir, 'src-tauri', 'binaries');

// Targets Tauri (nom doit matcher exactement)
const targets = [
  { pkg: 'node22-win-x64', tauri: 'x86_64-pc-windows-msvc', ext: '.exe' },
  { pkg: 'node22-linux-x64', tauri: 'x86_64-unknown-linux-gnu', ext: '' },
  { pkg: 'node22-macos-x64', tauri: 'x86_64-apple-darwin', ext: '' },
  { pkg: 'node22-macos-arm64', tauri: 'aarch64-apple-darwin', ext: '' },
];

/**
 * Run a command and log it.
 */
function run(cmd, cwd = rootDir) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

/**
 * Main build function.
 */
async function main() {
  console.log('=== Building Lighthouse Sidecar ===\n');

  // Créer le dossier binaries
  if (!existsSync(binariesDir)) {
    mkdirSync(binariesDir, { recursive: true });
  }

  // Installer les dépendances
  console.log('Installing dependencies...');
  run('pnpm install', sidecarDir);

  // Build TypeScript
  console.log('\nBuilding TypeScript...');
  run('pnpm run build', sidecarDir);

  // Détecter la plateforme courante
  const platform = process.platform;
  const arch = process.arch;

  let currentTarget = null;
  if (platform === 'win32') {
    currentTarget = targets.find((t) => t.tauri === 'x86_64-pc-windows-msvc');
  } else if (platform === 'linux') {
    currentTarget = targets.find((t) => t.tauri === 'x86_64-unknown-linux-gnu');
  } else if (platform === 'darwin') {
    currentTarget =
      arch === 'arm64'
        ? targets.find((t) => t.tauri === 'aarch64-apple-darwin')
        : targets.find((t) => t.tauri === 'x86_64-apple-darwin');
  }

  if (!currentTarget) {
    console.error(`Unsupported platform: ${platform}-${arch}`);
    process.exit(1);
  }

  // Build pour la plateforme courante seulement (CI fera le reste)
  console.log(`\nPackaging for ${currentTarget.tauri}...`);
  const outputName = `lighthouse-sidecar-${currentTarget.tauri}${currentTarget.ext}`;
  const outputPath = join(binariesDir, outputName);

  run(`npx @yao-pkg/pkg dist/index.js -t ${currentTarget.pkg} -o "${outputPath}"`, sidecarDir);

  console.log(`\n✓ Built: ${outputPath}`);
  console.log('\n=== Build Complete ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
