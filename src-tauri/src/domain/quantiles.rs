#![allow(clippy::unreadable_literal)]

//! Official `EcoIndex` quantile tables from HTTP Archive.
//!
//! These quantiles are derived from the analysis of 500,000 URLs from the HTTP Archive dataset.
//! They are used to calculate the `EcoIndex` score by comparing actual metrics against these
//! distribution thresholds.
//!
//! ## Metric Weights in `EcoIndex` Formula
//!
//! The `EcoIndex` formula uses weighted contributions from three metrics:
//! - **DOM elements**: Weight of 3 (highest impact)
//! - **HTTP requests**: Weight of 2 (medium impact)
//! - **Transfer size**: Weight of 1 (lowest impact)

/// Quantile distribution for DOM element counts.
///
/// Based on HTTP Archive data (500,000 URLs).
/// Weight in formula: 3
pub const DOM_QUANTILES: [f64; 21] = [
    0.0, 47.0, 75.0, 159.0, 233.0, 298.0, 358.0, 417.0, 476.0, 537.0, 603.0, 674.0, 753.0, 843.0,
    949.0, 1076.0, 1237.0, 1459.0, 1801.0, 2479.0, 594_601.0,
];

/// Quantile distribution for HTTP request counts.
///
/// Based on HTTP Archive data (500,000 URLs).
/// Weight in formula: 2
pub const REQUEST_QUANTILES: [f64; 21] = [
    0.0, 2.0, 15.0, 25.0, 34.0, 42.0, 49.0, 56.0, 63.0, 70.0, 78.0, 86.0, 95.0, 105.0, 117.0,
    130.0, 147.0, 170.0, 205.0, 281.0, 3920.0,
];

/// Quantile distribution for transfer sizes in KB.
///
/// Based on HTTP Archive data (500,000 URLs).
/// Weight in formula: 1
pub const SIZE_QUANTILES: [f64; 21] = [
    0.0, 1.37, 144.7, 319.53, 479.46, 631.97, 783.38, 937.91, 1098.62, 1265.47, 1448.32, 1648.27,
    1876.08, 2142.06, 2465.37, 2866.31, 3401.59, 4155.73, 5400.08, 8037.54, 223_212.26,
];

/// `EcoIndex` grade thresholds.
///
/// Each tuple contains (`minimum_score`, `grade_letter`).
/// Grades range from A (best) to G (worst).
pub const GRADE_THRESHOLDS: [(f64, char); 7] = [
    (81.0, 'A'),
    (71.0, 'B'),
    (61.0, 'C'),
    (51.0, 'D'),
    (41.0, 'E'),
    (31.0, 'F'),
    (0.0, 'G'),
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dom_quantiles_length() {
        assert_eq!(DOM_QUANTILES.len(), 21);
    }

    #[test]
    fn test_request_quantiles_length() {
        assert_eq!(REQUEST_QUANTILES.len(), 21);
    }

    #[test]
    fn test_size_quantiles_length() {
        assert_eq!(SIZE_QUANTILES.len(), 21);
    }

    #[test]
    fn test_dom_quantiles_sorted() {
        let mut sorted = DOM_QUANTILES;
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        assert_eq!(DOM_QUANTILES, sorted);
    }

    #[test]
    fn test_request_quantiles_sorted() {
        let mut sorted = REQUEST_QUANTILES;
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        assert_eq!(REQUEST_QUANTILES, sorted);
    }

    #[test]
    fn test_size_quantiles_sorted() {
        let mut sorted = SIZE_QUANTILES;
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        assert_eq!(SIZE_QUANTILES, sorted);
    }
}
