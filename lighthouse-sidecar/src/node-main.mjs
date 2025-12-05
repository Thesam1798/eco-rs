#!/usr/bin/env node

/**
 * Lighthouse Sidecar CLI - Node.js version (Simplified)
 *
 * Returns raw metrics only - EcoIndex calculation is done in Rust backend.
 *
 * Cold navigation methodology (cache disabled):
 * - Uses Lighthouse Flow API (startFlow)
 * - Implements cold navigation with scroll pattern
 * - Disables all browser caching for real network metrics
 * - Counts DOM nodes excluding SVG children
 *
 * Usage: node node-main.mjs <url> <chrome-path> [--html]
 */

import { startFlow } from 'lighthouse';
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ============================================================================
// Global state for cleanup on exit
// ============================================================================

/** Global browser instance for cleanup on signal */
let activeBrowser = null;

/**
 * Cleanup function to close browser on exit signals
 */
async function cleanup() {
  if (activeBrowser) {
    try {
      await activeBrowser.close();
    } catch {
      // Ignore errors during cleanup
    }
    activeBrowser = null;
  }
  process.exit(0);
}

// Register signal handlers for graceful shutdown
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGHUP', cleanup);

// ============================================================================
// Chrome configuration
// ============================================================================

/**
 * Chrome flags for headless mode with cache disabled
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
  // Disable browser cache for cold analysis
  '--disable-application-cache',
  '--disable-cache',
  '--disk-cache-size=1',
  '--media-cache-size=1',
];

/**
 * Lighthouse config for cold analysis (storage reset enabled)
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
    disableStorageReset: false, // Reset storage for cold analysis (real network metrics)
    preset: 'desktop',
    maxWaitForFcp: 30000,
    maxWaitForLoad: 45000,
  },
};

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
 * Capture TTFB (Time To First Byte) via Navigation Timing API
 * This is more reliable than Lighthouse audits in Flow mode
 */
async function captureNavigationTiming(page) {
  try {
    return await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (nav) {
        // responseStart = time when first byte received
        // fetchStart = time when fetch started
        // TTFB = responseStart - fetchStart
        const ttfb = Math.round(nav.responseStart - nav.fetchStart);
        return {
          ttfb: ttfb > 0 ? ttfb : 0,
          responseStart: Math.round(nav.responseStart),
          fetchStart: Math.round(nav.fetchStart),
        };
      }
      return null;
    });
  } catch {
    return null;
  }
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
 * Includes Shadow DOM elements and iframe contents
 */
async function countDOMNodesWithoutSVG(page) {
  return page.evaluate(() => {
    function countInRoot(root) {
      let total = 0;
      let svgChildren = 0;

      const elements = root.querySelectorAll('*');
      total += elements.length;

      // Count SVG children to subtract (SVG element itself is counted)
      const svgs = root.querySelectorAll('svg');
      for (const svg of svgs) {
        svgChildren += svg.querySelectorAll('*').length;
      }

      // Traverse shadow DOM
      for (const el of elements) {
        if (el.shadowRoot) {
          const shadowResult = countInRoot(el.shadowRoot);
          total += shadowResult.total;
          svgChildren += shadowResult.svgChildren;
        }

        // Traverse iframe content if accessible (same-origin)
        if (el.tagName.toLowerCase() === 'iframe') {
          try {
            const iframeDoc = el.contentDocument || el.contentWindow?.document;
            if (iframeDoc) {
              const iframeResult = countInRoot(iframeDoc);
              total += iframeResult.total;
              svgChildren += iframeResult.svgChildren;
            }
          } catch {
            // Cross-origin iframe - cannot access content
          }
        }
      }

      return { total, svgChildren };
    }

    const result = countInRoot(document);
    return result.total - result.svgChildren;
  });
}

/**
 * Extract network statistics from Flow result
 * Uses total-byte-weight audit for accurate size (works even with cached resources)
 */
