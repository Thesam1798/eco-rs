/**
 * Lighthouse Runner
 *
 * Executes Lighthouse with the `EcoIndex` plugin and extracts metrics.
 */

import lighthouse from 'lighthouse';
import { createLighthouseConfig } from './config.js';
import type {
  AnalysisResult,
  AnalysisError,
  EcoIndexMetrics,
  PerformanceMetrics,
  AccessibilityMetrics,
  AccessibilityIssue,
  BestPracticesMetrics,
  SeoMetrics,
  LHResult,
  LHAuditResult,
} from './types.js';

/**
 * Exécute Lighthouse avec le plugin `EcoIndex`.
 */
export async function runAnalysis(
  url: string,
  chromePath: string,
  includeHtml = false
): Promise<AnalysisResult | AnalysisError> {
  try {
    const { flags, config } = createLighthouseConfig(chromePath);

    // Ajouter HTML si demandé
    if (includeHtml) {
      flags.output = ['json', 'html'];
    }

    const result = await lighthouse(url, flags, config);

    if (!result || !result.lhr) {
      return {
        error: true,
        code: 'LIGHTHOUSE_NO_RESULT',
        message: 'Lighthouse did not return a result',
      };
    }

    const lhr = result.lhr as unknown as LHResult;

    // Extraire les métriques EcoIndex du plugin
    const ecoindex = extractEcoIndexMetrics(lhr);

    // Extraire les métriques Performance
    const performance = extractPerformanceMetrics(lhr);

    // Extraire les métriques Accessibility
    const accessibility = extractAccessibilityMetrics(lhr);

    // Extraire Best Practices
    const bestPractices = extractBestPracticesMetrics(lhr);

    // Extraire SEO
    const seo = extractSeoMetrics(lhr);

    const analysisResult: AnalysisResult = {
      url: lhr.finalDisplayedUrl || url,
      timestamp: new Date().toISOString(),
      ecoindex,
      performance,
      accessibility,
      bestPractices,
      seo,
    };

    // Ajouter le rapport HTML si demandé
    if (includeHtml && result.report) {
      const reports = Array.isArray(result.report)
        ? result.report
        : [result.report];
      const htmlReport = reports.find(
        r => r.startsWith('<!doctype html>') || r.startsWith('<html')
      );
      if (htmlReport) {
        analysisResult.rawLighthouseReport = htmlReport;
      }
    }

    return analysisResult;
  } catch (error) {
    return {
      error: true,
      code: 'LIGHTHOUSE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
    };
  }
}

/**
 * Extrait les métriques `EcoIndex` du rapport Lighthouse.
 */
function extractEcoIndexMetrics(lhr: LHResult): EcoIndexMetrics {
  // Le plugin ecoindex ajoute une catégorie 'lighthouse-plugin-ecoindex'
  const ecoCategory = lhr.categories['lighthouse-plugin-ecoindex'];

  // Récupérer les audits du plugin
  const audits = lhr.audits;

  // Noms des audits du plugin (peuvent varier selon la version)
  const scoreAudit = audits['ecoindex-score'] || audits['eco-index-score'];
  const gradeAudit = audits['ecoindex-grade'] || audits['eco-index-grade'];
  const ghgAudit =
    audits['ecoindex-ghg'] ||
    audits['eco-index-ghg'] ||
    audits['ecoindex-greenhouse-gases'];
  const waterAudit = audits['ecoindex-water'] || audits['eco-index-water'];
  const domAudit =
    audits['ecoindex-dom'] ||
    audits['eco-index-dom'] ||
    audits['ecoindex-dom-elements'];
  const requestsAudit =
    audits['ecoindex-requests'] ||
    audits['eco-index-requests'] ||
    audits['ecoindex-request-count'];
  const sizeAudit =
    audits['ecoindex-size'] ||
    audits['eco-index-size'] ||
    audits['ecoindex-page-size'];

  // Extraire les valeurs numériques
  const score = extractNumericValue(
    scoreAudit,
    ecoCategory?.score ? ecoCategory.score * 100 : 50
  );
  const grade = extractStringValue(gradeAudit, 'D');
  const ghg = extractNumericValue(ghgAudit, 2.5);
  const water = extractNumericValue(waterAudit, 3.75);
  const domElements = extractNumericValue(domAudit, 500);
  const requests = extractNumericValue(requestsAudit, 50);
  const sizeKb = extractNumericValue(sizeAudit, 1000);

  return {
    score: Math.round(score * 100) / 100,
    grade,
    ghg: Math.round(ghg * 100) / 100,
    water: Math.round(water * 100) / 100,
    domElements: Math.round(domElements),
    requests: Math.round(requests),
    sizeKb: Math.round(sizeKb * 100) / 100,
  };
}

