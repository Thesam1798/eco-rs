//! `EcoIndex` result types.
//!
//! Contains the result structure for `EcoIndex` analysis.

use serde::{Deserialize, Serialize};

use super::metrics::PageMetrics;

/// Complete result of an `EcoIndex` analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EcoIndexResult {
    /// `EcoIndex` score (0-100, higher is better).
    pub score: f64,
    /// Grade from 'A' (best) to 'G' (worst).
    pub grade: char,
    /// Greenhouse gas emissions in gCO2e per page view.
    pub ghg: f64,
    /// Water consumption in centiliters per page view.
    pub water: f64,
    /// Raw metrics used for the calculation.
    pub metrics: PageMetrics,
    /// URL of the analyzed page.
    pub url: String,
    /// Timestamp of the analysis (ISO 8601).
    pub timestamp: String,
}

impl EcoIndexResult {
    /// Creates a new `EcoIndexResult`.
    #[must_use]
    pub fn new(
        score: f64,
        grade: char,
        ghg: f64,
        water: f64,
        metrics: PageMetrics,
        url: String,
    ) -> Self {
        Self {
            score,
            grade,
            ghg,
            water,
            metrics,
            url,
            timestamp: chrono::Utc::now().to_rfc3339(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        let metrics = PageMetrics::new(500, 50, 1000.0);
        let result = EcoIndexResult::new(
            75.5,
            'B',
            1.5,
            2.25,
            metrics,
            "https://example.com".to_string(),
        );

        assert!((result.score - 75.5).abs() < f64::EPSILON);
        assert_eq!(result.grade, 'B');
        assert!(!result.timestamp.is_empty());
        assert_eq!(result.url, "https://example.com");
    }
}
