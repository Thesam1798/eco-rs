//! Browser automation module for metrics collection.

pub mod collector;
pub mod launcher;

pub use collector::MetricsCollector;
pub use launcher::BrowserLauncher;
