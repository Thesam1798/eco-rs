//! Tauri application builder.
//!
//! This module configures and builds the Tauri application with all plugins and handlers.

use log::LevelFilter;
use simplelog::{CombinedLogger, Config, SharedLogger, WriteLogger};
#[cfg(debug_assertions)]
use simplelog::{TermLogger, TerminalMode};
use std::fs::File;
use tauri::App;

use crate::utils::AppPaths;

/// Initialize the logging system.
///
/// Logs are written to both terminal (in debug mode) and a file.
fn init_logger() {
    let mut loggers: Vec<Box<dyn SharedLogger>> = Vec::new();

    // Terminal logger (debug builds only)
    #[cfg(debug_assertions)]
    {
        loggers.push(TermLogger::new(
            LevelFilter::Debug,
            Config::default(),
            TerminalMode::Mixed,
            simplelog::ColorChoice::Auto,
        ));
    }

    // File logger (always enabled, debug level)
    if let Some(paths) = AppPaths::new() {
        if paths.ensure_dirs().is_ok() {
            let log_file = paths.logs_dir.join("ecoindex.log");
            if let Ok(file) = File::create(&log_file) {
                loggers.push(WriteLogger::new(
                    LevelFilter::Debug,
                    Config::default(),
                    file,
                ));
            }
        }
    }

    // Initialize combined logger (ignore error if already initialized)
    if !loggers.is_empty() {
        let _ = CombinedLogger::init(loggers);
    }
}

/// Configure and build the Tauri application.
///
/// # Errors
///
/// Returns an error if the application fails to build.
pub fn build() -> tauri::Result<App> {
    // Initialize logging first
    init_logger();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .manage(crate::sidecar::AnalysisState::default())
        .setup(|app| {
            let version = app.package_info().version.to_string();
            let name = &app.package_info().name;
            log::info!("Starting {name} v{version}");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_app_version,
            analyze_ecoindex,
            analyze_lighthouse,
        ])
        .build(tauri::generate_context!())
}

/// Simple greeting command for testing.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! Welcome to EcoIndex Analyzer.")
}

/// Get the application version.
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Analyzes a URL and returns its `EcoIndex` result (fast mode, ~5s).
#[tauri::command]
async fn analyze_ecoindex(
    app: tauri::AppHandle,
    url: String,
) -> Result<crate::domain::EcoIndexResult, crate::errors::BrowserError> {
    use crate::browser::{BrowserLauncher, MetricsCollector};
    use crate::calculator::EcoIndexCalculator;
    use crate::utils::resolve_chrome_path;

    let chrome_path = resolve_chrome_path(&app)?;

    let launcher = BrowserLauncher::new(chrome_path);
    let (browser, handler) = launcher.launch().await?;

    let collector = MetricsCollector::new(&browser);
    let metrics = collector.collect(&url).await?;

    drop(browser);
    handler.abort();

    let result = EcoIndexCalculator::compute(&metrics, &url);

    Ok(result)
}

/// Full Lighthouse analysis with `EcoIndex` plugin (~30s).
#[tauri::command]
async fn analyze_lighthouse(
    app: tauri::AppHandle,
    url: String,
    include_html: bool,
) -> Result<crate::sidecar::LighthouseResult, crate::errors::SidecarError> {
    crate::commands::analyze_lighthouse(app, url, include_html).await
}
