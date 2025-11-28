//! Lighthouse analysis command.
//!
//! Full Lighthouse analysis with `EcoIndex` plugin via Node.js sidecar.

use crate::errors::SidecarError;
use crate::sidecar::{run_lighthouse_analysis, LighthouseResult};
use crate::utils::resolve_chrome_path;

/// Commande Tauri pour l'analyse Lighthouse complète.
///
/// This command runs a full Lighthouse analysis including:
/// - Performance metrics
/// - Accessibility audit
/// - Best Practices
/// - SEO
/// - `EcoIndex` (via plugin)
#[tauri::command]
pub async fn analyze_lighthouse(
    app: tauri::AppHandle,
    url: String,
    include_html: bool,
) -> Result<LighthouseResult, SidecarError> {
    // Résoudre le chemin Chrome
    let chrome_path = resolve_chrome_path(&app)
        .map_err(|e| SidecarError::BinaryNotFound(format!("Chrome not found: {e}")))?;

    let chrome_path_str = chrome_path
        .to_str()
        .ok_or_else(|| SidecarError::BinaryNotFound("Invalid Chrome path".to_string()))?;

    // Exécuter l'analyse
    run_lighthouse_analysis(&app, &url, chrome_path_str, include_html).await
}
