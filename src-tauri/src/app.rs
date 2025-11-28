//! Tauri application builder.
//!
//! This module configures and builds the Tauri application with all plugins and handlers.

use tauri::{App, Manager};

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

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_app_version,
        ])
        .build(tauri::generate_context!())
}

/// Tauri command handlers.
mod commands {
    /// Simple greeting command for testing.
    #[tauri::command]
    pub fn greet(name: &str) -> String {
        format!("Hello, {name}! Welcome to EcoIndex Analyzer.")
    }

    /// Get the application version.
    #[tauri::command]
    pub fn get_app_version() -> String {
        env!("CARGO_PKG_VERSION").to_string()
    }
}
