# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EcoIndex Analyzer is a cross-platform desktop app built with **Angular 20+ (frontend)** and **Rust/Tauri 2 (backend)**. It analyzes web pages for environmental impact using the official EcoIndex methodology and Lighthouse metrics.

## Common Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm tauri dev            # Start Tauri dev mode (frontend + backend)
pnpm start                # Angular dev server only

# Testing
pnpm test                 # Run Vitest tests (watch mode)
pnpm test:ci              # Run tests once (CI mode)
cd src-tauri && cargo test # Rust tests

# Linting & Formatting
pnpm lint                 # ESLint
pnpm lint:fix             # ESLint auto-fix
pnpm lint:rust            # Cargo clippy (or: cd src-tauri && cargo clippy)
pnpm format               # Prettier
pnpm format:check         # Check formatting

# Build
pnpm build                # Build Angular
pnpm tauri build          # Build full Tauri app

# Sidecar setup (required for first run)
pnpm download:chrome      # Download Chrome for Testing
pnpm bundle:lighthouse    # Build Lighthouse sidecar
```

## Architecture

### Frontend (Angular 20+)

- **Location**: `src/`
- **Pattern**: Standalone components, signals, OnPush change detection
- **Styling**: Tailwind CSS v4
- **Structure**:
  - `src/app/core/` - Services, models, utils
  - `src/app/features/` - Feature modules (analyzer, results)
  - `src/app/shared/` - Shared components and pipes

### Backend (Rust/Tauri 2)

- **Location**: `src-tauri/`
- **Structure**:
  - `src/commands/` - Tauri IPC commands
  - `src/domain/` - Domain models
  - `src/browser/` - Chrome automation
  - `src/calculator/` - EcoIndex calculation
  - `src/sidecar/` - Lighthouse sidecar communication
  - `src/errors/` - Error types (uses `thiserror`)

### Lighthouse Sidecar

- **Location**: `lighthouse-sidecar/`
- Node.js ESM sidecar bundled with `@yao-pkg/pkg`
- Uses Lighthouse Flow API for EcoIndex-compliant measurements

## Code Quality

### Commit Convention

Uses Conventional Commits: `<type>(<scope>): <description>`

- **Types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- **Scopes**: app, backend, ui, api, config, deps, hooks, ci, docs, scripts, rust, tauri, eslint, vitest, tailwind

### Git Hooks (Husky)

- `pre-commit`: lint-staged (ESLint + Prettier on staged files)
- `commit-msg`: commitlint validation

### Linting Rules

- **TypeScript**: Strict mode, no `any`, explicit return types
- **Angular**: OnPush preferred, standalone required, `app-` prefix
- **Rust**: Clippy pedantic/nursery, no `unwrap`/`expect`/`panic`

## EcoIndex Methodology

The app implements official EcoIndex methodology:

- Uses Lighthouse Flow API with warm navigation
- Scroll pattern: wait 3s → scroll bottom → wait 3s
- DOM count excludes SVG children
- Transfer size = compressed bytes over wire
- Desktop viewport: 1920×1080
