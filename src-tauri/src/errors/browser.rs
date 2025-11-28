//! Browser-related error types.

use serde::Serialize;
use thiserror::Error;

/// Errors related to browser operations.
#[derive(Error, Debug)]
pub enum BrowserError {
    /// Chrome/Chromium not found on the system.
    #[error("Chrome browser not found: {0}")]
    NotFound(String),

    /// Failed to launch the browser.
    #[error("Failed to launch browser: {0}")]
    LaunchFailed(String),

    /// Failed to create a new page.
    #[error("Failed to create page: {0}")]
    PageCreationFailed(String),

    /// Navigation failed.
    #[error("Navigation failed: {0}")]
    NavigationFailed(String),

    /// Navigation timeout.
    #[error("Navigation timeout after {0}ms")]
    NavigationTimeout(u64),

    /// Page load error.
    #[error("Page load failed: {0}")]
    PageLoadFailed(String),

    /// CDP protocol error.
    #[error("CDP error: {0}")]
    CdpError(String),

    /// `DevTools` protocol error.
    #[error("DevTools protocol error: {0}")]
    DevToolsError(String),

    /// JavaScript execution error.
    #[error("JavaScript error: {0}")]
    JavaScriptError(String),

    /// Invalid URL provided.
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}

impl Serialize for BrowserError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
