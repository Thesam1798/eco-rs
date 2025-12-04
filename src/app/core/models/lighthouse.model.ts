import type { EcoIndexGrade, ResourceBreakdown } from './ecoindex.model';

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
  resourceBreakdown?: ResourceBreakdown;
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
 * Cache analysis item from uses-long-cache-ttl audit
 */
export interface CacheItem {
  /** Full URL of the resource */
  url: string;
  /** Cache lifetime in milliseconds */
  cacheLifetimeMs: number;
  /** Cache hit probability (0.0 - 1.0) */
  cacheHitProbability: number;
  /** Total bytes of the resource */
  totalBytes: number;
  /** Bytes wasted due to short cache TTL */
  wastedBytes: number;
}

/**
 * Detailed information about a single HTTP request
 */
export interface RequestDetail {
  /** Full URL of the request */
  url: string;
  /** Domain/hostname of the request */
  domain: string;
  /** Protocol used (h2, http/1.1, etc.) */
  protocol: string;
  /** HTTP status code */
  statusCode: number;
  /** MIME type of the response */
  mimeType: string;
  /** Resource type (Document, Script, Stylesheet, Image, Font, XHR, Fetch, Other) */
  resourceType: string;
  /** Transfer size in bytes (compressed, over the wire) */
  transferSize: number;
  /** Resource size in bytes (decompressed) */
  resourceSize: number;
  /** Request priority (VeryHigh, High, Medium, Low, VeryLow) */
  priority: string;
  /** Start time in milliseconds (relative to navigation start) */
  startTime: number;
  /** End time in milliseconds (relative to navigation start) */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Whether the resource was served from cache */
  fromCache: boolean;
  /** Cache lifetime in milliseconds (from uses-long-cache-ttl audit) */
  cacheLifetimeMs: number;
}

// ============================================================================
// Request Analytics (pre-computed by backend)
// ============================================================================

/**
 * Statistics for a single domain
 */
export interface DomainStat {
  domain: string;
  requestCount: number;
  totalTransferSize: number;
  percentage: number;
  color: string;
}

/**
 * Aggregated domain analytics
 */
export interface DomainAnalytics {
  domains: DomainStat[];
  totalRequests: number;
  totalSize: number;
}

/**
 * Statistics for a single protocol
 */
export interface ProtocolStat {
  protocol: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * Aggregated protocol analytics
 */
export interface ProtocolAnalytics {
  protocols: ProtocolStat[];
  totalRequests: number;
}

/**
 * Cache TTL group
 */
export interface CacheGroup {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * Resource with problematic cache TTL
 */
export interface ProblematicResource {
  url: string;
  domain: string;
  filename: string;
  cacheLifetimeMs: number;
  cacheTtlLabel: string;
  badgeClass: string;
  badgeText: string;
  resourceSize: number;
}

/**
 * Aggregated cache analytics
 */
export interface CacheAnalytics {
  groups: CacheGroup[];
  problematicResources: ProblematicResource[];
  totalResources: number;
  problematicCount: number;
}

/**
 * Group of duplicate resources
 */
export interface DuplicateGroup {
  filename: string;
  resourceSize: number;
  resourceType: string;
  urls: string[];
  domains: string[];
  wastedBytes: number;
}

/**
 * Aggregated duplicate analytics
 */
export interface DuplicateAnalytics {
  duplicates: DuplicateGroup[];
  totalWastedBytes: number;
  duplicateCount: number;
}

/**
 * All pre-computed request analytics
 */
export interface RequestAnalytics {
  domainStats: DomainAnalytics;
  protocolStats: ProtocolAnalytics;
  cacheStats: CacheAnalytics;
  duplicateStats: DuplicateAnalytics;
}

// ============================================================================
// Main Result Types
// ============================================================================

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
  /** Detailed information about each HTTP request */
  requests?: RequestDetail[];
  /** Cache analysis from uses-long-cache-ttl audit */
  cacheAnalysis?: CacheItem[];
  /** Path to the HTML report file (if requested) */
  htmlReportPath?: string;
  /** Pre-computed request analytics */
  analytics?: RequestAnalytics;
}
