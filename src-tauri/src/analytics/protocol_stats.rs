//! Protocol distribution computation.

use crate::sidecar::RequestDetail;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Statistics for a single protocol.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtocolStat {
    /// Protocol name (HTTP/3, HTTP/2, HTTP/1.1, Autre).
    pub protocol: String,
    /// Number of requests using this protocol.
    pub count: u32,
    /// Percentage of total requests.
    pub percentage: f64,
    /// Color for visualization.
    pub color: String,
}

/// Aggregated protocol analytics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProtocolAnalytics {
    /// Statistics per protocol.
    pub protocols: Vec<ProtocolStat>,
    /// Total number of requests.
    pub total_requests: u32,
}

impl ProtocolAnalytics {
    /// Compute protocol analytics from requests.
    #[must_use]
    #[allow(clippy::cast_precision_loss, clippy::cast_possible_truncation)]
    pub fn compute(requests: &[RequestDetail]) -> Self {
        let total = requests.len() as u32;
        if total == 0 {
            return Self {
                protocols: vec![],
                total_requests: 0,
            };
        }

        let mut counts: HashMap<String, u32> = HashMap::new();
        for req in requests {
            let proto = Self::normalize_protocol(&req.protocol);
            *counts.entry(proto).or_insert(0) += 1;
        }

        // Fixed order for consistent display
        let order = ["HTTP/3", "HTTP/2", "HTTP/1.1", "Autre"];
        let colors: HashMap<&str, &str> = [
            ("HTTP/3", "#10b981"),   // green
            ("HTTP/2", "#3b82f6"),   // blue
            ("HTTP/1.1", "#f59e0b"), // amber
            ("Autre", "#6b7280"),    // gray
        ]
        .into();

        let protocols = order
            .iter()
            .filter_map(|&proto| {
                counts.get(proto).map(|&count| ProtocolStat {
                    protocol: proto.to_string(),
                    count,
                    percentage: (f64::from(count) / f64::from(total)) * 100.0,
                    color: (*colors.get(proto).unwrap_or(&"#6b7280")).to_string(),
                })
            })
            .collect();

        Self {
            protocols,
            total_requests: total,
        }
    }

    /// Normalize protocol string to canonical name.
    fn normalize_protocol(protocol: &str) -> String {
        let p = protocol.to_lowercase();
        if p.starts_with("h3") || p.contains("quic") {
            "HTTP/3".to_string()
        } else if p.starts_with("h2") || p == "http/2" || p == "http/2.0" {
            "HTTP/2".to_string()
        } else if p.starts_with("http/1") || p == "http/1.1" || p == "http/1.0" {
            "HTTP/1.1".to_string()
        } else {
            "Autre".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_request(protocol: &str) -> RequestDetail {
        RequestDetail {
            url: "https://example.com/test".to_string(),
            domain: "example.com".to_string(),
            protocol: protocol.to_string(),
            status_code: 200,
            mime_type: "text/html".to_string(),
            resource_type: "Document".to_string(),
            transfer_size: 1000,
            resource_size: 1000,
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
        let result = ProtocolAnalytics::compute(&[]);
        assert_eq!(result.total_requests, 0);
        assert!(result.protocols.is_empty());
    }

    #[test]
    fn test_protocol_normalization() {
        assert_eq!(ProtocolAnalytics::normalize_protocol("h2"), "HTTP/2");
        assert_eq!(ProtocolAnalytics::normalize_protocol("H2"), "HTTP/2");
        assert_eq!(ProtocolAnalytics::normalize_protocol("http/2"), "HTTP/2");
        assert_eq!(ProtocolAnalytics::normalize_protocol("h3"), "HTTP/3");
        assert_eq!(ProtocolAnalytics::normalize_protocol("quic"), "HTTP/3");
        assert_eq!(
            ProtocolAnalytics::normalize_protocol("http/1.1"),
            "HTTP/1.1"
        );
        assert_eq!(ProtocolAnalytics::normalize_protocol("unknown"), "Autre");
    }

    #[test]
    fn test_mixed_protocols() {
        let requests = vec![
            make_request("h2"),
            make_request("h2"),
            make_request("http/1.1"),
            make_request("h3"),
        ];
        let result = ProtocolAnalytics::compute(&requests);

        assert_eq!(result.total_requests, 4);
        // HTTP/3 should be first in fixed order
        assert_eq!(result.protocols[0].protocol, "HTTP/3");
        assert_eq!(result.protocols[0].count, 1);
        // HTTP/2 second
        assert_eq!(result.protocols[1].protocol, "HTTP/2");
        assert_eq!(result.protocols[1].count, 2);
        // HTTP/1.1 third
        assert_eq!(result.protocols[2].protocol, "HTTP/1.1");
        assert_eq!(result.protocols[2].count, 1);
    }
}
