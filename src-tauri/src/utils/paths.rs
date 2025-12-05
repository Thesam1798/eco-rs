//! Cross-platform path utilities.

use std::path::{Path, PathBuf};

use tauri::Manager;

use crate::errors::BrowserError;

/// Application paths for data storage and sidecars.
#[derive(Debug, Clone)]
pub struct AppPaths {
    /// Application data directory.
    pub data_dir: PathBuf,
    /// Cache directory for temporary files.
    pub cache_dir: PathBuf,
    /// Logs directory.
    pub logs_dir: PathBuf,
    /// Configuration file path.
    pub config_file: PathBuf,
}

impl AppPaths {
    /// Application name for directory creation.
    const APP_NAME: &'static str = "ecoindex-analyzer";

    /// Create application paths with platform-specific locations.
    ///
    /// Returns `None` if required directories cannot be determined.
    #[must_use]
    pub fn new() -> Option<Self> {
        let data_dir = Self::get_data_dir()?;

        Some(Self {
            cache_dir: data_dir.join("cache"),
            logs_dir: data_dir.join("logs"),
            config_file: data_dir.join("config.json"),
            data_dir,
        })
    }

    /// Get the platform-specific data directory.
    fn get_data_dir() -> Option<PathBuf> {
        #[cfg(target_os = "windows")]
        {
            std::env::var("LOCALAPPDATA")
                .ok()
                .map(|p| PathBuf::from(p).join(Self::APP_NAME))
        }

        #[cfg(target_os = "macos")]
        {
            dirs::data_local_dir().map(|p| p.join(Self::APP_NAME))
        }

        #[cfg(target_os = "linux")]
        {
            std::env::var("XDG_DATA_HOME")
                .ok()
                .map(PathBuf::from)
                .or_else(|| {
                    std::env::var("HOME")
                        .ok()
                        .map(|h| PathBuf::from(h).join(".local/share"))
                })
                .map(|p| p.join(Self::APP_NAME))
        }
    }

    /// Ensure all directories exist, creating them if necessary.
    ///
    /// # Errors
    ///
    /// Returns an error if directories cannot be created.
    pub fn ensure_dirs(&self) -> std::io::Result<()> {
        std::fs::create_dir_all(&self.data_dir)?;
        std::fs::create_dir_all(&self.cache_dir)?;
        std::fs::create_dir_all(&self.logs_dir)?;
        Ok(())
    }

    /// Get the path for storing analysis history.
    #[must_use]
    pub fn history_file(&self) -> PathBuf {
        self.data_dir.join("history.json")
    }

    /// Get a cache file path for a URL.
    #[must_use]
    pub fn cache_file_for_url(&self, url: &str) -> PathBuf {
        // Create a simple hash of the URL for the filename
        let hash = url.bytes().fold(0u64, |acc, b| {
            acc.wrapping_mul(31).wrapping_add(u64::from(b))
        });
        self.cache_dir.join(format!("{hash:016x}.json"))
    }
}

impl Default for AppPaths {
    fn default() -> Self {
        Self::new().unwrap_or_else(|| Self {
            data_dir: PathBuf::from("."),
            cache_dir: PathBuf::from("./cache"),
            logs_dir: PathBuf::from("./logs"),
            config_file: PathBuf::from("./config.json"),
        })
    }
}

/// Resolve the Chrome executable path.
///
/// Tries locations in order:
/// 1. Resource directory (bundled production mode)
/// 2. Binaries directory in lib folder (installed deb/rpm)
/// 3. Binaries directory next to executable (development mode)
///
/// # Errors
///
/// Returns an error if Chrome cannot be found in any location.
pub fn resolve_chrome_path(app: &tauri::AppHandle) -> Result<PathBuf, BrowserError> {
    let target_triple = get_target_triple();
    let mut tried_paths: Vec<String> = Vec::new();

    // Try resource directory first (production bundle)
    if let Ok(resource_dir) = app.path().resource_dir() {
        log::debug!("Resource dir: {}", resource_dir.display());

        // Try direct chrome-headless-shell directory
        let chrome_path = resolve_chrome_from_dir(&resource_dir.join("chrome-headless-shell"));
        tried_paths.push(format!("{}", chrome_path.display()));
        if chrome_path.exists() {
            log::info!("Chrome found at: {}", chrome_path.display());
            return Ok(chrome_path);
        }

        // Try binaries directory with target triple (deb/rpm structure)
        // Structure: /usr/lib/EcoIndex Analyzer/binaries/chrome-headless-shell-{target}/
        let chrome_dir = resource_dir
            .join("binaries")
            .join(format!("chrome-headless-shell-{target_triple}"));
        let chrome_path = resolve_chrome_from_dir(&chrome_dir);
        tried_paths.push(format!("{}", chrome_path.display()));
        log::debug!("Trying installed path: {}", chrome_path.display());
        if chrome_path.exists() {
            log::info!("Chrome found at: {}", chrome_path.display());
            return Ok(chrome_path);
        }
    }

    // Try binaries directory next to executable (development)
    if let Some(chrome_path) = resolve_chrome_from_dev_binaries() {
        log::info!("Chrome found at dev location: {}", chrome_path.display());
        return Ok(chrome_path);
    }

    log::error!("Chrome NOT FOUND. Tried paths: {tried_paths:?}");
    Err(BrowserError::NotFound(format!(
        "Chrome Headless Shell not found. Tried: {tried_paths:?}. Run 'pnpm download:chrome' first."
    )))
}

