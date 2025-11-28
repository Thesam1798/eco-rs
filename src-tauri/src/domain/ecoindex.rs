//! EcoIndex domain types.
//!
//! Types for representing EcoIndex analysis results and grades.

use serde::{Deserialize, Serialize};

/// EcoIndex grade from A (best) to G (worst).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum EcoIndexGrade {
    /// Grade A - Excellent (score >= 80)
    A,
    /// Grade B - Very Good (score >= 70)
    B,
    /// Grade C - Good (score >= 55)
    C,
    /// Grade D - Average (score >= 40)
    D,
    /// Grade E - Below Average (score >= 25)
    E,
    /// Grade F - Poor (score >= 10)
    F,
    /// Grade G - Very Poor (score < 10)
    G,
}

impl EcoIndexGrade {
    /// Determine grade from a score (0-100).
    #[must_use]
    pub fn from_score(score: f64) -> Self {
        match score {
            s if s >= 80.0 => Self::A,
            s if s >= 70.0 => Self::B,
            s if s >= 55.0 => Self::C,
            s if s >= 40.0 => Self::D,
            s if s >= 25.0 => Self::E,
            s if s >= 10.0 => Self::F,
            _ => Self::G,
        }
    }

    /// Get the CSS color for this grade.
    #[must_use]
    pub const fn color(&self) -> &'static str {
        match self {
            Self::A => "#349a47",
            Self::B => "#51b84b",
            Self::C => "#cadb2a",
            Self::D => "#f6eb15",
            Self::E => "#fecd06",
            Self::F => "#f99839",
            Self::G => "#ed2124",
        }
    }

    /// Get a human-readable label for this grade.
    #[must_use]
    pub const fn label(&self) -> &'static str {
        match self {
            Self::A => "Excellent",
            Self::B => "Very Good",
            Self::C => "Good",
            Self::D => "Average",
            Self::E => "Below Average",
            Self::F => "Poor",
            Self::G => "Very Poor",
        }
    }
}

impl Default for EcoIndexGrade {
    fn default() -> Self {
        Self::G
    }
}

/// Result of an EcoIndex analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EcoIndexResult {
    /// URL of the analyzed page.
    pub url: String,

    /// EcoIndex score (0-100).
    pub score: f64,

    /// Grade based on score.
    pub grade: EcoIndexGrade,

    /// Estimated CO2 emissions in grams per page view.
    pub co2_grams: f64,

    /// Estimated water consumption in centiliters per page view.
    pub water_cl: f64,

    /// Number of DOM elements.
    pub dom_size: u32,

    /// Number of HTTP requests.
    pub request_count: u32,

    /// Page size in kilobytes.
    pub page_size_kb: f64,
}

impl EcoIndexResult {
    /// Create a new `EcoIndexResult` from raw metrics.
    #[must_use]
    pub fn new(url: String, dom_size: u32, request_count: u32, page_size_kb: f64) -> Self {
        let score = Self::calculate_score(dom_size, request_count, page_size_kb);
        let grade = EcoIndexGrade::from_score(score);
        let (co2_grams, water_cl) = Self::calculate_environmental_impact(score);

        Self {
            url,
            score,
            grade,
            co2_grams,
            water_cl,
            dom_size,
            request_count,
            page_size_kb,
        }
    }

    /// Calculate EcoIndex score using the official formula.
    ///
    /// Formula based on: <https://www.ecoindex.fr/comment-ca-marche/>
    fn calculate_score(dom: u32, req: u32, size_kb: f64) -> f64 {
        // Quantile lookup tables (simplified version)
        let dom_q = Self::quantile(f64::from(dom), 0.0, 2000.0);
        let req_q = Self::quantile(f64::from(req), 0.0, 100.0);
        let size_q = Self::quantile(size_kb, 0.0, 3000.0);

        // EcoIndex formula: 100 - 5*(3*dom_q + 2*req_q + size_q)/6
        let raw_score = 100.0 - 5.0 * (3.0 * dom_q + 2.0 * req_q + size_q) / 6.0;
        raw_score.clamp(0.0, 100.0)
    }

    /// Simple linear quantile calculation.
    fn quantile(value: f64, min: f64, max: f64) -> f64 {
        ((value - min) / (max - min) * 100.0).clamp(0.0, 100.0)
    }

    /// Calculate environmental impact from score.
    fn calculate_environmental_impact(score: f64) -> (f64, f64) {
        // Based on EcoIndex methodology
        let co2 = 2.0 + (100.0 - score) * 0.02; // grams
        let water = 3.0 + (100.0 - score) * 0.03; // centiliters
        (co2, water)
    }
}
