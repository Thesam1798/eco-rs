//! Lighthouse sidecar wrapper.
//!
//! Executes the Lighthouse Node.js sidecar and parses results.
//! `EcoIndex` calculation is done here using the Rust calculator.

use std::path::PathBuf;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex;

use crate::analytics::RequestAnalytics;
use crate::calculator::EcoIndexCalculator;
use crate::domain::PageMetrics;
use crate::errors::SidecarError;

// ============================================================================
// State for process tracking (enables cleanup on app exit)
// ============================================================================

/// State for tracking the current analysis process.
/// Used to kill the Node.js sidecar when the app exits.
#[derive(Default)]
pub struct AnalysisState {
    /// PID of the currently running Node.js sidecar process (if any).
    pub current_pid: Arc<Mutex<Option<u32>>>,
}

// ============================================================================
// Types for raw sidecar output (new simplified format)
// ============================================================================

/// Raw metrics from sidecar (before `EcoIndex` calculation).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawMetrics {
    dom_elements: u32,
    requests: u32,
    total_transfer_size: u64,
}

/// Lighthouse scores from sidecar.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LighthouseScores {
    performance: u32,
    accessibility: u32,
    best_practices: u32,
    seo: u32,
    fcp: f64,
    lcp: f64,
    tbt: f64,
    cls: f64,
    si: f64,
    tti: f64,
}

/// Raw sidecar output (success case).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawSidecarSuccess {
    url: String,
    raw_metrics: RawMetrics,
    resource_breakdown: ResourceBreakdown,
    #[serde(default)]
    requests: Vec<RequestDetail>,
    #[serde(default)]
    cache_analysis: Vec<CacheItem>,
    lighthouse: LighthouseScores,
    accessibility_issues: Vec<AccessibilityIssue>,
    #[serde(default)]
    html_report_path: Option<String>,
    /// TTFB metrics.
    #[serde(default)]
    ttfb: Option<TtfbMetrics>,
    /// Code coverage analytics.
    #[serde(default)]
    coverage: Option<CoverageAnalytics>,
    /// Compression analytics.
    #[serde(default)]
    compression: Option<CompressionAnalytics>,
    /// Image format analytics.
    #[serde(default)]
    image_formats: Option<ImageFormatAnalytics>,
}

// ============================================================================
// Types for final output (sent to frontend)
// ============================================================================

/// Resource breakdown by type.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ResourceBreakdown {
    /// Number of JavaScript files.
    pub scripts: u32,
    /// Number of CSS stylesheets.
    pub stylesheets: u32,
    /// Number of images.
    pub images: u32,
    /// Number of font files.
    pub fonts: u32,
    /// Number of XHR/fetch requests.
    pub xhr: u32,
    /// Other resources.
    pub other: u32,
}

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
    /// Resource breakdown by type.
    #[serde(default)]
    pub resource_breakdown: ResourceBreakdown,
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

/// Cache analysis item from uses-long-cache-ttl audit.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheItem {
    /// Full URL of the resource.
    pub url: String,
    /// Cache lifetime in milliseconds.
    pub cache_lifetime_ms: u64,
    /// Cache hit probability (0.0 - 1.0).
    pub cache_hit_probability: f64,
    /// Total bytes of the resource.
    pub total_bytes: u64,
    /// Bytes wasted due to short cache TTL (can be fractional from Lighthouse).
    pub wasted_bytes: f64,
}

/// Detailed information about a single HTTP request.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RequestDetail {
    /// Full URL of the request.
    pub url: String,
    /// Domain/hostname of the request.
    pub domain: String,
    /// Protocol used (h2, http/1.1, etc.).
    pub protocol: String,
    /// HTTP status code.
    pub status_code: u16,
    /// MIME type of the response.
    pub mime_type: String,
    /// Resource type (Document, Script, Stylesheet, Image, Font, XHR, Fetch, Other).
    pub resource_type: String,
    /// Transfer size in bytes (compressed, over the wire).
    pub transfer_size: u64,
    /// Resource size in bytes (decompressed).
    pub resource_size: u64,
    /// Request priority (`VeryHigh`, `High`, `Medium`, `Low`, `VeryLow`).
    pub priority: String,
    /// Start time in milliseconds (relative to navigation start).
    pub start_time: f64,
    /// End time in milliseconds (relative to navigation start).
    pub end_time: f64,
    /// Duration in milliseconds.
    pub duration: f64,
    /// Whether the resource was served from cache.
    pub from_cache: bool,
    /// Cache lifetime in milliseconds (from uses-long-cache-ttl audit).
    #[serde(default)]
    pub cache_lifetime_ms: u64,
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

