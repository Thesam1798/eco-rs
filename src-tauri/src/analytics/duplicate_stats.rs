//! Duplicate resource detection.

use crate::sidecar::RequestDetail;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Group of duplicate resources.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    /// Filename of the duplicated resource.
    pub filename: String,
    /// Size of each resource in bytes.
    pub resource_size: u64,
    /// Resource type (Script, Stylesheet, etc.).
    pub resource_type: String,
    /// All URLs loading this resource.
    pub urls: Vec<String>,
    /// Unique domains loading this resource.
    pub domains: Vec<String>,
    /// Bytes wasted by duplicates: (count - 1) * size.
    pub wasted_bytes: u64,
}

/// Aggregated duplicate analytics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateAnalytics {
    /// Detected duplicate groups, sorted by wasted bytes.
    pub duplicates: Vec<DuplicateGroup>,
    /// Total bytes wasted by all duplicates.
    pub total_wasted_bytes: u64,
    /// Number of duplicate groups.
    pub duplicate_count: u32,
}

impl DuplicateAnalytics {
    /// Compute duplicate analytics from requests.
    #[must_use]
    #[allow(clippy::cast_possible_truncation)]
    pub fn compute(requests: &[RequestDetail]) -> Self {
        if requests.is_empty() {
            return Self {
                duplicates: vec![],
                total_wasted_bytes: 0,
                duplicate_count: 0,
            };
        }

        // Group by composite key: filename:size
        // Same filename AND same size = likely the same resource
        let mut groups: HashMap<String, (Vec<String>, String, u64)> = HashMap::new();

        for req in requests {
            let filename = Self::extract_filename(&req.url);
            if filename.is_empty() || filename == "index.html" {
                continue;
            }

            // Key = filename:size
            let key = format!("{}:{}", filename, req.resource_size);
            let entry = groups
                .entry(key)
                .or_insert_with(|| (vec![], req.resource_type.clone(), req.resource_size));
            entry.0.push(req.url.clone());
        }

        // Filter to keep only groups with 2+ occurrences
        let mut duplicates: Vec<DuplicateGroup> = groups
            .into_iter()
            .filter(|(_, (urls, _, _))| urls.len() > 1)
            .map(|(key, (urls, resource_type, resource_size))| {
                let filename = key.split(':').next().unwrap_or("").to_string();

                // Extract unique domains
                let mut domains: Vec<String> = urls
                    .iter()
                    .filter_map(|u| {
                        url::Url::parse(u)
                            .ok()
                            .and_then(|p| p.host_str().map(str::to_string))
                    })
                    .collect();
                domains.sort();
                domains.dedup();

                let wasted_bytes = (urls.len() as u64 - 1) * resource_size;

                DuplicateGroup {
                    filename,
                    resource_size,
                    resource_type,
                    urls,
                    domains,
                    wasted_bytes,
                }
            })
            .collect();

        // Sort by wasted bytes descending
        duplicates.sort_by(|a, b| b.wasted_bytes.cmp(&a.wasted_bytes));

        let total_wasted_bytes: u64 = duplicates.iter().map(|d| d.wasted_bytes).sum();
        let duplicate_count = duplicates.len() as u32;

        Self {
            duplicates,
            total_wasted_bytes,
            duplicate_count,
        }
    }

    /// Extract filename from URL.
    fn extract_filename(url: &str) -> String {
        url::Url::parse(url)
            .ok()
            .and_then(|u| u.path_segments()?.next_back().map(str::to_string))
            .filter(|s| !s.is_empty())
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_request(url: &str, resource_size: u64) -> RequestDetail {
        RequestDetail {
            url: url.to_string(),
            domain: url::Url::parse(url)
                .ok()
                .and_then(|u| u.host_str().map(str::to_string))
                .unwrap_or_default(),
            protocol: "h2".to_string(),
            status_code: 200,
            mime_type: "application/javascript".to_string(),
            resource_type: "Script".to_string(),
            transfer_size: resource_size,
            resource_size,
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
        let result = DuplicateAnalytics::compute(&[]);
        assert_eq!(result.duplicate_count, 0);
        assert_eq!(result.total_wasted_bytes, 0);
    }

    #[test]
    fn test_no_duplicates() {
        let requests = vec![
            make_request("https://example.com/a.js", 1000),
            make_request("https://example.com/b.js", 2000),
        ];
        let result = DuplicateAnalytics::compute(&requests);

        assert_eq!(result.duplicate_count, 0);
    }

    #[test]
    fn test_same_filename_different_size_not_duplicate() {
        let requests = vec![
            make_request("https://cdn1.com/app.js", 1000),
            make_request("https://cdn2.com/app.js", 2000), // Different size
        ];
        let result = DuplicateAnalytics::compute(&requests);

        assert_eq!(result.duplicate_count, 0);
    }

    #[test]
    fn test_duplicate_detected() {
        let requests = vec![
            make_request("https://cdn1.com/app.js", 5000),
            make_request("https://cdn2.com/app.js", 5000), // Same filename, same size
        ];
        let result = DuplicateAnalytics::compute(&requests);

        assert_eq!(result.duplicate_count, 1);
        assert_eq!(result.duplicates[0].filename, "app.js");
        assert_eq!(result.duplicates[0].urls.len(), 2);
        assert_eq!(result.duplicates[0].domains.len(), 2);
        assert_eq!(result.duplicates[0].wasted_bytes, 5000); // (2-1) * 5000
        assert_eq!(result.total_wasted_bytes, 5000);
    }

    #[test]
    fn test_multiple_duplicates_sorted_by_waste() {
        let requests = vec![
            make_request("https://cdn1.com/small.js", 1000),
            make_request("https://cdn2.com/small.js", 1000),
            make_request("https://cdn1.com/large.js", 10000),
            make_request("https://cdn2.com/large.js", 10000),
            make_request("https://cdn3.com/large.js", 10000),
        ];
        let result = DuplicateAnalytics::compute(&requests);

        assert_eq!(result.duplicate_count, 2);
        // large.js should be first (20000 wasted vs 1000)
        assert_eq!(result.duplicates[0].filename, "large.js");
        assert_eq!(result.duplicates[0].wasted_bytes, 20000); // (3-1) * 10000
        assert_eq!(result.duplicates[1].filename, "small.js");
        assert_eq!(result.duplicates[1].wasted_bytes, 1000);
        assert_eq!(result.total_wasted_bytes, 21000);
    }
}
