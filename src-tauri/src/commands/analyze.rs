//! `EcoIndex` analysis command.

use tauri::Manager;

use crate::browser::{BrowserLauncher, MetricsCollector};
use crate::calculator::EcoIndexCalculator;
use crate::domain::EcoIndexResult;
use crate::errors::BrowserError;

/// Analyzes a URL and returns its `EcoIndex` result.
///
/// This command:
/// 1. Launches Chrome bundled with the app
/// 2. Collects page metrics using the `EcoIndex` protocol
/// 3. Calculates the `EcoIndex` score
/// 4. Returns the complete result
#[tauri::command]
pub async fn analyze_ecoindex(
    app: tauri::AppHandle,
    url: String,
) -> Result<EcoIndexResult, BrowserError> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| BrowserError::NotFound(e.to_string()))?;

    let chrome_path = BrowserLauncher::resolve_chrome_path(&resource_dir);

    if !chrome_path.exists() {
        return Err(BrowserError::NotFound(
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