// ============================================================================
// Additional audit types (for enhanced UI)
// ============================================================================

/// TTFB (Time To First Byte) metrics.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TtfbMetrics {
    /// TTFB in milliseconds.
    pub ttfb: f64,
    /// Display value string from Lighthouse.
    pub display_value: String,
}

/// Coverage item for unused code analysis.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageItem {
    /// Full URL of the resource.
    pub url: String,
    /// Total bytes of the resource (can be fractional from Lighthouse).
    pub total_bytes: f64,
    /// Bytes that are unused (can be fractional from Lighthouse).
    pub wasted_bytes: f64,
    /// Percentage of unused code.
    pub wasted_percent: f64,
}

/// Statistics for unused code (JS or CSS).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnusedCodeStats {
    /// Total wasted bytes (can be fractional from Lighthouse).
    pub wasted_bytes: f64,
    /// Overall wasted percentage.
    pub wasted_percentage: f64,
    /// Individual items with details.
    pub items: Vec<CoverageItem>,
}

/// Coverage analytics (unused JS/CSS).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverageAnalytics {
    /// Unused JavaScript statistics.
    pub unused_js: UnusedCodeStats,
    /// Unused CSS statistics.
    pub unused_css: UnusedCodeStats,
}

/// Compression opportunity item.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionItem {
    /// Full URL of the resource.
    pub url: String,
    /// Total bytes of the resource (can be fractional from Lighthouse).
    pub total_bytes: f64,
    /// Bytes savable with compression (can be fractional from Lighthouse).
    pub wasted_bytes: f64,
}

/// Compression analytics (gzip/brotli opportunities).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompressionAnalytics {
    /// Total potential savings in bytes (can be fractional from Lighthouse).
    pub potential_savings: f64,
    /// Individual items that can be compressed.
    pub items: Vec<CompressionItem>,
    /// Compression score (0-100, 100 = fully optimized).
    pub score: u32,
}

/// Image format opportunity item.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageFormatItem {
    /// Full URL of the image.
    pub url: String,
    /// Current format (jpeg, png, etc.).
    pub from_format: String,
    /// Total bytes of the image (can be fractional from Lighthouse).
    pub total_bytes: f64,
    /// Bytes savable with modern formats (can be fractional from Lighthouse).
    pub wasted_bytes: f64,
}

/// Image format analytics (WebP/AVIF opportunities).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageFormatAnalytics {
    /// Total potential savings in bytes (can be fractional from Lighthouse).
    pub potential_savings: f64,
    /// Individual images that can be converted.
    pub items: Vec<ImageFormatItem>,
    /// Image format score (0-100, 100 = fully optimized).
    pub score: u32,
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
    /// Detailed information about each HTTP request.
    #[serde(default)]
    pub requests: Vec<RequestDetail>,
    /// Cache analysis from uses-long-cache-ttl audit.
    #[serde(default)]
    pub cache_analysis: Vec<CacheItem>,
    /// Path to HTML Lighthouse report (if requested).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub html_report_path: Option<String>,
    /// Pre-computed request analytics.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analytics: Option<RequestAnalytics>,
    /// TTFB metrics.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ttfb: Option<TtfbMetrics>,
    /// Code coverage analytics (unused JS/CSS).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub coverage: Option<CoverageAnalytics>,
    /// Compression analytics (gzip/brotli opportunities).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub compression: Option<CompressionAnalytics>,
    /// Image format analytics (WebP/AVIF opportunities).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_formats: Option<ImageFormatAnalytics>,
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
    Success(Box<RawSidecarSuccess>),
    Error(SidecarErrorResponse),
}