function extractNetworkStats(lhr) {
  const networkRequestsAudit = lhr.audits?.['network-requests'];
  const totalByteWeightAudit = lhr.audits?.['total-byte-weight'];

  let totalTransferSize = 0;
  let requestCount = 0;

  // Get total transfer size from total-byte-weight audit (more reliable)
  if (totalByteWeightAudit?.numericValue) {
    totalTransferSize = totalByteWeightAudit.numericValue;
  }

  if (!networkRequestsAudit?.details?.items) {
    return { requestCount: 0, totalTransferSize };
  }

  // Count requests and calculate size from individual items if total-byte-weight not available
  let itemsTransferSize = 0;
  for (const record of networkRequestsAudit.details.items) {
    const url = record.url || '';
    // Skip data: and blob: URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      continue;
    }

    // Count all HTTP requests
    requestCount += 1;

    // Sum transfer sizes (use resourceSize as fallback for cached resources)
    const size = record.transferSize || record.resourceSize || 0;
    itemsTransferSize += size;
  }

  // Use items sum if total-byte-weight not available
  if (totalTransferSize === 0) {
    totalTransferSize = itemsTransferSize;
  }

  return { requestCount, totalTransferSize };
}

/**
 * Extract detailed information for each HTTP request
 * Includes cache TTL from uses-long-cache-ttl audit
 */
function extractRequestDetails(lhr) {
  const networkRequestsAudit = lhr.audits?.['network-requests'];
  if (!networkRequestsAudit?.details?.items) {
    return [];
  }

  // Build a map of cache TTLs from uses-long-cache-ttl audit
  const cacheTtlMap = new Map();
  const cacheAudit = lhr.audits?.['uses-long-cache-ttl'];
  if (cacheAudit?.details?.items) {
    for (const item of cacheAudit.details.items) {
      if (item.url) {
        cacheTtlMap.set(item.url, item.cacheLifetimeMs || 0);
      }
    }
  }

  return networkRequestsAudit.details.items
    .filter((item) => {
      const url = item.url || '';
      // Skip data: and blob: URLs
      return !url.startsWith('data:') && !url.startsWith('blob:');
    })
    .map((item) => {
      const url = item.url || '';
      let domain = '';
      try {
        domain = new URL(url).hostname;
      } catch {
        // Invalid URL
      }

      const transferSize = item.transferSize || 0;
      const resourceSize = item.resourceSize || 0;
      const startTime = item.networkRequestTime || item.rendererStartTime || 0;
      const endTime = item.networkEndTime || startTime;

      // Get cache TTL: if not in audit, assume good cache (1 year)
      // Resources not in audit have cache >= 1 year (good)
      const cacheLifetimeMs = cacheTtlMap.has(url) ? cacheTtlMap.get(url) : 31536000000;

      // For cached resources, transferSize is 0 - use resourceSize as fallback for display
      const displayTransferSize = transferSize > 0 ? transferSize : resourceSize;

      return {
        url,
        domain,
        protocol: item.protocol || 'unknown',
        statusCode: item.statusCode || 0,
        mimeType: item.mimeType || 'unknown',
        resourceType: item.resourceType || 'Other',
        transferSize: displayTransferSize,
        resourceSize,
        priority: item.priority || 'Medium',
        startTime: Math.round(startTime * 100) / 100,
        endTime: Math.round(endTime * 100) / 100,
        duration: Math.round((endTime - startTime) * 100) / 100,
        fromCache: transferSize === 0 && resourceSize > 0,
        cacheLifetimeMs,
      };
    });
}

/**
 * Extract cache analysis from uses-long-cache-ttl audit
 */
