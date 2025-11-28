//! Tauri application builder.
//!
//! This module configures and builds the Tauri application with all plugins and handlers.

use tauri::App;

/// Configure and build the Tauri application.
///
/// # Errors
///
/// Returns an error if the application fails to build.
pub fn build() -> tauri::Result<App> {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Log application info in development
            #[cfg(debug_assertions)]
            {
                let version = app.package_info().version.to_string();
                let name = &app.package_info().name;
                println!("[EcoIndex] Starting {name} v{version}");
            }

            // Suppress unused variable warning in release builds
            #[cfg(not(debug_assertions))]
            let _ = app;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_app_version,
            analyze_ecoindex,
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

/// Analyzes a URL and returns its `EcoIndex` result.
#[tauri::command]
async fn analyze_ecoindex(
    app: tauri::AppHandle,
    url: String,
) -> Result<crate::domain::EcoIndexResult, crate::errors::BrowserError> {
    use crate::browser::{BrowserLauncher, MetricsCollector};
    use crate::calculator::EcoIndexCalculator;
    use tauri::Manager;

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| crate::errors::BrowserError::NotFound(e.to_string()))?;

    let chrome_path = BrowserLauncher::resolve_chrome_path(&resource_dir);

    if !chrome_path.exists() {
        return Err(crate::errors::BrowserError::NotFound(
            chrome_path.to_string_lossy().to_string(),
        ));
    }

    let launcher = BrowserLauncher::new(chrome_path);
    let (browser, handler) = launcher.launch().await?;

    let collector = MetricsCollector::new(&browser);
    let metrics = collector.collect(&url).await?;

    drop(browser);
    handler.abort();

    let result = EcoIndexCalculator::compute(&metrics, &url);

    Ok(result)
}
