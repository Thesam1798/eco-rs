//! Domain models for the `EcoIndex` Analyzer application.
//!
//! This module contains all domain types used throughout the application.

mod ecoindex;
mod lighthouse;
mod metrics;

pub use ecoindex::{EcoIndexGrade, EcoIndexResult};
pub use lighthouse::{CoreWebVitals, LighthouseResult, MetricStatus, PerformanceMetrics};
pub use metrics::{PageMetrics, ResourceMetrics, ResourceType};
