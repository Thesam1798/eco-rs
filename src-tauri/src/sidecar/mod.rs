//! Sidecar process management.
//!
//! This module provides wrappers for external sidecar processes
//! like the Lighthouse Node.js binary.

mod lighthouse;

pub use lighthouse::{run_lighthouse_analysis, AnalysisState, LighthouseResult};