/// Exécute l'analyse Lighthouse via Node.js portable + script.
/// `EcoIndex` calculation is done here using the Rust calculator.
#[allow(clippy::cast_precision_loss)]
pub async fn run_lighthouse_analysis(
    app: &tauri::AppHandle,
    url: &str,
    chrome_path: &str,
    include_html: bool,
) -> Result<LighthouseResult, SidecarError> {
    // Obtenir le chemin du script depuis les resources
    let script_path = resolve_lighthouse_script_path(app)?;

    if !script_path.exists() {
        return Err(SidecarError::SpawnFailed(format!(
            "Lighthouse script not found at: {}",
            script_path.display()
        )));
    }

    // Obtenir le chemin de Node.js portable via le sidecar
    let shell = app.shell();

    // Construire les arguments: script + url + chrome_path + options
    let mut args = vec![
        script_path.to_string_lossy().to_string(),
        url.to_string(),
        chrome_path.to_string(),
    ];
    if include_html {
        args.push("--html".to_string());
    }

    // Spawn the Node.js sidecar (using spawn() to track process for cleanup)
    // Le sidecar "node" correspond au binaire node-{arch}
    let (mut rx, child) = shell
        .sidecar("node")
        .map_err(|e| SidecarError::SpawnFailed(e.to_string()))?
        .args(&args)
        .spawn()
        .map_err(|e| SidecarError::SpawnFailed(e.to_string()))?;

    // Store PID in state for cleanup on app exit
    let pid = child.pid();
    if let Some(state) = app.try_state::<AnalysisState>() {
        *state.current_pid.lock().await = Some(pid);
    }

    // Collect output from the spawned process
    let mut stdout_data = Vec::new();
    let mut stderr_data = Vec::new();
    let mut exit_code: Option<i32> = None;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(data) => stdout_data.extend(data),
            CommandEvent::Stderr(data) => stderr_data.extend(data),
            CommandEvent::Terminated(payload) => {
                exit_code = payload.code;
                break;
            },
            _ => {},
        }
    }

    // Clear PID from state (process has finished)
    if let Some(state) = app.try_state::<AnalysisState>() {
        *state.current_pid.lock().await = None;
    }

    // Check exit code
    let success = exit_code == Some(0);
    if !success {
        let stderr = String::from_utf8_lossy(&stderr_data);
        let stdout = String::from_utf8_lossy(&stdout_data);

        // Essayer de parser l'erreur JSON
        if let Ok(error_response) = serde_json::from_str::<SidecarErrorResponse>(&stdout) {
            return Err(SidecarError::AnalysisFailed {
                code: error_response.code,
                message: error_response.message,
            });
        }

        return Err(SidecarError::ProcessFailed {
            code: exit_code.unwrap_or(-1),
            stderr: format!("stderr: {stderr}, stdout: {stdout}"),
        });
    }

    // Parser la sortie JSON
    // Extract only the JSON part (may have other output from puppeteer/lighthouse)
    let stdout = String::from_utf8_lossy(&stdout_data);
    let json_str = extract_json(&stdout).ok_or_else(|| {
        SidecarError::ParseError(format!("No valid JSON found in output: {stdout}"))
    })?;

    let result: SidecarOutput = serde_json::from_str(json_str).map_err(|e| {
        SidecarError::ParseError(format!("JSON parse error: {e}, json: {json_str}"))
    })?;

    match result {
        SidecarOutput::Success(boxed_raw) => {
            let raw = *boxed_raw;
            // Calculate EcoIndex using Rust calculator
            let size_kb = raw.raw_metrics.total_transfer_size as f64 / 1000.0;
            let metrics = PageMetrics::new(
                raw.raw_metrics.dom_elements,
                raw.raw_metrics.requests,
                size_kb,
            );

            let score = EcoIndexCalculator::compute_score(&metrics);
            let grade = EcoIndexCalculator::get_grade(score);
            let ghg = EcoIndexCalculator::compute_ghg(score);
            let water = EcoIndexCalculator::compute_water(score);

            // Build final result
            Ok(LighthouseResult {
                url: raw.url,
                timestamp: chrono::Utc::now().to_rfc3339(),
                ecoindex: EcoIndexMetrics {
                    score: (score * 100.0).round() / 100.0,
                    grade: grade.to_string(),
                    ghg: (ghg * 100.0).round() / 100.0,
                    water: (water * 100.0).round() / 100.0,
                    dom_elements: raw.raw_metrics.dom_elements,
                    requests: raw.raw_metrics.requests,
                    size_kb: (size_kb * 100.0).round() / 100.0,
                    resource_breakdown: raw.resource_breakdown,
                },
                performance: PerformanceMetrics {
                    performance_score: raw.lighthouse.performance,
                    first_contentful_paint: raw.lighthouse.fcp,
                    largest_contentful_paint: raw.lighthouse.lcp,
                    total_blocking_time: raw.lighthouse.tbt,
                    cumulative_layout_shift: raw.lighthouse.cls,
                    speed_index: raw.lighthouse.si,
                    time_to_interactive: raw.lighthouse.tti,
                },
                accessibility: AccessibilityMetrics {
                    accessibility_score: raw.lighthouse.accessibility,
                    issues: raw.accessibility_issues,
                },
                best_practices: BestPracticesMetrics {
                    best_practices_score: raw.lighthouse.best_practices,
                },
                seo: SeoMetrics {
                    seo_score: raw.lighthouse.seo,
                },
                requests: raw.requests.clone(),
                cache_analysis: raw.cache_analysis,
                html_report_path: raw.html_report_path,
                analytics: if raw.requests.is_empty() {
                    None
                } else {
                    Some(RequestAnalytics::compute(&raw.requests))
                },
                ttfb: raw.ttfb,
                coverage: raw.coverage,
                compression: raw.compression,
                image_formats: raw.image_formats,
            })
        },
        SidecarOutput::Error(error_response) => Err(SidecarError::AnalysisFailed {
            code: error_response.code,
            message: error_response.message,
        }),
    }
}

