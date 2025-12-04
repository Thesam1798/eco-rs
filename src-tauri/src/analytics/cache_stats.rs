//! Cache analysis computation.

use crate::sidecar::RequestDetail;
use serde::{Deserialize, Serialize};

const MS_HOUR: u64 = 3_600_000;
const MS_DAY: u64 = 86_400_000;
const MS_WEEK: u64 = 604_800_000;

/// Cache TTL group.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheGroup {
    /// Group label (e.g., "< 1 heure").
    pub label: String,
    /// Number of resources in this group.
    pub count: u32,
    /// Percentage of total resources.
    pub percentage: f64,
    /// Color for visualization.
    pub color: String,
}

/// Resource with problematic cache TTL.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProblematicResource {
    /// Full URL of the resource.
    pub url: String,
    /// Domain/hostname.
    pub domain: String,
    /// Extracted filename from URL.
    pub filename: String,
    /// Cache lifetime in milliseconds.
    pub cache_lifetime_ms: u64,
    /// Human-readable TTL (e.g., "30min", "2h").
    pub cache_ttl_label: String,
    /// CSS class for badge styling.
    pub badge_class: String,
    /// Badge text (!, <1h, <1j, <7j).
    pub badge_text: String,
    /// Resource size in bytes.
    pub resource_size: u64,
}

/// Aggregated cache analytics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheAnalytics {
    /// Cache TTL groups.
    pub groups: Vec<CacheGroup>,
    /// Resources with cache < 7 days.
    pub problematic_resources: Vec<ProblematicResource>,
    /// Total number of resources.
    pub total_resources: u32,
    /// Number of problematic resources.
    pub problematic_count: u32,
}

impl CacheAnalytics {
    /// Compute cache analytics from requests.
    #[must_use]
    #[allow(clippy::cast_precision_loss, clippy::cast_possible_truncation)]
    pub fn compute(requests: &[RequestDetail]) -> Self {
        let total = requests.len() as u32;
        if total == 0 {
            return Self {
                groups: vec![],
                problematic_resources: vec![],
                total_resources: 0,
                problematic_count: 0,
            };
        }

        // Count resources per TTL bucket
        let mut none = 0u32;
        let mut hour = 0u32;
        let mut day = 0u32;
        let mut week = 0u32;
        let mut good = 0u32;

        for req in requests {
            let ms = req.cache_lifetime_ms;
            if ms == 0 {
                none += 1;
            } else if ms < MS_HOUR {
                hour += 1;
            } else if ms < MS_DAY {
                day += 1;
            } else if ms < MS_WEEK {
                week += 1;
            } else {
                good += 1;
            }
        }

        let total_f64 = f64::from(total);

        // Build groups (only non-empty)
        let mut groups = vec![];
        if none > 0 {
            groups.push(CacheGroup {
                label: "Aucun".to_string(),
                count: none,
                percentage: (f64::from(none) / total_f64) * 100.0,
                color: "#ef4444".to_string(), // red
            });
        }
        if hour > 0 {
            groups.push(CacheGroup {
                label: "< 1 heure".to_string(),
                count: hour,
                percentage: (f64::from(hour) / total_f64) * 100.0,
                color: "#f59e0b".to_string(), // amber
            });
        }
        if day > 0 {
            groups.push(CacheGroup {
                label: "< 1 jour".to_string(),
                count: day,
                percentage: (f64::from(day) / total_f64) * 100.0,
                color: "#eab308".to_string(), // yellow
            });
        }
        if week > 0 {
            groups.push(CacheGroup {
                label: "< 7 jours".to_string(),
                count: week,
                percentage: (f64::from(week) / total_f64) * 100.0,
                color: "#84cc16".to_string(), // lime
            });
        }
        if good > 0 {
            groups.push(CacheGroup {
                label: ">= 7 jours".to_string(),
                count: good,
                percentage: (f64::from(good) / total_f64) * 100.0,
                color: "#10b981".to_string(), // green
            });
        }

        // Problematic resources: cache < 7 days, sorted by TTL ascending
        let mut problematic: Vec<_> = requests
            .iter()
            .filter(|r| r.cache_lifetime_ms < MS_WEEK)
            .cloned()
            .collect();
        problematic.sort_by_key(|r| r.cache_lifetime_ms);

        let problematic_resources: Vec<ProblematicResource> = problematic
            .into_iter()
            .map(|r| {
                let ms = r.cache_lifetime_ms;
                ProblematicResource {
                    url: r.url.clone(),
                    domain: r.domain.clone(),
                    filename: Self::extract_filename(&r.url),
                    cache_lifetime_ms: ms,
                    cache_ttl_label: Self::format_ttl(ms),
                    badge_class: Self::get_badge_class(ms),
                    badge_text: Self::get_badge_text(ms),
                    resource_size: r.resource_size,
                }
            })
            .collect();

        let problematic_count = problematic_resources.len() as u32;

        Self {
            groups,
            problematic_resources,
            total_resources: total,
            problematic_count,
        }
    }

