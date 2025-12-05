//! Domain statistics computation.

use crate::sidecar::RequestDetail;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Statistics for a single domain.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainStat {
    /// Domain name.
    pub domain: String,
    /// Number of requests to this domain.
    pub request_count: u32,
    /// Total transfer size in bytes.
    pub total_transfer_size: u64,
    /// Percentage of total requests.
    pub percentage: f64,
    /// Color for visualization.
    pub color: String,
}

/// Aggregated domain analytics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainAnalytics {
    /// Statistics per domain, sorted by request count.
    pub domains: Vec<DomainStat>,
    /// Total number of requests.
    pub total_requests: u32,
    /// Total transfer size in bytes.
    pub total_size: u64,
}

const COLORS: [&str; 8] = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
];

impl DomainAnalytics {
    /// Compute domain analytics from requests.
    #[must_use]
    #[allow(clippy::cast_precision_loss, clippy::cast_possible_truncation)]
    pub fn compute(requests: &[RequestDetail]) -> Self {
        if requests.is_empty() {
            return Self {
                domains: vec![],
                total_requests: 0,
                total_size: 0,
            };
        }

        let mut stats_map: HashMap<String, (u32, u64)> = HashMap::new();

        for req in requests {
            let entry = stats_map.entry(req.domain.clone()).or_insert((0, 0));
            entry.0 += 1;
            entry.1 += req.transfer_size;
        }

        let total = requests.len() as u32;
        let total_size: u64 = stats_map.values().map(|(_, size)| size).sum();

        let mut sorted: Vec<_> = stats_map.into_iter().collect();
        sorted.sort_by(|a, b| b.1 .0.cmp(&a.1 .0)); // Sort by request count descending

        let domains = sorted
            .into_iter()
            .enumerate()
            .map(|(i, (domain, (count, size)))| DomainStat {
                domain: if domain.is_empty() {
                    "(inconnu)".to_string()
                } else {
                    domain
                },
                request_count: count,
                total_transfer_size: size,
                percentage: if total > 0 {
                    (f64::from(count) / f64::from(total)) * 100.0
                } else {
                    0.0
                },
                color: (*COLORS.get(i % COLORS.len()).unwrap_or(&"#6b7280")).to_string(),
            })
            .collect();

        Self {
            domains,
            total_requests: total,
            total_size,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_request(domain: &str, transfer_size: u64) -> RequestDetail {
        RequestDetail {
            url: format!("https://{domain}/test"),
            domain: domain.to_string(),
            protocol: "h2".to_string(),
            status_code: 200,
            mime_type: "text/html".to_string(),
            resource_type: "Document".to_string(),
            transfer_size,
            resource_size: transfer_size,
            priority: "High".to_string(),
            start_time: 0.0,
            end_time: 100.0,
            duration: 100.0,
            from_cache: false,
            cache_lifetime_ms: 0,
        }
    }

    #[test]
    fn test_empty_requests() {
        let result = DomainAnalytics::compute(&[]);
        assert_eq!(result.total_requests, 0);
        assert!(result.domains.is_empty());
    }

    #[test]
    fn test_single_domain() {
        let requests = vec![
            make_request("example.com", 1000),
            make_request("example.com", 500),
        ];
        let result = DomainAnalytics::compute(&requests);

        assert_eq!(result.total_requests, 2);
        assert_eq!(result.total_size, 1500);
        assert_eq!(result.domains.len(), 1);
        assert_eq!(result.domains[0].domain, "example.com");
        assert_eq!(result.domains[0].request_count, 2);
        assert!((result.domains[0].percentage - 100.0).abs() < 0.01);
    }

    #[test]
    fn test_multiple_domains_sorted_by_request_count() {
        let requests = vec![
            make_request("few.com", 5000),
            make_request("many.com", 100),
            make_request("many.com", 100),
            make_request("many.com", 100),
            make_request("medium.com", 1000),
            make_request("medium.com", 1000),
        ];
        let result = DomainAnalytics::compute(&requests);

        assert_eq!(result.domains.len(), 3);
        // Should be sorted by request count descending
        assert_eq!(result.domains[0].domain, "many.com");
        assert_eq!(result.domains[0].request_count, 3);
        assert_eq!(result.domains[1].domain, "medium.com");
        assert_eq!(result.domains[1].request_count, 2);
        assert_eq!(result.domains[2].domain, "few.com");
        assert_eq!(result.domains[2].request_count, 1);
    }
}
