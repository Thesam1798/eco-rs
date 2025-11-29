#!/usr/bin/env node
/**
 * Download portable Node.js for Tauri sidecar
 * Usage: node scripts/download-node.mjs [platform]
 * Platforms: win, linux, mac-arm, mac-x64 (default: auto-detect)
 */

import {
  createWriteStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  renameSync,
  chmodSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);
const BINARIES_DIR = join(ROOT_DIR, 'src-tauri', 'binaries');

// Node.js LTS version
const NODE_VERSION = '22.16.0';
const BASE_URL = `https://nodejs.org/dist/v${NODE_VERSION}`;

const PLATFORMS = {
  win: {
    url: `${BASE_URL}/node-v${NODE_VERSION}-win-x64.zip`,
    archiveType: 'zip',
    extractedName: `node-v${NODE_VERSION}-win-x64`,
    binaryName: 'node.exe',
    targetName: 'node-x86_64-pc-windows-msvc.exe',
  },
  linux: {
    url: `${BASE_URL}/node-v${NODE_VERSION}-linux-x64.tar.xz`,
    archiveType: 'tar.xz',
    extractedName: `node-v${NODE_VERSION}-linux-x64`,
    binaryName: 'node',
    targetName: 'node-x86_64-unknown-linux-gnu',
  },
  'mac-arm': {
    url: `${BASE_URL}/node-v${NODE_VERSION}-darwin-arm64.tar.gz`,
    archiveType: 'tar.gz',
    extractedName: `node-v${NODE_VERSION}-darwin-arm64`,
    binaryName: 'node',
    targetName: 'node-aarch64-apple-darwin',
  },
  'mac-x64': {
    url: `${BASE_URL}/node-v${NODE_VERSION}-darwin-x64.tar.gz`,
    archiveType: 'tar.gz',
    extractedName: `node-v${NODE_VERSION}-darwin-x64`,
    binaryName: 'node',
    targetName: 'node-x86_64-apple-darwin',
  },
};

function log(msg) {
  console.log(`[download-node] ${msg}`);
}

function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') return 'win';
  if (platform === 'linux') return 'linux';
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'mac-arm' : 'mac-x64';
  }
  return null;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    log(`Downloading from ${url}...`);

    const request = (url) => {
      https
        .get(url, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            request(response.headers.location);
            return;
          }

          const total = parseInt(response.headers['content-length'], 10);
          let downloaded = 0;

          response.on('data', (chunk) => {
            downloaded += chunk.length;
            const percent = ((downloaded / total) * 100).toFixed(1);
            process.stdout.write(`\r[download-node] Progress: ${percent}%`);
          });

          response.pipe(file);
          file.on('finish', () => {
            console.log('');
            file.close(resolve);
          });
        })
        .on('error', (err) => {
          unlinkSync(dest);
          reject(err);
        });
    };

    request(url);
  });
}

function extractArchive(archivePath, destDir, archiveType) {
  log('Extracting...');

  if (archiveType === 'zip') {
    if (process.platform === 'win32') {
      execSync(
        `powershell -command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`,
        {
          stdio: 'inherit',
        }
      );
    } else {
      execSync(`unzip -o "${archivePath}" -d "${destDir}"`, { stdio: 'inherit' });
    }
  } else if (archiveType === 'tar.gz') {
    execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });
  } else if (archiveType === 'tar.xz') {
    execSync(`tar -xJf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });
  }
}

async function downloadNode(platformKey) {
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    console.error(`Unknown platform: ${platformKey}`);
    console.error(`Available platforms: ${Object.keys(PLATFORMS).join(', ')}`);
    process.exit(1);
  }

  log(`=== Downloading Node.js ${NODE_VERSION} for ${platformKey} ===`);

  // Create binaries directory
  mkdirSync(BINARIES_DIR, { recursive: true });

  const ext =
    platform.archiveType === 'zip'
      ? '.zip'
      : platform.archiveType === 'tar.gz'
        ? '.tar.gz'
        : '.tar.xz';
  const archivePath = join(BINARIES_DIR, `node${ext}`);
  const targetPath = join(BINARIES_DIR, platform.targetName);

  // Download
  await downloadFile(platform.url, archivePath);

  // Extract
  extractArchive(archivePath, BINARIES_DIR, platform.archiveType);

  // Remove archive
  unlinkSync(archivePath);

  // Move binary to target location
  const extractedDir = join(BINARIES_DIR, platform.extractedName);
  const binaryPath = join(extractedDir, 'bin', platform.binaryName);
  const binaryPathAlt = join(extractedDir, platform.binaryName); // Windows structure

  const sourcePath = existsSync(binaryPath) ? binaryPath : binaryPathAlt;

  if (existsSync(targetPath)) {
    unlinkSync(targetPath);
  }

  // Copy binary
  const { copyFileSync } = await import('node:fs');
  copyFileSync(sourcePath, targetPath);

  // Make executable on Unix
  if (process.platform !== 'win32') {
    chmodSync(targetPath, 0o755);
  }

  // Clean up extracted directory
  const { rmSync } = await import('node:fs');
  rmSync(extractedDir, { recursive: true, force: true });

  log(`Node.js installed: ${targetPath}`);

  // Show size
  try {
    const { statSync } = await import('node:fs');
    const size = statSync(targetPath).size / (1024 * 1024);
    log(`Size: ${size.toFixed(1)} MB`);
  } catch {
    // Ignore
  }
}

// Main
const platformArg = process.argv[2];
const platform = platformArg || detectPlatform();

if (!platform) {
  console.error('Could not detect platform. Please specify: win, linux, mac-arm, or mac-x64');
  process.exit(1);
}

if (platformArg === 'all') {
  for (const p of Object.keys(PLATFORMS)) {
    await downloadNode(p);
  }
} else {
  await downloadNode(platform);
}

log('=== Download Complete ===');
