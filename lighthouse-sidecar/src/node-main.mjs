#!/usr/bin/env node

/**
 * Lighthouse Sidecar CLI - Node.js version
 *
 * Aligned with EcoindexApp methodology:
 * - Uses Lighthouse Flow API (startFlow)
 * - Implements warm navigation with scroll pattern
 * - Uses disableStorageReset: true
 * - Counts DOM nodes excluding SVG children
 *
 * Usage: node node-main.mjs <url> <chrome-path> [--html]
 */

import { startFlow } from 'lighthouse';
import puppeteer from 'puppeteer-core';

/**
 * Chrome flags for headless mode (matching EcoindexApp)
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
  '--disable-blink-features=AutomationControlled',
  '--disable-infobars',
  '--window-size=1920,1080',
  '--start-maximized',
];

/**
 * Lighthouse config aligned with EcoindexApp
 */
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
    throttling: {
      cpuSlowdownMultiplier: 1,
    },
    throttlingMethod: 'simulate',
    disableStorageReset: true, // CRITICAL: Keep cookies/storage between navigations
    preset: 'desktop',
    maxWaitForFcp: 30000,
    maxWaitForLoad: 45000,
  },
};

/**
 * EcoIndex quantiles (official values from cnumr/ecoindex_reference)
 */
const QUANTILES_DOM = [
  0, 47, 75, 159, 233, 298, 358, 417, 476, 537, 603, 674, 753, 843, 949, 1076, 1237, 1459, 1801,
  2479, 594601,
];
const QUANTILES_REQ = [
  0, 2, 15, 25, 34, 42, 49, 56, 63, 70, 78, 86, 95, 105, 117, 130, 147, 170, 205, 281, 3920,
];
const QUANTILES_SIZE = [
  0, 1.37, 144.7, 319.53, 479.46, 631.97, 783.38, 937.91, 1098.62, 1265.47, 1448.32, 1648.27,
  1876.08, 2142.06, 2465.37, 2866.31, 3401.59, 4155.73, 5400.08, 8037.54, 223212.26,
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
 * Execute scroll pattern (matching EcoindexApp)
 * Sequence: wait 3s -> scroll to bottom -> wait 3s
 */
async function executeScrollPattern(page) {
  const session = await page.createCDPSession();

  // Initial wait
  await new Promise((r) => setTimeout(r, 3000));

  // Get page dimensions
  const dimensions = await page.evaluate(() => ({
    height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
  }));

  // Scroll to bottom via CDP (matching EcoindexApp)
  await session.send('Input.synthesizeScrollGesture', {
    x: 100,
    y: 600,
    yDistance: -dimensions.height,
    speed: 1000,
  });

  // Final wait
  await new Promise((r) => setTimeout(r, 3000));

  await session.detach();
}

/**
 * Count DOM elements excluding SVG children (EcoIndex methodology)
 * Note: Does NOT count Shadow DOM elements (matching EcoindexApp behavior)
 */
async function countDOMNodesWithoutSVG(page) {
  return page.evaluate(() => {
    // Simple count: body descendants minus SVG children
    // Does NOT include Shadow DOM elements (matching EcoindexApp)
    const allBodyNodes = document.body.querySelectorAll('*').length;
    const svgChildren = Array.from(document.body.querySelectorAll('svg')).reduce(
      (acc, svg) => acc + svg.querySelectorAll('*').length,
      0
    );
    return allBodyNodes - svgChildren;
  });
}

/**
 * Compute quantile position for a value
 */
function computeQuantile(value, quantiles) {
  for (let i = 1; i < quantiles.length; i++) {
    if (value < quantiles[i]) {
      return i - 1 + (value - quantiles[i - 1]) / (quantiles[i] - quantiles[i - 1]);
    }
  }
  return quantiles.length - 1;
}

/**
 * Calculate EcoIndex score and grade
 */
function calculateEcoIndex(dom, requests, sizeKb) {
  const domQ = computeQuantile(dom, QUANTILES_DOM);
  const reqQ = computeQuantile(requests, QUANTILES_REQ);
  const sizeQ = computeQuantile(sizeKb, QUANTILES_SIZE);

  const score = 100 - (5 * (3 * domQ + 2 * reqQ + sizeQ)) / 6;
  const clampedScore = Math.max(0, Math.min(100, score));

  let grade;
  if (clampedScore >= 80) grade = 'A';
  else if (clampedScore >= 70) grade = 'B';
  else if (clampedScore >= 55) grade = 'C';
  else if (clampedScore >= 40) grade = 'D';
  else if (clampedScore >= 25) grade = 'E';
  else if (clampedScore >= 10) grade = 'F';
  else grade = 'G';

  return { score: clampedScore, grade };
}

/**
 * Extract network statistics from Flow result
 */
function extractNetworkStats(lhr) {
  const networkRequestsAudit = lhr.audits?.['network-requests'];
  let totalCompressedSize = 0;
  let requestCount = 0;

  if (!networkRequestsAudit?.details?.items) {
    return { requestCount: 0, totalCompressedSize: 0 };
  }

  for (const record of networkRequestsAudit.details.items) {
    const url = record.url || '';
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      continue;
    }

    const transferSize = record.transferSize || 0;
    if (transferSize === 0) {
      continue;
    }

    totalCompressedSize += transferSize;
    requestCount += 1;
  }

  return { requestCount, totalCompressedSize };
}