function extractCacheAnalysis(lhr) {
  const cacheAudit = lhr.audits?.['uses-long-cache-ttl'];
  if (!cacheAudit?.details?.items) {
    return [];
  }

  return cacheAudit.details.items.map((item) => ({
    url: item.url || '',
    cacheLifetimeMs: item.cacheLifetimeMs || 0,
    cacheHitProbability: item.cacheHitProbability || 0,
    totalBytes: item.totalBytes || 0,
    wastedBytes: item.wastedBytes || 0,
  }));
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
    performance: Math.round((perfCategory?.score || 0) * 100),
    fcp: extractNumericValue(audits['first-contentful-paint'], 0),
    lcp: extractNumericValue(audits['largest-contentful-paint'], 0),
    tbt: extractNumericValue(audits['total-blocking-time'], 0),
    cls: extractNumericValue(audits['cumulative-layout-shift'], 0),
    si: extractNumericValue(audits['speed-index'], 0),
    tti: extractNumericValue(audits['interactive'], 0),
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
    accessibility: Math.round((a11yCategory?.score || 0) * 100),
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
 * Extract Best Practices and SEO scores
 */
function extractOtherScores(lhr) {
  const bpCategory = lhr.categories?.['best-practices'];
  const seoCategory = lhr.categories?.['seo'];

  return {
    bestPractices: Math.round((bpCategory?.score || 0) * 100),
    seo: Math.round((seoCategory?.score || 0) * 100),
  };
}

/**
 * Extract TTFB (Time To First Byte) from server-response-time audit
 * Falls back to calculating from first document request if audit not available
 */
function extractTTFB(lhr) {
  // Try server-response-time audit first
  const audit = lhr.audits?.['server-response-time'];
  if (audit?.numericValue) {
    return {
      ttfb: audit.numericValue,
      displayValue: audit.displayValue || `${Math.round(audit.numericValue)} ms`,
    };
  }

  // Fallback: get TTFB from network-requests (first Document request)
  const networkAudit = lhr.audits?.['network-requests'];
  if (networkAudit?.details?.items) {
    const docRequest = networkAudit.details.items.find(
      (item) => item.resourceType === 'Document' && item.statusCode >= 200 && item.statusCode < 400
    );
    if (docRequest) {
      // TTFB = time from request start to first byte received
      // In Lighthouse, this is approximated by the request duration for the document
      const ttfb = docRequest.networkRequestTime
        ? Math.round(docRequest.networkRequestTime * 1000)
        : Math.round((docRequest.endTime - docRequest.startTime) * 1000);
      return {
        ttfb: ttfb > 0 ? ttfb : 0,
        displayValue: `${ttfb} ms`,
      };
    }
  }

  // Last resort: try timing metrics
  const timing = lhr.audits?.['timing-budget']?.details?.items?.[0];
  if (timing?.ttfb) {
    return {
      ttfb: timing.ttfb,
      displayValue: `${Math.round(timing.ttfb)} ms`,
    };
  }

  return {
    ttfb: 0,
    displayValue: 'N/A',
  };
}

/**
 * Extract coverage stats from unused-javascript and unused-css-rules audits
 */
function extractCoverageStats(lhr) {
  const jsAudit = lhr.audits?.['unused-javascript'];
  const cssAudit = lhr.audits?.['unused-css-rules'];

  const calculateWastedPercentage = (audit) => {
    if (!audit?.details?.items?.length) return 0;
    let totalBytes = 0;
    let wastedBytes = 0;
    for (const item of audit.details.items) {
      totalBytes += item.totalBytes || 0;
      wastedBytes += item.wastedBytes || 0;
    }
    return totalBytes > 0 ? (wastedBytes / totalBytes) * 100 : 0;
  };

  const mapItems = (audit) => {
    if (!audit?.details?.items) return [];
    return audit.details.items.slice(0, 10).map((item) => ({
      url: item.url || '',
      totalBytes: item.totalBytes || 0,
      wastedBytes: item.wastedBytes || 0,
      wastedPercent: item.wastedPercent || 0,
    }));
  };

  return {
    unusedJs: {
      wastedBytes: jsAudit?.details?.overallSavingsBytes || 0,
      wastedPercentage: calculateWastedPercentage(jsAudit),
      items: mapItems(jsAudit),
    },
    unusedCss: {
      wastedBytes: cssAudit?.details?.overallSavingsBytes || 0,
      wastedPercentage: calculateWastedPercentage(cssAudit),
      items: mapItems(cssAudit),
    },
  };
}

/**
 * Extract compression opportunities from uses-text-compression audit
 */
function extractCompressionStats(lhr) {
  const audit = lhr.audits?.['uses-text-compression'];
  return {
    potentialSavings: audit?.details?.overallSavingsBytes || 0,
    items: (audit?.details?.items || []).map((item) => ({
      url: item.url || '',
      totalBytes: item.totalBytes || 0,
      wastedBytes: item.wastedBytes || 0,
    })),
    score: Math.round((audit?.score ?? 1) * 100),
  };
}

/**
 * Extract modern image format opportunities from modern-image-formats audit
 */
function extractImageFormatStats(lhr) {
  const audit = lhr.audits?.['modern-image-formats'];
  return {
    potentialSavings: audit?.details?.overallSavingsBytes || 0,
    items: (audit?.details?.items || []).map((item) => {
      // fromProtocol can be a boolean or string - normalize to string
      let fromFormat = 'unknown';
      if (typeof item.fromProtocol === 'string') {
        fromFormat = item.fromProtocol;
      } else if (item.mimeType) {
        // Extract format from mimeType (e.g., "image/jpeg" -> "jpeg")
        const match = item.mimeType.match(/image\/(\w+)/);
        fromFormat = match ? match[1] : 'unknown';
      } else if (item.url) {
        // Extract format from URL extension (e.g., "image.jpg" -> "jpg")
        const urlMatch = item.url.match(/\.(\w+)(?:\?.*)?$/);
        if (urlMatch) {
          fromFormat = urlMatch[1].toLowerCase();
        }
      }
      return {
        url: item.url || '',
        fromFormat,
        totalBytes: item.totalBytes || 0,
        wastedBytes: item.wastedBytes || 0,
      };
    }),
    score: Math.round((audit?.score ?? 1) * 100),
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
 * Returns raw metrics - EcoIndex calculation is done in Rust
 */
async function runAnalysis(url, chromePath, includeHtml = false) {
  try {
    // Launch browser using puppeteer-core directly
    // Store in global variable for cleanup on signals
    activeBrowser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: CHROME_FLAGS,
    });

    const page = await activeBrowser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Disable cache via CDP for cold analysis (real network metrics)
    const cdpClient = await page.createCDPSession();
    await cdpClient.send('Network.enable');
    await cdpClient.send('Network.setCacheDisabled', { cacheDisabled: true });

    // COLD NAVIGATION - Direct analysis without cache
    const flow = await startFlow(page, {
      config: LIGHTHOUSE_CONFIG,
      flags: {
        screenEmulation: { disabled: true },
      },
    });

    // Navigate with Flow API (COLD - no cache)
    await flow.navigate(url, {
      stepName: 'EcoIndex Analysis',
    });

    // Capture TTFB via Navigation Timing API (more reliable than Lighthouse audits)
    const navTiming = await captureNavigationTiming(page);

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

    // Extract raw network metrics
    const { requestCount, totalTransferSize } = extractNetworkStats(lhr);

    // Extract resource breakdown
    const resourceBreakdown = extractResourceBreakdown(lhr);

    // Extract detailed request information
    const requests = extractRequestDetails(lhr);

    // Extract cache analysis from uses-long-cache-ttl audit
    const cacheAnalysis = extractCacheAnalysis(lhr);

    // Extract Lighthouse scores
    const perfMetrics = extractPerformanceMetrics(lhr);
    const a11yMetrics = extractAccessibilityMetrics(lhr);
    const otherScores = extractOtherScores(lhr);

    // Extract additional audits for UI
    // Use captured navTiming for TTFB (more reliable than Lighthouse audit in Flow mode)
    const ttfb = navTiming
      ? { ttfb: navTiming.ttfb, displayValue: `${navTiming.ttfb} ms` }
      : extractTTFB(lhr); // Fallback to audit-based extraction
    const coverage = extractCoverageStats(lhr);
    const compression = extractCompressionStats(lhr);
    const imageFormats = extractImageFormatStats(lhr);

    // Build result with raw metrics (no EcoIndex calculation)
    const analysisResult = {
      url: lhr.finalDisplayedUrl || url,
      rawMetrics: {
        domElements: Math.round(domElements),
        requests: Math.round(requestCount),
        totalTransferSize: Math.round(totalTransferSize),
      },
      resourceBreakdown,
      requests,
      cacheAnalysis,
      lighthouse: {
        ...perfMetrics,
        accessibility: a11yMetrics.accessibility,
        ...otherScores,
      },
      accessibilityIssues: a11yMetrics.issues,
      ttfb,
      coverage,
      compression,
      imageFormats,
    };

    // Write HTML report to temp file if requested
    if (includeHtml) {
      try {
        const htmlReport = await flow.generateReport();
        if (htmlReport) {
          const reportPath = join(tmpdir(), `lighthouse-report-${Date.now()}.html`);
          writeFileSync(reportPath, htmlReport, 'utf-8');
          analysisResult.htmlReportPath = reportPath;
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
    if (activeBrowser) {
      await activeBrowser.close();
      activeBrowser = null;
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
