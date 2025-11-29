//! `EcoIndex` analysis command.

use crate::browser::{BrowserLauncher, MetricsCollector};
use crate::calculator::EcoIndexCalculator;
use crate::domain::EcoIndexResult;
use crate::errors::BrowserError;
use crate::utils::resolve_chrome_path;

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
