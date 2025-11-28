//! Web page metrics models.

use serde::{Deserialize, Serialize};

/// Metrics collected from a web page analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageMetrics {
    /// URL of the analyzed page.
    pub url: String,

    /// Total page size in bytes.
    pub page_size: u64,

    /// Number of HTTP requests made.
    pub request_count: u32,

    /// Number of DOM elements.
    pub dom_elements: u32,

    /// Page load time in milliseconds.
    pub load_time_ms: u64,

    /// Breakdown of resources by type.
    pub resources: Vec<ResourceMetrics>,
}

impl PageMetrics {
    /// Create a new `PageMetrics` instance.
    #[must_use]
    pub const fn new(url: String) -> Self {
        Self {
            url,
            page_size: 0,
            request_count: 0,
            dom_elements: 0,
            load_time_ms: 0,
            resources: Vec::new(),
        }
    }

    /// Calculate the total size of all resources.
    #[must_use]
    pub fn total_resource_size(&self) -> u64 {
        self.resources.iter().map(|r| r.size).sum()
    }
}

/// Metrics for a single resource.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceMetrics {
    /// Resource URL.
    pub url: String,

    /// Resource type (script, stylesheet, image, etc.).
    pub resource_type: ResourceType,

    /// Size in bytes.
    pub size: u64,

    /// Transfer size in bytes (compressed).
    pub transfer_size: u64,

    /// Load duration in milliseconds.
    pub duration_ms: u64,
}

/// Types of web resources.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ResourceType {
    /// HTML document.
    Document,
    /// JavaScript file.
    Script,
    /// CSS stylesheet.
    Stylesheet,
    /// Image file.
    Image,
    /// Font file.
    Font,
    /// Media file (video, audio).
    Media,
    /// XHR/Fetch request.
    Xhr,
    /// WebSocket connection.
    WebSocket,
    /// Other resource type.
    Other,
}

impl Default for ResourceType {
    fn default() -> Self {
        Self::Other
    }
}
