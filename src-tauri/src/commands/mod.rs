//! Tauri command handlers.

mod analyze;
mod lighthouse;

pub use analyze::analyze_ecoindex;
pub use lighthouse::analyze_lighthouse;
