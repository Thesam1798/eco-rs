#!/usr/bin/env node

/**
 * Lighthouse Sidecar CLI - Node.js version
 *
 * A standalone CLI to run Lighthouse with the EcoIndex plugin using Node.js.
 * Usage: node node-main.mjs <url> <chrome-path> [--html]
 */

import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
// Note: lighthouse-plugin-ecoindex needs to be imported for Lighthouse to find it
import 'lighthouse-plugin-ecoindex';

/**
 * Chrome flags for headless mode
 */
const CHROME_FLAGS = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-sync',
  '--disable-translate',
  '--mute-audio',
  '--no-first-run',
  '--safebrowsing-disable-auto-update',
];

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    return null;
  }

  const url = args[0];
  const chromePath = args[1];
  const includeHtml = args.includes('--html');

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url, chromePath, includeHtml };
}

/**
 * Print usage error
 */
function printUsage() {
  const usage = {
    error: true,
    code: 'INVALID_ARGS',
    message: 'Usage: node node-main.mjs <url> <chrome-path> [--html]',
    details: 'Example: node node-main.mjs https://example.com /path/to/chrome',
  };
  console.log(JSON.stringify(usage));
}

/**
 * Run Lighthouse analysis
 */
async function runAnalysis(url, chromePath, includeHtml = false) {
  let chrome = null;

  try {
    // Launch Chrome
    chrome = await chromeLauncher.launch({
      chromePath,
      chromeFlags: CHROME_FLAGS,
    });

    // Lighthouse config with EcoIndex plugin
    const config = {
      extends: 'lighthouse:default',
      plugins: ['lighthouse-plugin-ecoindex'],
      settings: {
        onlyCategories: [
          'performance',
          'accessibility',
          'best-practices',
          'seo',
          'lighthouse-plugin-ecoindex',
        ],
        throttling: {
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
          rttMs: 0,
          throughputKbps: 0,
        },
        formFactor: 'desktop',
        screenEmulation: {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false,
        },
        maxWaitForFcp: 30000,
        maxWaitForLoad: 45000,
      },
    };

    const flags = {
      port: chrome.port,
      output: includeHtml ? ['json', 'html'] : ['json'],
      logLevel: 'error',
    };

    const result = await lighthouse(url, flags, config);

    if (!result || !result.lhr) {
      return {
        error: true,
        code: 'LIGHTHOUSE_NO_RESULT',
        message: 'Lighthouse did not return a result',
      };
    }

    const lhr = result.lhr;

    // Extract metrics
    const analysisResult = {
      url: lhr.finalDisplayedUrl || url,
      timestamp: new Date().toISOString(),
      ecoindex: extractEcoIndexMetrics(lhr),
      performance: extractPerformanceMetrics(lhr),
      accessibility: extractAccessibilityMetrics(lhr),
      bestPractices: extractBestPracticesMetrics(lhr),
      seo: extractSeoMetrics(lhr),
    };

    // Add HTML report if requested
    if (includeHtml && result.report) {
      const reports = Array.isArray(result.report) ? result.report : [result.report];
      const htmlReport = reports.find(
        (r) => r.startsWith('<!doctype html>') || r.startsWith('<html')
      );
      if (htmlReport) {
        analysisResult.rawLighthouseReport = htmlReport;
      }
    }

    return analysisResult;
  } catch (error) {
    console.error('[LIGHTHOUSE_SIDECAR_DEBUG]', error);

    let message = 'Unknown error';
    let details;

    if (error instanceof Error) {
      message = error.message;
      details = error.stack;
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = JSON.stringify(error);
    }

    return {
      error: true,
      code: 'LIGHTHOUSE_ERROR',
      message,
      details,
    };
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

/**
 * Extract EcoIndex metrics from Lighthouse result
 */
function extractEcoIndexMetrics(lhr) {
  const audits = lhr.audits || {};
  const ecoCategory = lhr.categories?.['lighthouse-plugin-ecoindex'];

  // Try different audit naming conventions
  const getAudit = (names) => {
    for (const name of names) {
      if (audits[name]) return audits[name];
    }
    return null;
  };

  const scoreAudit = getAudit(['eco-index-score', 'ecoindex-score']);
  const gradeAudit = getAudit(['eco-index-grade', 'ecoindex-grade']);
  const ghgAudit = getAudit(['eco-index-ghg', 'ecoindex-ghg']);
  const waterAudit = getAudit(['eco-index-water', 'ecoindex-water']);
  const domAudit = getAudit(['eco-index-nodes', 'ecoindex-nodes', 'ecoindex-dom']);
  const requestsAudit = getAudit(['eco-index-requests', 'ecoindex-requests']);
  const sizeAudit = getAudit(['eco-index-size', 'ecoindex-size']);

  return {
    score:
      Math.round(
        extractNumericValue(scoreAudit, ecoCategory?.score ? ecoCategory.score * 100 : 50) * 100
      ) / 100,
    grade: extractStringValue(gradeAudit, 'D'),
    ghg: Math.round(extractNumericValue(ghgAudit, 2.5) * 100) / 100,
    water: Math.round(extractNumericValue(waterAudit, 3.75) * 100) / 100,
    domElements: Math.round(extractNumericValue(domAudit, 500)),
    requests: Math.round(extractNumericValue(requestsAudit, 50)),
    sizeKb: Math.round(extractNumericValue(sizeAudit, 1000) * 100) / 100,
  };
}

/**
 * Extract Performance metrics
 */
function extractPerformanceMetrics(lhr) {
  const audits = lhr.audits || {};
  const perfCategory = lhr.categories?.['performance'];

  return {
    performanceScore: Math.round((perfCategory?.score || 0) * 100),
    firstContentfulPaint: extractNumericValue(audits['first-contentful-paint'], 0),
    largestContentfulPaint: extractNumericValue(audits['largest-contentful-paint'], 0),
    totalBlockingTime: extractNumericValue(audits['total-blocking-time'], 0),
    cumulativeLayoutShift: extractNumericValue(audits['cumulative-layout-shift'], 0),
    speedIndex: extractNumericValue(audits['speed-index'], 0),
    timeToInteractive: extractNumericValue(audits['interactive'], 0),
  };
}

/**
 * Extract Accessibility metrics
 */
function extractAccessibilityMetrics(lhr) {
  const a11yCategory = lhr.categories?.['accessibility'];
  const audits = lhr.audits || {};
  const issues = [];

  if (a11yCategory?.auditRefs) {
    for (const ref of a11yCategory.auditRefs) {
      const audit = audits[ref.id];
      if (audit && audit.score !== null && audit.score < 1) {
        issues.push({
          id: ref.id,
          title: audit.title || ref.id,
          impact: mapA11yWeight(ref.weight),
        });
      }
    }
  }

  return {
    accessibilityScore: Math.round((a11yCategory?.score || 0) * 100),
    issues: issues.slice(0, 10),
  };
}

/**
 * Map accessibility weight to impact level
 */
function mapA11yWeight(weight) {
  if (!weight) return 'minor';
  if (weight >= 10) return 'critical';
  if (weight >= 5) return 'serious';
  if (weight >= 2) return 'moderate';
  return 'minor';
}

/**
 * Extract Best Practices metrics
 */
function extractBestPracticesMetrics(lhr) {
  const bpCategory = lhr.categories?.['best-practices'];
  return {
    bestPracticesScore: Math.round((bpCategory?.score || 0) * 100),
  };
}

/**
 * Extract SEO metrics
 */
function extractSeoMetrics(lhr) {
  const seoCategory = lhr.categories?.['seo'];
  return {
    seoScore: Math.round((seoCategory?.score || 0) * 100),
  };
}

/**
 * Extract numeric value from audit
 */
function extractNumericValue(audit, defaultValue) {
  if (!audit) return defaultValue;

  if (typeof audit.numericValue === 'number') {
    return audit.numericValue;
  }

  if (audit.displayValue) {
    const match = audit.displayValue.match(/[\d.]+/);
    if (match) {
      return parseFloat(match[0]);
    }
  }

  if (typeof audit.score === 'number') {
    return audit.score * 100;
  }

  return defaultValue;
}

/**
 * Extract string value from audit
 */
function extractStringValue(audit, defaultValue) {
  if (!audit) return defaultValue;

  if (audit.displayValue) {
    return audit.displayValue.toString().trim();
  }

  return defaultValue;
}

/**
 * Main entry point
 */
async function main() {
  const args = parseArgs();

  if (!args) {
    printUsage();
    process.exit(1);
  }

  const { url, chromePath, includeHtml } = args;

  const result = await runAnalysis(url, chromePath, includeHtml);

  // Always output JSON to stdout
  console.log(JSON.stringify(result));

  // Exit code based on success/failure
  if ('error' in result && result.error) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  const errorOutput = {
    error: true,
    code: 'UNEXPECTED_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  };
  console.log(JSON.stringify(errorOutput));
  process.exit(1);
});
