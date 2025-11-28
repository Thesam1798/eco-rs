# EcoIndex Analyzer

Application desktop cross-platform pour analyser l'empreinte environnementale des pages web.

## Features

- **EcoIndex** : Score environnemental (A-G), émissions GES, consommation eau
- **Lighthouse** : Performance, Accessibilité, SEO, Bonnes pratiques
- **Offline** : 100% fonctionnel sans internet (Chrome bundlé)
- **Cross-platform** : Windows, macOS, Linux

## Installation

Téléchargez l'installeur pour votre plateforme depuis les [Releases](../../releases).

| Plateforme            | Fichier                                 |
| --------------------- | --------------------------------------- |
| Windows               | `EcoIndex-Analyzer_x.x.x_x64-setup.exe` |
| macOS (Apple Silicon) | `EcoIndex-Analyzer_x.x.x_aarch64.dmg`   |
| macOS (Intel)         | `EcoIndex-Analyzer_x.x.x_x64.dmg`       |
| Linux                 | `.deb` ou `.AppImage`                   |

## Stack Technique

- **Frontend** : Angular 20+ (standalone, signals, OnPush)
- **Backend** : Rust + Tauri 2
- **Browser** : Chrome for Testing (bundlé)
- **Lighthouse** : Node.js sidecar via @yao-pkg/pkg
- **CSS** : Tailwind CSS v4
- **Tests** : Vitest

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 9
- [Rust](https://www.rust-lang.org/tools/install) >= 1.75
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

### Installation locale

```bash
# Clone the repository
git clone <repository-url>
cd eco-app-rs

# Install dependencies
pnpm install

# Download Chrome for Testing
pnpm download:chrome

# Build Lighthouse sidecar
pnpm build:sidecar

# Start development server
pnpm tauri dev
```

### Build

```bash
# Build release
pnpm tauri build
```

### Tests

```bash
# Frontend tests
pnpm test

# Rust tests
cd src-tauri && cargo test

# Lint
pnpm lint
cargo clippy
```

## Available Scripts

| Script                 | Description                         |
| ---------------------- | ----------------------------------- |
| `pnpm start`           | Start Angular development server    |
| `pnpm build`           | Build Angular for production        |
| `pnpm test`            | Run unit tests with Vitest          |
| `pnpm test:ui`         | Run tests with Vitest UI            |
| `pnpm test:coverage`   | Run tests with coverage report      |
| `pnpm lint`            | Run ESLint on all files             |
| `pnpm lint:fix`        | Fix ESLint errors automatically     |
| `pnpm format`          | Format all files with Prettier      |
| `pnpm format:check`    | Check formatting without modifying  |
| `pnpm download:chrome` | Download Chrome for Testing         |
| `pnpm build:sidecar`   | Build Lighthouse sidecar            |
| `pnpm prepare:release` | Prepare a new release (tests + tag) |
| `pnpm tauri dev`       | Start Tauri in development mode     |
| `pnpm tauri build`     | Build Tauri application             |

## Project Structure

```
eco-app-rs/
├── src/                          # Angular Frontend
│   ├── app/
│   │   ├── core/                 # Core services, models, utils
│   │   ├── shared/               # Shared components and pipes
│   │   ├── features/             # Feature modules (analyzer, results)
│   │   └── app.routes.ts         # Application routing
│   └── styles/
│       └── tailwind.css          # Tailwind CSS v4 theme
├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── domain/               # Domain models
│   │   ├── errors/               # Error types
│   │   ├── utils/                # Utility functions (paths)
│   │   ├── app.rs                # Tauri app builder
│   │   ├── lib.rs                # Library entry point
│   │   └── main.rs               # Binary entry point
│   ├── binaries/                 # Sidecars (gitignored)
│   ├── icons/                    # Application icons
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── lighthouse-sidecar/           # Lighthouse Node.js sidecar
│   ├── src/                      # TypeScript source
│   └── package.json
├── scripts/                      # Build scripts
│   ├── download-chrome.js        # Download Chrome for Testing
│   ├── build-sidecar.js          # Build sidecar executable
│   └── prepare-release.js        # Release preparation
├── .github/workflows/            # GitHub Actions
│   ├── ci.yml                    # CI (lint + tests)
│   ├── build.yml                 # Multi-platform build
│   └── release.yml               # Release publication
└── package.json
```

## CI/CD

| Workflow      | Trigger            | Actions                             |
| ------------- | ------------------ | ----------------------------------- |
| `ci.yml`      | Push/PR on main    | Lint, tests, build check            |
| `build.yml`   | Tags v\* ou manual | Build 4 platforms, upload artifacts |
| `release.yml` | Tags v*.*.\*       | Build + publish GitHub Release      |

## Release Process

```bash
# 1. Update version in package.json and tauri.conf.json
# 2. Prepare release (runs tests, creates tag)
pnpm prepare:release

# 3. Push tag to trigger release workflow
git push origin v0.1.0
```

## Code Quality

### Linting & Formatting

- **ESLint** : TypeScript and Angular linting with strict rules
- **Prettier** : Code formatting for all files
- **Clippy** : Rust linting with pedantic rules
- **Rustfmt** : Rust code formatting

### Git Hooks (Husky)

- **pre-commit** : Runs lint-staged on staged files
- **commit-msg** : Validates commit messages with commitlint

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

**Scopes**: app, backend, ui, api, config, deps, hooks, ci, docs, scripts, rust, tauri

## IDE Setup

### VSCode

Install recommended extensions when prompted, or install manually:

- Angular Language Service
- rust-analyzer
- Tauri VSCode
- Prettier
- ESLint
- Tailwind CSS IntelliSense

## License

MIT
