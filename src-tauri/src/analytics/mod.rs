//! Analytics module for pre-computed statistics.
//!
//! This module provides computed analytics that were previously
//! calculated in the frontend, improving performance and ensuring
//! consistent calculations across platforms.

mod cache_stats;
mod domain_stats;
mod duplicate_stats;
mod protocol_stats;

pub use cache_stats::{CacheAnalytics, CacheGroup, ProblematicResource};
pub use domain_stats::{DomainAnalytics, DomainStat};
pub use duplicate_stats::{DuplicateAnalytics, DuplicateGroup};
pub use protocol_stats::{ProtocolAnalytics, ProtocolStat};

use crate::sidecar::RequestDetail;
use serde::{Deserialize, Serialize};

/// Pre-computed analytics for the results page.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestAnalytics {
    /// Domain statistics (grouped by domain).
    pub domain_stats: DomainAnalytics,
    /// Protocol distribution (HTTP/1.1, HTTP/2, HTTP/3).
    pub protocol_stats: ProtocolAnalytics,
    /// Cache TTL categories.
    pub cache_stats: CacheAnalytics,
    /// Duplicate resource detection.
    pub duplicate_stats: DuplicateAnalytics,
}

impl RequestAnalytics {
    /// Compute all analytics from request details.
    #[must_use]
    pub fn compute(requests: &[RequestDetail]) -> Self {
        Self {
            domain_stats: DomainAnalytics::compute(requests),
            protocol_stats: ProtocolAnalytics::compute(requests),
            cache_stats: CacheAnalytics::compute(requests),
            duplicate_stats: DuplicateAnalytics::compute(requests),
        }
    }
}
