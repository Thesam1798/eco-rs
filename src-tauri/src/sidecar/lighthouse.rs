//! Lighthouse sidecar wrapper.
//!
//! Executes the Lighthouse Node.js sidecar and parses results.

use serde::{Deserialize, Serialize};
use tauri_plugin_shell::ShellExt;

use crate::errors::SidecarError;

/// Résultat `EcoIndex` du plugin Lighthouse.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EcoIndexMetrics {
    /// `EcoIndex` score (0-100).
    pub score: f64,
    /// Grade (A-G).
    pub grade: String,
    /// Greenhouse gas emissions (gCO2e).
    pub ghg: f64,
    /// Water consumption (cl).
    pub water: f64,
    /// Number of DOM elements.
    pub dom_elements: u32,
    /// Number of HTTP requests.
    pub requests: u32,
    /// Page size in KB.
    pub size_kb: f64,
}

/// Métriques Performance Lighthouse.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceMetrics {
    /// Performance score (0-100).
    pub performance_score: u32,
    /// First Contentful Paint (ms).
    pub first_contentful_paint: f64,
    /// Largest Contentful Paint (ms).
    pub largest_contentful_paint: f64,
    /// Total Blocking Time (ms).
    pub total_blocking_time: f64,
    /// Cumulative Layout Shift.
    pub cumulative_layout_shift: f64,
    /// Speed Index (ms).
    pub speed_index: f64,
    /// Time to Interactive (ms).
    pub time_to_interactive: f64,
}

/// Métriques Accessibility.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilityMetrics {
    /// Accessibility score (0-100).
    pub accessibility_score: u32,
    /// List of accessibility issues.
    pub issues: Vec<AccessibilityIssue>,
}

/// Accessibility issue details.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessibilityIssue {
    /// Issue identifier.
    pub id: String,
    /// Issue title.
    pub title: String,
    /// Impact level.
    pub impact: String,
}

/// Métriques Best Practices.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BestPracticesMetrics {
    /// Best Practices score (0-100).
    pub best_practices_score: u32,
}

/// Métriques SEO.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeoMetrics {
    /// SEO score (0-100).
    pub seo_score: u32,
}

/// Résultat complet de l'analyse Lighthouse.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LighthouseResult {
    /// Analyzed URL.
    pub url: String,
    /// Timestamp of analysis.
    pub timestamp: String,
    /// `EcoIndex` metrics from plugin.
    pub ecoindex: EcoIndexMetrics,
    /// Performance metrics.
    pub performance: PerformanceMetrics,
    /// Accessibility metrics.
    pub accessibility: AccessibilityMetrics,
    /// Best Practices metrics.
    pub best_practices: BestPracticesMetrics,
    /// SEO metrics.
    pub seo: SeoMetrics,
    /// Raw HTML Lighthouse report (if requested).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_lighthouse_report: Option<String>,
}

/// Erreur retournée par le sidecar.
#[derive(Debug, Clone, Deserialize)]
struct SidecarErrorResponse {
    #[allow(dead_code)]
    error: bool,
    code: String,
    message: String,
    #[allow(dead_code)]
    details: Option<String>,
}

/// Output du sidecar (succès ou erreur).
#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
enum SidecarOutput {
    Success(LighthouseResult),
    Error(SidecarErrorResponse),
}

/// Exécute l'analyse Lighthouse via le sidecar Node.js.
pub async fn run_lighthouse_analysis(
    app: &tauri::AppHandle,
    url: &str,
    chrome_path: &str,
    include_html: bool,
) -> Result<LighthouseResult, SidecarError> {
    let shell = app.shell();

    // Construire les arguments
    let mut args = vec![url.to_string(), chrome_path.to_string()];
    if include_html {
        args.push("--html".to_string());
    }

    // Exécuter le sidecar
    let output = shell
        .sidecar("lighthouse-sidecar")
        .map_err(|e| SidecarError::SpawnFailed(e.to_string()))?
        .args(&args)
        .output()
        .await
        .map_err(|e| SidecarError::CommunicationError(e.to_string()))?;

    // Vérifier le code de sortie
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);

        // Essayer de parser l'erreur JSON
        if let Ok(error_response) = serde_json::from_str::<SidecarErrorResponse>(&stdout) {
            return Err(SidecarError::AnalysisFailed {
                code: error_response.code,
                message: error_response.message,
            });
        }

        return Err(SidecarError::ProcessFailed {
            code: output.status.code().unwrap_or(-1),
            stderr: format!("stderr: {stderr}, stdout: {stdout}"),
        });
    }

    // Parser la sortie JSON
    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: SidecarOutput = serde_json::from_str(&stdout).map_err(|e| {
        SidecarError::ParseError(format!("JSON parse error: {e}, output: {stdout}"))
    })?;

    match result {
        SidecarOutput::Success(lighthouse_result) => Ok(lighthouse_result),
        SidecarOutput::Error(error_response) => Err(SidecarError::AnalysisFailed {
            code: error_response.code,
            message: error_response.message,
        }),
    }
}
