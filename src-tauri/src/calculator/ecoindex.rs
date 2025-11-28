//! `EcoIndex` score calculator.
//!
//! Implements the official `EcoIndex` algorithm based on quantile tables.

use crate::domain::quantiles::{
    DOM_QUANTILES, GRADE_THRESHOLDS, REQUEST_QUANTILES, SIZE_QUANTILES,
};
use crate::domain::{EcoIndexResult, PageMetrics};

/// Calculator for `EcoIndex` scores.
pub struct EcoIndexCalculator;

impl EcoIndexCalculator {
    /// Calculates the quantile position of a value within a quantile table.
    ///
    /// Returns a value between 0 and 20 with linear interpolation.
    #[must_use]
    #[allow(clippy::cast_precision_loss)]
    pub fn get_quantile_position(value: f64, quantiles: &[f64]) -> f64 {
        if value <= quantiles[0] {
            return 0.0;
        }
        if value >= quantiles[quantiles.len() - 1] {
            return (quantiles.len() - 1) as f64;
        }

        for i in 1..quantiles.len() {
            if value < quantiles[i] {
                let lower = quantiles[i - 1];
                let upper = quantiles[i];
                return (i - 1) as f64 + (value - lower) / (upper - lower);
            }
        }
        (quantiles.len() - 1) as f64
    }

    /// Computes the `EcoIndex` score from page metrics.
    ///
    /// Formula: `100 - 5 × (3×Q_dom + 2×Q_req + Q_size) / 6`
    #[must_use]
    pub fn compute_score(metrics: &PageMetrics) -> f64 {
        let q_dom = Self::get_quantile_position(f64::from(metrics.dom_elements), &DOM_QUANTILES);
        let q_req = Self::get_quantile_position(f64::from(metrics.requests), &REQUEST_QUANTILES);
        let q_size = Self::get_quantile_position(metrics.size_kb, &SIZE_QUANTILES);

        let weighted = 3.0f64.mul_add(q_dom, 2.0f64.mul_add(q_req, q_size));
        let score = 100.0 - (5.0 * weighted) / 6.0;
        score.clamp(0.0, 100.0)
    }

    /// Determines the grade (A-G) from a score.
    #[must_use]
    pub fn get_grade(score: f64) -> char {
        for (threshold, grade) in GRADE_THRESHOLDS {
            if score >= threshold {
                return grade;
            }
        }
        'G'
    }

    /// Computes greenhouse gas emissions in gCO2e per page view.
    #[must_use]
    pub fn compute_ghg(score: f64) -> f64 {
        2.0 + 2.0 * (100.0 - score) / 100.0
    }

    /// Computes water consumption in centiliters per page view.
    #[must_use]
    pub fn compute_water(score: f64) -> f64 {
        3.0 + 3.0 * (100.0 - score) / 100.0
    }

    /// Performs a complete `EcoIndex` calculation.
    #[must_use]
    pub fn compute(metrics: &PageMetrics, url: &str) -> EcoIndexResult {
        let score = Self::compute_score(metrics);
        let grade = Self::get_grade(score);
        let ghg = Self::compute_ghg(score);
        let water = Self::compute_water(score);

        EcoIndexResult::new(score, grade, ghg, water, *metrics, url.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quantile_position_at_min() {
        assert!(
            (EcoIndexCalculator::get_quantile_position(0.0, &DOM_QUANTILES) - 0.0).abs()
                < f64::EPSILON
        );
        assert!(
            (EcoIndexCalculator::get_quantile_position(-10.0, &DOM_QUANTILES) - 0.0).abs()
                < f64::EPSILON
        );
    }

    #[test]
    fn test_quantile_position_interpolation() {
        // Value between quantiles[1]=47 and quantiles[2]=75
        let pos = EcoIndexCalculator::get_quantile_position(61.0, &DOM_QUANTILES);
        assert!(pos > 1.0 && pos < 2.0);
    }

    #[test]
    fn test_score_light_page() {
        let metrics = PageMetrics::new(100, 10, 100.0);
        let score = EcoIndexCalculator::compute_score(&metrics);
        assert!(score >= 80.0, "Light page should score A: {score}");
    }

    #[test]
    fn test_score_heavy_page() {
        let metrics = PageMetrics::new(5000, 200, 10000.0);
        let score = EcoIndexCalculator::compute_score(&metrics);
        assert!(score < 50.0, "Heavy page should score low: {score}");
    }

    #[test]
    fn test_grade_thresholds() {
        assert_eq!(EcoIndexCalculator::get_grade(100.0), 'A');
        assert_eq!(EcoIndexCalculator::get_grade(81.0), 'A');
        assert_eq!(EcoIndexCalculator::get_grade(80.0), 'B');
        assert_eq!(EcoIndexCalculator::get_grade(71.0), 'B');
        assert_eq!(EcoIndexCalculator::get_grade(70.0), 'C');
        assert_eq!(EcoIndexCalculator::get_grade(61.0), 'C');
        assert_eq!(EcoIndexCalculator::get_grade(60.0), 'D');
        assert_eq!(EcoIndexCalculator::get_grade(51.0), 'D');
        assert_eq!(EcoIndexCalculator::get_grade(50.0), 'E');
        assert_eq!(EcoIndexCalculator::get_grade(41.0), 'E');
        assert_eq!(EcoIndexCalculator::get_grade(40.0), 'F');
        assert_eq!(EcoIndexCalculator::get_grade(31.0), 'F');
        assert_eq!(EcoIndexCalculator::get_grade(30.0), 'G');
        assert_eq!(EcoIndexCalculator::get_grade(0.0), 'G');
    }

    #[test]
    fn test_ghg_calculation() {
        assert!((EcoIndexCalculator::compute_ghg(100.0) - 2.0).abs() < f64::EPSILON);
        assert!((EcoIndexCalculator::compute_ghg(0.0) - 4.0).abs() < f64::EPSILON);
        assert!((EcoIndexCalculator::compute_ghg(50.0) - 3.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_water_calculation() {
        assert!((EcoIndexCalculator::compute_water(100.0) - 3.0).abs() < f64::EPSILON);
        assert!((EcoIndexCalculator::compute_water(0.0) - 6.0).abs() < f64::EPSILON);
        assert!((EcoIndexCalculator::compute_water(50.0) - 4.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_compute_full_result() {
        let metrics = PageMetrics::new(500, 50, 1000.0);
        let result = EcoIndexCalculator::compute(&metrics, "https://example.com");

        assert!(result.score >= 0.0 && result.score <= 100.0);
        assert!(['A', 'B', 'C', 'D', 'E', 'F', 'G'].contains(&result.grade));
        assert!(result.ghg >= 2.0 && result.ghg <= 4.0);
        assert!(result.water >= 3.0 && result.water <= 6.0);
        assert_eq!(result.url, "https://example.com");
    }
}
