//! Page metrics for `EcoIndex` calculation.

use serde::{Deserialize, Serialize};

/// Raw metrics collected from a web page for `EcoIndex` calculation.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct PageMetrics {
    /// Number of DOM elements (excluding SVG children).
    pub dom_elements: u32,
    /// Number of HTTP requests.
    pub requests: u32,
    /// Total page size in kilobytes.
    pub size_kb: f64,
}

impl PageMetrics {
    /// Creates a new `PageMetrics` instance.
    #[must_use]
    pub const fn new(dom_elements: u32, requests: u32, size_kb: f64) -> Self {
        Self {
            dom_elements,
            requests,
            size_kb,
        }
    }
}

impl Default for PageMetrics {
    fn default() -> Self {
        Self {
            dom_elements: 0,
            requests: 0,
            size_kb: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        let m = PageMetrics::new(100, 50, 1024.5);
        assert_eq!(m.dom_elements, 100);
        assert_eq!(m.requests, 50);
        assert!((m.size_kb - 1024.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_default() {
        let m = PageMetrics::default();
        assert_eq!(m.dom_elements, 0);
        assert_eq!(m.requests, 0);
        assert!((m.size_kb - 0.0).abs() < f64::EPSILON);
    }
}
