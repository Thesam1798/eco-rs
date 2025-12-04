//! `EcoIndex` Analyzer - Rust backend library.
//!
//! This library provides the core functionality for the `EcoIndex` Analyzer application,
//! including web page analysis, `EcoIndex` calculation, and Lighthouse integration.

pub mod analytics;
mod app;
pub mod browser;
pub mod calculator;
pub mod commands;
pub mod domain;
pub mod errors;
pub mod sidecar;
pub mod utils;

use tauri::Manager;

/// Mobile entry point for Tauri.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[allow(clippy::panic)]
pub fn run() {
    app::build()
        .unwrap_or_else(|err| panic!("Failed to build application: {err}"))
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // Kill any running Node.js sidecar process before exiting
                // This ensures Chrome (launched by Node.js) is also terminated
                if let Some(state) = app_handle.try_state::<sidecar::AnalysisState>() {
                    let pid_arc = state.current_pid.clone();
                    tauri::async_runtime::block_on(async {
                        let pid_opt = pid_arc.lock().await.take();
                        if let Some(pid) = pid_opt {
                            kill_process(pid);
                        }
                    });
                }
            }
        });
}

/// Kill a process by PID.
/// Sends SIGTERM on Unix, uses taskkill on Windows.
fn kill_process(pid: u32) {
    #[cfg(unix)]
    {
        // Send SIGTERM to Node.js process using kill command
        // Node.js signal handlers will clean up Chrome
        let _ = std::process::Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .spawn();
    }

    #[cfg(windows)]
    {
        // On Windows, use taskkill with /T to kill child processes
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .spawn();
    }
}
