//! Cross-platform path utilities.

use std::path::PathBuf;

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
}
