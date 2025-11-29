//! Chrome browser launcher using CDP.

use std::path::{Path, PathBuf};

use chromiumoxide::browser::{Browser, BrowserConfig};
use futures::StreamExt;
use tokio::task::JoinHandle;

use crate::errors::BrowserError;

/// Launches and manages Chrome browser instances.
pub struct BrowserLauncher {
    chrome_path: PathBuf,
}

impl BrowserLauncher {
    /// Creates a new launcher with the specified Chrome executable path.
    #[must_use]
    pub const fn new(chrome_path: PathBuf) -> Self {
        Self { chrome_path }
    }

    /// Launches Chrome in headless mode and returns the browser instance.
    ///
    /// # Errors
    ///
    /// Returns an error if the browser fails to launch.
    pub async fn launch(&self) -> Result<(Browser, JoinHandle<()>), BrowserError> {
        let config = BrowserConfig::builder()
            .chrome_executable(&self.chrome_path)
            .no_sandbox()
            .disable_default_args()
            .arg("--headless=new")
            .arg("--disable-gpu")
            .arg("--disable-dev-shm-usage")
            .arg("--disable-extensions")
            .arg("--disable-background-networking")
            .arg("--disable-sync")
            .arg("--disable-translate")
            .arg("--disable-default-apps")
            .arg("--no-first-run")
            .arg("--window-size=1920,1080")
            .arg("--hide-scrollbars")
            .arg("--mute-audio")
            .viewport(None)
            .build()
            .map_err(BrowserError::LaunchFailed)?;

        let (browser, mut handler) = Browser::launch(config)
            .await
            .map_err(|e| BrowserError::LaunchFailed(e.to_string()))?;

        let handle = tokio::spawn(async move { while handler.next().await.is_some() {} });

        Ok((browser, handle))
    }

    /// Resolves the Chrome Headless Shell executable path based on the platform.
    #[must_use]
    pub fn resolve_chrome_path(resource_dir: &Path) -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            resource_dir
                .join("chrome-headless-shell")
                .join("chrome-headless-shell.exe")
        }

        #[cfg(target_os = "macos")]
        {
            resource_dir
                .join("chrome-headless-shell")
                .join("chrome-headless-shell")
        }

        #[cfg(target_os = "linux")]
        {
            resource_dir
                .join("chrome-headless-shell")
                .join("chrome-headless-shell")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        let launcher = BrowserLauncher::new(PathBuf::from("/path/to/chrome"));
        assert_eq!(launcher.chrome_path, PathBuf::from("/path/to/chrome"));
    }

    #[test]
    fn test_resolve_chrome_path() {
        let resource_dir = PathBuf::from("/app/resources");
        let chrome_path = BrowserLauncher::resolve_chrome_path(&resource_dir);

        #[cfg(target_os = "windows")]
        assert!(chrome_path
            .to_string_lossy()
            .contains("chrome-headless-shell.exe"));

        #[cfg(target_os = "linux")]
        assert!(chrome_path
            .to_string_lossy()
            .ends_with("chrome-headless-shell"));

        #[cfg(target_os = "macos")]
        assert!(chrome_path
            .to_string_lossy()
            .contains("chrome-headless-shell"));
    }
}
