//! Lighthouse domain types.
//!
//! Types for representing Lighthouse analysis results.

use serde::{Deserialize, Serialize};

/// Result of a Lighthouse analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LighthouseResult {
    /// URL of the analyzed page.
    pub url: String,

    /// Performance score (0-100).
    pub performance: u8,

    /// Accessibility score (0-100).
    pub accessibility: u8,

    /// Best Practices score (0-100).
    pub best_practices: u8,

    /// SEO score (0-100).
    pub seo: u8,

    /// Core Web Vitals metrics.
    pub core_web_vitals: CoreWebVitals,

    /// Detailed performance metrics.
    pub metrics: PerformanceMetrics,
}

impl LighthouseResult {
    /// Check if all Core Web Vitals pass.
    #[must_use]
    pub const fn passes_core_web_vitals(&self) -> bool {
        self.core_web_vitals.passes()
    }

    /// Calculate average of all scores.
    #[must_use]
    #[allow(clippy::cast_possible_truncation)]
    pub fn average_score(&self) -> u8 {
        let total = u16::from(self.performance)
            + u16::from(self.accessibility)
            + u16::from(self.best_practices)
            + u16::from(self.seo);
        (total / 4) as u8
    }
}

/// Core Web Vitals metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoreWebVitals {
    /// Largest Contentful Paint in milliseconds.
    pub lcp_ms: u32,

    /// First Input Delay in milliseconds.
    pub fid_ms: u32,

    /// Cumulative Layout Shift (multiplied by 1000 for precision).
    pub cls: u32,

    /// Interaction to Next Paint in milliseconds.
    pub inp_ms: Option<u32>,
}

impl CoreWebVitals {
    /// Thresholds for "Good" performance.
    pub const LCP_GOOD_MS: u32 = 2500;
    /// Threshold for FID "Good".
    pub const FID_GOOD_MS: u32 = 100;
    /// Threshold for CLS "Good" (multiplied by 1000).
    pub const CLS_GOOD: u32 = 100; // 0.1 * 1000
    /// Threshold for INP "Good".
    pub const INP_GOOD_MS: u32 = 200;

    /// Check if all metrics pass "Good" thresholds.
    #[must_use]
    pub const fn passes(&self) -> bool {
        self.lcp_ms <= Self::LCP_GOOD_MS
            && self.fid_ms <= Self::FID_GOOD_MS
            && self.cls <= Self::CLS_GOOD
    }

    /// Get LCP status.
    #[must_use]
    pub const fn lcp_status(&self) -> MetricStatus {
        MetricStatus::from_thresholds(self.lcp_ms, Self::LCP_GOOD_MS, 4000)
    }

    /// Get FID status.
    #[must_use]
    pub const fn fid_status(&self) -> MetricStatus {
        MetricStatus::from_thresholds(self.fid_ms, Self::FID_GOOD_MS, 300)
    }

    /// Get CLS status.
    #[must_use]
    pub const fn cls_status(&self) -> MetricStatus {
        MetricStatus::from_thresholds(self.cls, Self::CLS_GOOD, 250)
    }
}

/// Detailed performance metrics from Lighthouse.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    /// First Contentful Paint in milliseconds.
    pub fcp_ms: u32,

    /// Speed Index in milliseconds.
    pub speed_index_ms: u32,

    /// Time to Interactive in milliseconds.
    pub tti_ms: u32,

    /// Total Blocking Time in milliseconds.
    pub tbt_ms: u32,

    /// Total page weight in bytes.
    pub total_byte_weight: u64,
}

/// Status of a performance metric.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MetricStatus {
    /// Metric is in "Good" range.
    Good,
    /// Metric needs improvement.
    NeedsImprovement,
    /// Metric is poor.
    Poor,
}

impl MetricStatus {
    /// Determine status from value and thresholds.
    const fn from_thresholds(value: u32, good: u32, poor: u32) -> Self {
        if value <= good {
            Self::Good
        } else if value <= poor {
            Self::NeedsImprovement
        } else {
            Self::Poor
        }
    }

    /// Get the CSS color for this status.
    #[must_use]
    pub const fn color(&self) -> &'static str {
        match self {
            Self::Good => "#0cce6b",
            Self::NeedsImprovement => "#ffa400",
            Self::Poor => "#ff4e42",
        }
    }
}