/**
 * Extract resource count breakdown by type
 */
function extractResourceBreakdown(lhr) {
  const networkRequestsAudit = lhr.audits?.['network-requests'];
  const breakdown = {
    scripts: 0,
    stylesheets: 0,
    images: 0,
    fonts: 0,
    xhr: 0,
    other: 0,
  };

  if (!networkRequestsAudit?.details?.items) {
    return breakdown;
  }

  for (const item of networkRequestsAudit.details.items) {
    const resourceType = item.resourceType?.toLowerCase() || '';
    const mimeType = item.mimeType?.toLowerCase() || '';
    const url = item.url?.toLowerCase() || '';

    if (resourceType === 'script' || mimeType.includes('javascript')) {
      breakdown.scripts++;
    } else if (resourceType === 'stylesheet' || mimeType.includes('css')) {
      breakdown.stylesheets++;
    } else if (resourceType === 'image' || mimeType.includes('image')) {
      breakdown.images++;
    } else if (
      resourceType === 'font' ||
      mimeType.includes('font') ||
      url.match(/\.(woff2?|ttf|otf|eot)$/)
    ) {
      breakdown.fonts++;
    } else if (resourceType === 'xhr' || resourceType === 'fetch') {
      breakdown.xhr++;
    } else {
      breakdown.other++;
    }
  }

  return breakdown;
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
 * Run Lighthouse analysis using Flow API (matching EcoindexApp methodology)
 */
async function runAnalysis(url, chromePath, includeHtml = false) {
  let browser = null;

  try {
    // Launch browser using puppeteer-core directly
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: CHROME_FLAGS,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // WARM NAVIGATION PATTERN (matching EcoindexApp)
    // Step 1: Cold visit to populate cache
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Step 2: Start Lighthouse Flow for warm navigation
    const flow = await startFlow(page, {
      config: LIGHTHOUSE_CONFIG,
      flags: {
        screenEmulation: { disabled: true },
      },
    });

    // Navigate with Flow API (WARM - cache is populated)
    await flow.navigate(url, {
      stepName: 'EcoIndex Analysis',
    });

    // Execute scroll pattern (wait 3s -> scroll to bottom -> wait 3s)
    await executeScrollPattern(page);

    // Count DOM nodes (excluding SVG children)
    const domElements = await countDOMNodesWithoutSVG(page);

    // Get Flow result
    const flowResult = await flow.createFlowResult();

    if (!flowResult || !flowResult.steps || flowResult.steps.length === 0) {
      return {
        error: true,
        code: 'LIGHTHOUSE_NO_RESULT',
        message: 'Lighthouse Flow did not return a result',
      };
    }

    // Get the navigation step result
    const lhr = flowResult.steps[0].lhr;

    // Extract network metrics
    const { requestCount, totalCompressedSize } = extractNetworkStats(lhr);
    const sizeKb = totalCompressedSize / 1000; // Official uses /1000 (not /1024)

    // Calculate EcoIndex
    const { score, grade } = calculateEcoIndex(domElements, requestCount, sizeKb);

    // Calculate environmental impacts (official formula: 50 - score)
    const ghg = 2 + (2 * (50 - score)) / 100;
    const water = 3 + (3 * (50 - score)) / 100;

    // Extract resource breakdown
    const resourceBreakdown = extractResourceBreakdown(lhr);

    // Build result
    const analysisResult = {
      url: lhr.finalDisplayedUrl || url,
      timestamp: new Date().toISOString(),
      ecoindex: {
        score: Math.round(score * 100) / 100,
        grade,
        ghg: Math.round(ghg * 100) / 100,
        water: Math.round(water * 100) / 100,
        domElements: Math.round(domElements),
        requests: Math.round(requestCount),
        sizeKb: Math.round(sizeKb * 100) / 100,
        resourceBreakdown,
      },
      performance: extractPerformanceMetrics(lhr),
      accessibility: extractAccessibilityMetrics(lhr),
      bestPractices: extractBestPracticesMetrics(lhr),
      seo: extractSeoMetrics(lhr),
    };

    // Add HTML report if requested
    if (includeHtml) {
      try {
        const htmlReport = await flow.generateReport();
        if (htmlReport) {
          analysisResult.rawLighthouseReport = htmlReport;
        }
      } catch {
        // Silently ignore HTML report generation errors
        // The main analysis result is still valid
      }
    }

    return analysisResult;
  } catch (error) {
    // Error details are included in the JSON response
    // No console.error to avoid interfering with stdout JSON parsing
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
    if (browser) {
      await browser.close();
    }
  }
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