/**
 * Extrait les métriques Performance.
 */
function extractPerformanceMetrics(lhr: LHResult): PerformanceMetrics {
  const audits = lhr.audits;
  const perfCategory = lhr.categories['performance'];

  return {
    performanceScore: Math.round((perfCategory?.score || 0) * 100),
    firstContentfulPaint: extractNumericValue(
      audits['first-contentful-paint'],
      0
    ),
    largestContentfulPaint: extractNumericValue(
      audits['largest-contentful-paint'],
      0
    ),
    totalBlockingTime: extractNumericValue(audits['total-blocking-time'], 0),
    cumulativeLayoutShift: extractNumericValue(
      audits['cumulative-layout-shift'],
      0
    ),
    speedIndex: extractNumericValue(audits['speed-index'], 0),
    timeToInteractive: extractNumericValue(audits['interactive'], 0),
  };
}

/**
 * Extrait les métriques Accessibility.
 */
function extractAccessibilityMetrics(lhr: LHResult): AccessibilityMetrics {
  const a11yCategory = lhr.categories['accessibility'];
  const audits = lhr.audits;

  const issues: AccessibilityIssue[] = [];

  // Parcourir les audits d'accessibilité en échec
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
    issues: issues.slice(0, 10), // Limiter à 10 issues
  };
}

/**
 * Map le poids d'un audit vers un niveau d'impact.
 */
function mapA11yWeight(weight: number | undefined): AccessibilityIssue['impact'] {
  if (!weight) return 'minor';
  if (weight >= 10) return 'critical';
  if (weight >= 5) return 'serious';
  if (weight >= 2) return 'moderate';
  return 'minor';
}

/**
 * Extrait les métriques Best Practices.
 */
function extractBestPracticesMetrics(lhr: LHResult): BestPracticesMetrics {
  const bpCategory = lhr.categories['best-practices'];
  return {
    bestPracticesScore: Math.round((bpCategory?.score || 0) * 100),
  };
}

/**
 * Extrait les métriques SEO.
 */
function extractSeoMetrics(lhr: LHResult): SeoMetrics {
  const seoCategory = lhr.categories['seo'];
  return {
    seoScore: Math.round((seoCategory?.score || 0) * 100),
  };
}

/**
 * Extrait une valeur numérique d'un audit.
 */
function extractNumericValue(
  audit: LHAuditResult | undefined,
  defaultValue: number
): number {
  if (!audit) return defaultValue;

  // numericValue est la valeur brute
  if (typeof audit.numericValue === 'number') {
    return audit.numericValue;
  }

  // Sinon essayer displayValue (peut contenir "2.5 gCO2e")
  if (audit.displayValue) {
    const match = audit.displayValue.match(/[\d.]+/);
    if (match) {
      return parseFloat(match[0]);
    }
  }

  // Sinon utiliser le score * 100 comme approximation
  if (typeof audit.score === 'number') {
    return audit.score * 100;
  }

  return defaultValue;
}

/**
 * Extrait une valeur string d'un audit.
 */
function extractStringValue(
  audit: LHAuditResult | undefined,
  defaultValue: string
): string {
  if (!audit) return defaultValue;

  if (audit.displayValue) {
    return audit.displayValue.toString().trim();
  }

  return defaultValue;
}
