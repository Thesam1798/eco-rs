//! Error types for the EcoIndex Analyzer application.
//!
//! This module provides unified error handling using `thiserror`.

mod browser;
mod sidecar;

pub use browser::BrowserError;
pub use sidecar::SidecarError;

use serde::Serialize;
use thiserror::Error;

/// Main application error type.
#[derive(Error, Debug)]
pub enum AppError {
    /// Browser-related errors.
    #[error(transparent)]
    Browser(#[from] BrowserError),

    /// Sidecar process errors.
    #[error(transparent)]
    Sidecar(#[from] SidecarError),

    /// IO errors.
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// Serialization errors.
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Configuration errors.
    #[error("Configuration error: {0}")]
    Config(String),
}

/// Error response for Tauri commands.
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    /// Error message.
    pub message: String,
    /// Error code for frontend handling.
    pub code: String,
}

impl From<AppError> for ErrorResponse {
    fn from(error: AppError) -> Self {
        let code = match &error {
            AppError::Browser(_) => "BROWSER_ERROR",
            AppError::Sidecar(_) => "SIDECAR_ERROR",
            AppError::Io(_) => "IO_ERROR",
            AppError::Serialization(_) => "SERIALIZATION_ERROR",
            AppError::Config(_) => "CONFIG_ERROR",
        };
        Self {
            message: error.to_string(),
            code: code.to_string(),
        }
    }
}

/// Result type alias using `AppError`.
pub type Result<T> = std::result::Result<T, AppError>;
