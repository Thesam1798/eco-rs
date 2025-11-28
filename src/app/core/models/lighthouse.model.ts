import type { EcoIndexGrade } from './ecoindex.model';

/**
 * Métriques EcoIndex extraites du plugin Lighthouse
 */
export interface LighthouseEcoIndex {
  score: number;
  grade: EcoIndexGrade;
  ghg: number;
  water: number;
  domElements: number;
  requests: number;
  sizeKb: number;
}

/**
 * Métriques Performance Lighthouse
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
 * Issue d'accessibilité
 */
export interface AccessibilityIssue {
  id: string;
  title: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
}

/**
 * Métriques Accessibility
 */
export interface AccessibilityMetrics {
  accessibilityScore: number;
  issues: AccessibilityIssue[];
}

/**
 * Métriques Best Practices
 */
export interface BestPracticesMetrics {
  bestPracticesScore: number;
}

/**
 * Métriques SEO
 */
export interface SeoMetrics {
  seoScore: number;
}

/**
 * Résultat Lighthouse complet
 */
export interface LighthouseResult {
  url: string;
  timestamp: string;
  ecoindex: LighthouseEcoIndex;
  performance: PerformanceMetrics;
  accessibility: AccessibilityMetrics;
  bestPractices: BestPracticesMetrics;
  seo: SeoMetrics;
  rawLighthouseReport?: string;
}