/// Resolve Chrome Headless Shell path from a directory.
fn resolve_chrome_from_dir(chrome_dir: &Path) -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        chrome_dir.join("chrome-headless-shell.exe")
    }

    #[cfg(target_os = "macos")]
    {
        chrome_dir.join("chrome-headless-shell")
    }

    #[cfg(target_os = "linux")]
    {
        chrome_dir.join("chrome-headless-shell")
    }
}

/// Resolve Chrome Headless Shell from development binaries directory.
///
/// In development mode, Chrome Headless Shell is downloaded to `src-tauri/binaries/chrome-headless-shell-{target}/`
fn resolve_chrome_from_dev_binaries() -> Option<PathBuf> {
    let exe_path = std::env::current_exe().ok()?;
    let exe_dir = exe_path.parent()?;

    // Development mode: executable is in target/debug or target/release
    // Binaries are in src-tauri/binaries/chrome-headless-shell-{target}/
    let binaries_dir = if exe_dir.ends_with("debug") || exe_dir.ends_with("release") {
        // target/debug -> src-tauri/binaries
        exe_dir.parent()?.parent()?.join("binaries")
    } else {
        // Installed mode - check next to executable
        exe_dir.join("binaries")
    };

    let target_triple = get_target_triple();
    let chrome_dir = binaries_dir.join(format!("chrome-headless-shell-{target_triple}"));
    let chrome_path = resolve_chrome_from_dir(&chrome_dir);

    if chrome_path.exists() {
        Some(chrome_path)
    } else {
        None
    }
}

/// Get the current target triple.
#[cfg(all(target_os = "windows", target_arch = "x86_64"))]
const fn get_target_triple() -> &'static str {
    "x86_64-pc-windows-msvc"
}

#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
const fn get_target_triple() -> &'static str {
    "x86_64-unknown-linux-gnu"
}

#[cfg(all(target_os = "macos", target_arch = "x86_64"))]
const fn get_target_triple() -> &'static str {
    "x86_64-apple-darwin"
}

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
const fn get_target_triple() -> &'static str {
    "aarch64-apple-darwin"
}

/// Fallback for unsupported platforms.
#[cfg(not(any(
    all(target_os = "windows", target_arch = "x86_64"),
    all(target_os = "linux", target_arch = "x86_64"),
    all(target_os = "macos", target_arch = "x86_64"),
    all(target_os = "macos", target_arch = "aarch64"),
)))]
const fn get_target_triple() -> &'static str {
    "unknown"
}

/// Resolve Chrome path from a resource directory (legacy compatibility).
#[must_use]
pub fn resolve_chrome_path_from_resource_dir(resource_dir: &Path) -> PathBuf {
    resolve_chrome_from_dir(&resource_dir.join("chrome"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_paths_creation() {
        let paths = AppPaths::default();
        assert!(!paths.data_dir.as_os_str().is_empty());
    }

    #[test]
    fn test_cache_file_for_url() {
        let paths = AppPaths::default();
        let cache_file = paths.cache_file_for_url("https://example.com");
        assert!(cache_file.extension().is_some_and(|ext| ext == "json"));
    }

    #[test]
    fn test_get_target_triple() {
        let triple = get_target_triple();
        assert!(!triple.is_empty());
        assert_ne!(triple, "unknown");
    }
}
