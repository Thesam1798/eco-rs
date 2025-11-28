/**
 * Lighthouse Sidecar Types
 *
 * Type definitions for CLI arguments, results, and Lighthouse metrics.
 */

/**
 * Arguments CLI pour le sidecar
 */
export interface CliArgs {
  url: string;
  chromePath: string;
  outputFormat: 'json' | 'html';
}

/**
 * Résultat `EcoIndex` extrait du plugin
 */
export interface EcoIndexMetrics {
  score: number;
  grade: string;
  ghg: number;
  water: number;
  domElements: number;
  requests: number;
  sizeKb: number;
}

/**
 * Métriques Lighthouse Performance
 */
export interface PerformanceMetrics {
  performanceScore: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  speedIndex: number;
  timeToInteractive: number;
}

/**
 * Métriques Lighthouse Accessibility
 */
export interface AccessibilityMetrics {
  accessibilityScore: number;
  issues: AccessibilityIssue[];
}

export interface AccessibilityIssue {
  id: string;
  title: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
}

/**
 * Métriques Lighthouse Best Practices
 */
export interface BestPracticesMetrics {
  bestPracticesScore: number;
}

/**
 * Métriques Lighthouse SEO
 */
export interface SeoMetrics {
  seoScore: number;
}

/**
 * Résultat complet de l'analyse
 */
export interface AnalysisResult {
  url: string;
  timestamp: string;
  ecoindex: EcoIndexMetrics;
  performance: PerformanceMetrics;
  accessibility: AccessibilityMetrics;
  bestPractices: BestPracticesMetrics;
  seo: SeoMetrics;
  rawLighthouseReport?: string;
}

/**
 * Erreur structurée
 */
export interface AnalysisError {
  error: true;
  code: string;
  message: string;
  details?: string;
}

export type AnalysisOutput = AnalysisResult | AnalysisError;

/**
 * Types Lighthouse minimaux pour éviter d'importer tout lighthouse
 */
export namespace LH {
  export interface Result {
    finalDisplayedUrl?: string;
    categories: Record<string, Category | undefined>;
    audits: Record<string, Audit.Result>;
  }

  export interface Category {
    score: number | null;
    auditRefs?: Array<{ id: string; weight?: number }>;
  }

  export namespace Audit {
    export interface Result {
      score: number | null;
      numericValue?: number;
      displayValue?: string;
      title?: string;
    }
  }
}
