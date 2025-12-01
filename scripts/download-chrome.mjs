#!/usr/bin/env node
/**
 * Download Chrome Headless Shell for Tauri with optimizations
 * Usage: node scripts/download-chrome.mjs [platform]
 * Platforms: win, linux, mac-arm, mac-x64 (default: auto-detect)
 */

import { createWriteStream, existsSync, mkdirSync, rmSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fetch, ProxyAgent } from 'undici';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = dirname(__dirname);
const BINARIES_DIR = join(ROOT_DIR, 'src-tauri', 'binaries');

// Chrome Headless Shell version (stable)
const CHROME_VERSION = '142.0.7444.175';
const BASE_URL = `https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}`;

// Locales to keep
const KEEP_LOCALES = ['en-US', 'en-GB', 'fr'];
const KEEP_HYPHEN = ['hyph-en-us', 'hyph-en-gb', 'hyph-fr'];

const PLATFORMS = {
  win: {
    url: `${BASE_URL}/win64/chrome-headless-shell-win64.zip`,
    extractedName: 'chrome-headless-shell-win64',
    targetName: 'chrome-headless-shell-x86_64-pc-windows-msvc',
  },
  linux: {
    url: `${BASE_URL}/linux64/chrome-headless-shell-linux64.zip`,
    extractedName: 'chrome-headless-shell-linux64',
    targetName: 'chrome-headless-shell-x86_64-unknown-linux-gnu',
  },
  'mac-arm': {
    url: `${BASE_URL}/mac-arm64/chrome-headless-shell-mac-arm64.zip`,
    extractedName: 'chrome-headless-shell-mac-arm64',
    targetName: 'chrome-headless-shell-aarch64-apple-darwin',
  },
  'mac-x64': {
    url: `${BASE_URL}/mac-x64/chrome-headless-shell-mac-x64.zip`,
    extractedName: 'chrome-headless-shell-mac-x64',
    targetName: 'chrome-headless-shell-x86_64-apple-darwin',
  },
};

function log(msg) {
  console.log(`[download-chrome] ${msg}`);
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

function getProxyAgent() {
  const proxyUrl =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
}

async function downloadFile(url, dest) {
  log(`Downloading from ${url}...`);
  const dispatcher = getProxyAgent();

  const response = await fetch(url, { dispatcher });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const total = parseInt(response.headers.get('content-length'), 10);
  let downloaded = 0;

  const file = createWriteStream(dest);

  await pipeline(
    response.body,
    new Writable({
      write(chunk, encoding, callback) {
        downloaded += chunk.length;
        if (total) {
          const percent = ((downloaded / total) * 100).toFixed(1);
          process.stdout.write(`\r[download-chrome] Progress: ${percent}%`);
        }
        file.write(chunk, callback);
      },
      final(callback) {
        console.log('');
        file.end(callback);
      },
    })
  );
}

function extractZip(zipPath, destDir) {
  log('Extracting...');
  // Use PowerShell on Windows, unzip on Unix
  if (process.platform === 'win32') {
    execSync(
      `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
      {
        stdio: 'inherit',
      }
    );
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
  }
}

function optimizeLocales(chromeDir) {
  const localesDir = join(chromeDir, 'locales');
  if (!existsSync(localesDir)) return;

  log('Optimizing locales...');
  const files = readdirSync(localesDir);
  let removed = 0;

  for (const file of files) {
    if (!file.endsWith('.pak')) continue;

    // Get base name without extension and variants
    let baseName = file.replace('.pak', '');
    baseName = baseName.replace(/_FEMININE$|_MASCULINE$|_NEUTER$/, '');

    if (!KEEP_LOCALES.includes(baseName)) {
      unlinkSync(join(localesDir, file));
      removed++;
    }
  }
  log(`Removed ${removed} locale files`);
}

function optimizeHyphenData(chromeDir) {
  const hyphenDir = join(chromeDir, 'hyphen-data');
  if (!existsSync(hyphenDir)) return;

  log('Optimizing hyphen data...');
  const files = readdirSync(hyphenDir);
  let removed = 0;

  for (const file of files) {
    if (!file.endsWith('.hyb')) continue;

    const baseName = file.replace('.hyb', '');
    if (!KEEP_HYPHEN.includes(baseName)) {
      unlinkSync(join(hyphenDir, file));
      removed++;
    }
  }
  log(`Removed ${removed} hyphen files`);
}

async function downloadChrome(platformKey) {
  const platform = PLATFORMS[platformKey];
  if (!platform) {
    console.error(`Unknown platform: ${platformKey}`);
    console.error(`Available platforms: ${Object.keys(PLATFORMS).join(', ')}`);
    process.exit(1);
  }

  log(`=== Downloading Chrome Headless Shell for ${platformKey} ===`);

  // Create binaries directory
  mkdirSync(BINARIES_DIR, { recursive: true });

  const zipPath = join(BINARIES_DIR, 'chrome-headless-shell.zip');
  const targetDir = join(BINARIES_DIR, platform.targetName);

  // Download
  await downloadFile(platform.url, zipPath);

  // Extract
  extractZip(zipPath, BINARIES_DIR);

  // Remove zip
  unlinkSync(zipPath);

  // Rename extracted directory
  const extractedDir = join(BINARIES_DIR, platform.extractedName);
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }
  execSync(
    process.platform === 'win32'
      ? `move "${extractedDir}" "${targetDir}"`
      : `mv "${extractedDir}" "${targetDir}"`
  );

  // Optimize
  optimizeLocales(targetDir);
  optimizeHyphenData(targetDir);

  log(`Chrome Headless Shell installed: ${targetDir}`);

  // Show size
  const { execSync: exec } = await import('node:child_process');
  try {
    if (process.platform === 'win32') {
      const output = exec(
        `powershell -command "(Get-ChildItem -Recurse '${targetDir}' | Measure-Object -Property Length -Sum).Sum / 1MB"`,
        { encoding: 'utf8' }
      );
      log(`Size: ${parseFloat(output).toFixed(1)} MB`);
    } else {
      const output = exec(`du -sh "${targetDir}"`, { encoding: 'utf8' });
      log(`Size: ${output.trim()}`);
    }
  } catch {
    // Ignore size calculation errors
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
    await downloadChrome(p);
  }
} else {
  await downloadChrome(platform);
}

log('=== Download Complete ===');
