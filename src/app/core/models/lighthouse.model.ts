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
// Additional Audit Types (enhanced UI)
// ============================================================================

/**
 * TTFB (Time To First Byte) metrics
 */
export interface TtfbMetrics {
  /** TTFB in milliseconds */
  ttfb: number;
  /** Display value string from Lighthouse */
  displayValue: string;
}

/**
 * Coverage item for unused code analysis
 */
export interface CoverageItem {
  /** Full URL of the resource */
  url: string;
  /** Total bytes of the resource */
  totalBytes: number;
  /** Bytes that are unused */
  wastedBytes: number;
  /** Percentage of unused code */
  wastedPercent: number;
}

/**
 * Statistics for unused code (JS or CSS)
 */
export interface UnusedCodeStats {
  /** Total wasted bytes */
  wastedBytes: number;
  /** Overall wasted percentage */
  wastedPercentage: number;
  /** Individual items with details */
  items: CoverageItem[];
}

/**
 * Coverage analytics (unused JS/CSS)
 */
export interface CoverageAnalytics {
  /** Unused JavaScript statistics */
  unusedJs: UnusedCodeStats;
  /** Unused CSS statistics */
  unusedCss: UnusedCodeStats;
}

/**
 * Compression opportunity item
 */
export interface CompressionItem {
  /** Full URL of the resource */
  url: string;
  /** Total bytes of the resource */
  totalBytes: number;
  /** Bytes savable with compression */
  wastedBytes: number;
}

/**
 * Compression analytics (gzip/brotli opportunities)
 */
export interface CompressionAnalytics {
  /** Total potential savings in bytes */
  potentialSavings: number;
  /** Individual items that can be compressed */
  items: CompressionItem[];
  /** Compression score (0-100, 100 = fully optimized) */
  score: number;
}

/**
 * Image format opportunity item
 */
export interface ImageFormatItem {
  /** Full URL of the image */
  url: string;
  /** Current format (jpeg, png, etc.) */
  fromFormat: string;
  /** Total bytes of the image */
  totalBytes: number;
  /** Bytes savable with modern formats */
  wastedBytes: number;
}

/**
 * Image format analytics (WebP/AVIF opportunities)
 */
export interface ImageFormatAnalytics {
  /** Total potential savings in bytes */
  potentialSavings: number;
  /** Individual images that can be converted */
  items: ImageFormatItem[];
  /** Image format score (0-100, 100 = fully optimized) */
  score: number;
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
  /** TTFB metrics */
  ttfb?: TtfbMetrics;
  /** Code coverage analytics (unused JS/CSS) */
  coverage?: CoverageAnalytics;
  /** Compression analytics (gzip/brotli opportunities) */
  compression?: CompressionAnalytics;
  /** Image format analytics (WebP/AVIF opportunities) */
  imageFormats?: ImageFormatAnalytics;
}
