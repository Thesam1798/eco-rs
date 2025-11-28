//! Sidecar process error types.

use serde::Serialize;
use thiserror::Error;

/// Errors related to sidecar processes (Lighthouse, etc.).
#[derive(Error, Debug)]
pub enum SidecarError {
    /// Sidecar binary not found.
    #[error("Sidecar binary not found: {0}")]
    BinaryNotFound(String),

    /// Failed to spawn the sidecar process.
    #[error("Failed to spawn sidecar: {0}")]
    SpawnFailed(String),

    /// Sidecar process exited with error.
    #[error("Sidecar process failed with exit code {code}: {stderr}")]
    ProcessFailed {
        /// Exit code of the process.
        code: i32,
        /// Standard error output.
        stderr: String,
    },

    /// Timeout waiting for sidecar.
    #[error("Sidecar timeout after {0}ms")]
    Timeout(u64),

    /// Failed to parse sidecar output.
    #[error("Failed to parse sidecar output: {0}")]
    ParseError(String),

    /// Communication error with sidecar.
    #[error("Sidecar communication error: {0}")]
    CommunicationError(String),

    /// Analysis failed with error from sidecar.
    #[error("Analysis failed: [{code}] {message}")]
    AnalysisFailed {
        /// Error code from sidecar.
        code: String,
        /// Error message.
        message: String,
    },
}

impl Serialize for SidecarError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