    /// Extract filename from URL.
    fn extract_filename(url: &str) -> String {
        url::Url::parse(url)
            .ok()
            .and_then(|u| u.path_segments()?.next_back().map(str::to_string))
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| url.to_string())
    }

    /// Format TTL in human-readable form.
    fn format_ttl(ms: u64) -> String {
        if ms == 0 {
            return "Aucun".to_string();
        }
        let seconds = ms / 1000;
        if seconds < 60 {
            format!("{seconds}s")
        } else if seconds < 3600 {
            format!("{}min", seconds / 60)
        } else if seconds < 86400 {
            format!("{}h", seconds / 3600)
        } else {
            format!("{}j", seconds / 86400)
        }
    }

    /// Get CSS class for badge based on TTL.
    fn get_badge_class(ms: u64) -> String {
        if ms == 0 {
            "bg-red-100 text-red-700".to_string()
        } else if ms < MS_DAY {
            "bg-amber-100 text-amber-700".to_string()
        } else {
            "bg-yellow-100 text-yellow-700".to_string()
        }
    }

    /// Get badge text based on TTL.
    fn get_badge_text(ms: u64) -> String {
        if ms == 0 {
            "!".to_string()
        } else if ms < MS_HOUR {
            "<1h".to_string()
        } else if ms < MS_DAY {
            "<1j".to_string()
        } else {
            "<7j".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_request(cache_lifetime_ms: u64) -> RequestDetail {
        RequestDetail {
            url: "https://example.com/test.js".to_string(),
            domain: "example.com".to_string(),
            protocol: "h2".to_string(),
            status_code: 200,
            mime_type: "application/javascript".to_string(),
            resource_type: "Script".to_string(),
            transfer_size: 1000,
            resource_size: 2000,
            priority: "High".to_string(),
            start_time: 0.0,
            end_time: 100.0,
            duration: 100.0,
            from_cache: false,
            cache_lifetime_ms,
        }
    }

    #[test]
    fn test_empty_requests() {
        let result = CacheAnalytics::compute(&[]);
        assert_eq!(result.total_resources, 0);
        assert!(result.groups.is_empty());
        assert!(result.problematic_resources.is_empty());
    }

    #[test]
    fn test_ttl_grouping() {
        let requests = vec![
            make_request(0),                   // Aucun
            make_request(MS_HOUR - 1),         // < 1 heure
            make_request(MS_DAY - 1),          // < 1 jour
            make_request(MS_WEEK - 1),         // < 7 jours
            make_request(MS_WEEK + 1_000_000), // >= 7 jours
        ];
        let result = CacheAnalytics::compute(&requests);

        assert_eq!(result.total_resources, 5);
        assert_eq!(result.groups.len(), 5);
        assert_eq!(result.problematic_count, 4); // All except >= 7 days
    }

    #[test]
    fn test_format_ttl() {
        assert_eq!(CacheAnalytics::format_ttl(0), "Aucun");
        assert_eq!(CacheAnalytics::format_ttl(30_000), "30s");
        assert_eq!(CacheAnalytics::format_ttl(120_000), "2min");
        assert_eq!(CacheAnalytics::format_ttl(7_200_000), "2h");
        assert_eq!(CacheAnalytics::format_ttl(172_800_000), "2j");
    }

    #[test]
    fn test_extract_filename() {
        assert_eq!(
            CacheAnalytics::extract_filename("https://example.com/js/main.js"),
            "main.js"
        );
        assert_eq!(
            CacheAnalytics::extract_filename("https://cdn.example.com/styles/app.css?v=123"),
            "app.css"
        );
    }
}
