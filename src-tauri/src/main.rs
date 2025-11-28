//! `EcoIndex` Analyzer - Entry point.
//!
//! This binary crate serves as the entry point for the `EcoIndex` Analyzer application.

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    ecoindex_app_lib::run();
}