/// Extract JSON object from output string.
/// Finds the outermost `{...}` and returns it as a slice.
fn extract_json(output: &str) -> Option<&str> {
    let start = output.find('{')?;
    let mut depth = 0;
    let mut in_string = false;
    let mut escape_next = false;

    for (i, c) in output[start..].char_indices() {
        if escape_next {
            escape_next = false;
            continue;
        }

        match c {
            '\\' if in_string => escape_next = true,
            '"' => in_string = !in_string,
            '{' if !in_string => depth += 1,
            '}' if !in_string => {
                depth -= 1;
                if depth == 0 {
                    return Some(&output[start..=start + i]);
                }
            },
            _ => {},
        }
    }

    None
}

/// Resolve the Lighthouse script path.
///
/// Tries locations in order:
/// 1. Resource directory (production bundle)
/// 2. Development path (src-tauri/resources/)
fn resolve_lighthouse_script_path(app: &tauri::AppHandle) -> Result<PathBuf, SidecarError> {
    // Try resource directory first (production)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let script_path = resource_dir
            .join("lighthouse-sidecar")
            .join("node-main.mjs");
        if script_path.exists() {
            return Ok(script_path);
        }
    }

    // Try development path: target/debug -> src-tauri/resources
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // Development mode: executable is in target/debug or target/release
            if exe_dir.ends_with("debug") || exe_dir.ends_with("release") {
                if let Some(target_dir) = exe_dir.parent() {
                    if let Some(src_tauri_dir) = target_dir.parent() {
                        let script_path = src_tauri_dir
                            .join("resources")
                            .join("lighthouse-sidecar")
                            .join("node-main.mjs");
                        if script_path.exists() {
                            return Ok(script_path);
                        }
                    }
                }
            }
        }
    }

    Err(SidecarError::SpawnFailed(
        "Lighthouse script not found. Run 'pnpm bundle:lighthouse' first.".to_string(),
    ))
}
