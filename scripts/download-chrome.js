#!/usr/bin/env node

/**
 * Downloads Chrome for Testing for the target platform.
 * Usage: node scripts/download-chrome.js [platform]
 * Platforms: win64, linux64, mac-x64, mac-arm64
 */

import { execSync } from 'child_process';
import { createWriteStream, existsSync, mkdirSync, rmSync, renameSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BINARIES_DIR = join(ROOT_DIR, 'src-tauri', 'binaries');

// Chrome for Testing API
const CHROME_API =
  'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json';

// Platform mapping to Tauri target triple
const PLATFORM_MAP = {
  win64: {
    tauriTarget: 'x86_64-pc-windows-msvc',
    execName: 'chrome.exe',
  },
  linux64: {
    tauriTarget: 'x86_64-unknown-linux-gnu',
    execName: 'chrome',
  },
  'mac-x64': {
    tauriTarget: 'x86_64-apple-darwin',
    execName: 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  },
  'mac-arm64': {
    tauriTarget: 'aarch64-apple-darwin',
    execName: 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
  },
};

/**
 * Fetches download URLs from Chrome for Testing API
 */
async function fetchChromeUrls() {
  console.log('Fetching Chrome for Testing versions...');
  const response = await fetch(CHROME_API);
  if (!response.ok) {
    throw new Error(`Failed to fetch Chrome API: ${response.status}`);
  }
  const data = await response.json();
  return data.channels.Stable;
}

/**
 * Downloads a file from URL to destination path
 */
async function downloadFile(url, destPath) {
  console.log(`Downloading: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const fileStream = createWriteStream(destPath);
  await pipeline(response.body, fileStream);
  console.log(`Downloaded: ${destPath}`);
}

/**
 * Extracts a ZIP archive using platform-specific tools
 */
function extractZip(zipPath, destDir) {
  console.log(`Extracting: ${zipPath}`);

  if (process.platform === 'win32') {
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`unzip -o "${zipPath}" -d "${destDir}"`, { stdio: 'inherit' });
  }

  console.log(`Extracted to: ${destDir}`);
}

/**
 * Downloads and installs Chrome for a specific platform
 */
async function downloadChrome(platform) {
  const platformInfo = PLATFORM_MAP[platform];
  if (!platformInfo) {
    throw new Error(
      `Unknown platform: ${platform}. Valid: ${Object.keys(PLATFORM_MAP).join(', ')}`
    );
  }

  const chromeData = await fetchChromeUrls();
  const version = chromeData.version;
  console.log(`Chrome version: ${version}`);

  // Find download URL for the platform
  const downloads = chromeData.downloads.chrome;
  const download = downloads.find((d) => d.platform === platform);
  if (!download) {
    throw new Error(`No download found for platform: ${platform}`);
  }

  const url = download.url;
  const targetDir = join(BINARIES_DIR, `chrome-${platformInfo.tauriTarget}`);
  const tempDir = join(BINARIES_DIR, 'temp');
  const zipPath = join(tempDir, `chrome-${platform}.zip`);

  // Create directories
  mkdirSync(tempDir, { recursive: true });
  mkdirSync(targetDir, { recursive: true });

  // Download
  await downloadFile(url, zipPath);

  // Extract
  extractZip(zipPath, tempDir);

  // Find extracted directory (chrome-xxx-xxx/)
  const extractedDir = join(tempDir, `chrome-${platform}`);

  // Move content to target directory
  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true });
  }
  renameSync(extractedDir, targetDir);

  // Clean up
  rmSync(tempDir, { recursive: true });

  // Make executable on Unix
  if (process.platform !== 'win32') {
    const chromeBin = join(targetDir, platformInfo.execName);
    if (existsSync(chromeBin)) {
      execSync(`chmod +x "${chromeBin}"`);
    }
  }

  console.log(`\nChrome installed: ${targetDir}`);
  console.log(`   Executable: ${platformInfo.execName}`);

  return { version, targetDir };
}

/**
 * Detects the current platform
 */
function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'win32') return 'win64';
  if (platform === 'linux') return 'linux64';
  if (platform === 'darwin') {
    return arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
  }
  throw new Error(`Unsupported platform: ${platform}-${arch}`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || detectPlatform();

  console.log('=== Chrome for Testing Downloader ===\n');
  console.log(`Platform: ${platform}`);
  console.log(`Target: ${PLATFORM_MAP[platform]?.tauriTarget || 'unknown'}\n`);

  // Create binaries directory
  mkdirSync(BINARIES_DIR, { recursive: true });

  await downloadChrome(platform);

  console.log('\n=== Download Complete ===');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
