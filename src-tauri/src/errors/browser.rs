//! Browser-related error types.

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

    /// Navigation timeout.
    #[error("Navigation timeout after {0}ms")]
    NavigationTimeout(u64),

    /// Page load error.
    #[error("Page load failed: {0}")]
    PageLoadFailed(String),

    /// DevTools protocol error.
    #[error("DevTools protocol error: {0}")]
    DevToolsError(String),

    /// Invalid URL provided.
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
}
