//! `EcoIndex` Analyzer - Rust backend library.
//!
//! This library provides the core functionality for the `EcoIndex` Analyzer application,
//! including web page analysis, `EcoIndex` calculation, and Lighthouse integration.

mod app;
pub mod browser;
pub mod calculator;
pub mod commands;
pub mod domain;
pub mod errors;
pub mod utils;

/// Mobile entry point for Tauri.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[allow(clippy::panic)]
pub fn run() {
    app::build()
        .unwrap_or_else(|err| panic!("Failed to build application: {err}"))
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                // Allow the app to exit gracefully
                api.prevent_exit();
            }
        });
}
