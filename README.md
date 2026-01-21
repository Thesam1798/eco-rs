# EcoIndex Analyzer

Application desktop cross-platform pour analyser l'empreinte environnementale des pages web, alignée avec la méthodologie officielle [EcoindexApp](https://github.com/cnumr/EcoindexApp).

## Features

- **EcoIndex** : Score environnemental (A-G), émissions GES, consommation eau
- **Lighthouse** : Performance, Accessibilité, SEO, Bonnes pratiques
- **Méthodologie EcoindexApp** : Résultats cohérents avec l'application officielle
- **Offline** : 100% fonctionnel sans internet (Chrome bundlé)
- **Cross-platform** : Windows, macOS, Linux

## EcoIndex Methodology

Cette application implémente la méthodologie officielle EcoIndex avec les caractéristiques suivantes :

### Mesures alignées avec EcoindexApp

| Élément             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| **Flow API**        | Utilise `startFlow()` de Lighthouse (pas l'API directe) |
| **Warm Navigation** | Visite froide (cache), puis mesure chaude               |
| **Scroll Pattern**  | wait 3s → scroll bottom → wait 3s                       |
| **DOM Count**       | Exclut les enfants SVG (pas de Shadow DOM)              |
| **Transfer Size**   | Taille compressée (bytes over wire)                     |
| **Screen**          | Desktop 1920×1080, pas d'émulation mobile               |

### Formule EcoIndex

```
score = 100 - (5 × (3 × qDOM + 2 × qReQ + qSize)) / 6
```

Avec les quantiles officiels de [cnumr/ecoindex_reference](https://github.com/cnumr/ecoindex_reference).

### Impact environnemental

- **GES** : `2 + (2 × (50 - score)) / 100` gCO2e
- **Eau** : `3 + (3 × (50 - score)) / 100` cl

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
- **Lighthouse** : Node.js sidecar (ESM) via @yao-pkg/pkg
- **Sidecar** : Lighthouse 13 + Puppeteer-core (Flow API)
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

# Install dependencies (downloads Chrome, Node.js portable, bundles Lighthouse)
pnpm install

# Start Tauri development server (frontend + backend)
pnpm tauri:dev

# Or start Angular only (frontend dev server)
pnpm start
```

### Build

```bash
# Build release
pnpm tauri build
```

### Tests

```bash
# Frontend tests (watch mode)
pnpm test

# Frontend tests (CI mode, single run)
pnpm test:ci

# Rust tests
cd src-tauri && cargo test

# Lint all (TypeScript + Rust)
pnpm lint:all
```

### Setup manuel des sidecars

Si le postinstall échoue (proxy, etc.), vous pouvez configurer manuellement :

```bash
# Télécharger Chrome Headless Shell
pnpm download:chrome

# Télécharger Node.js portable
pnpm download:node

# Bundler Lighthouse sidecar
pnpm bundle:lighthouse

# Ou tout en une commande
pnpm setup:sidecar
```

## Available Scripts

### Development

| Script           | Description                               |
| ---------------- | ----------------------------------------- |
| `pnpm start`     | Start Angular dev server only             |
| `pnpm tauri:dev` | Start Tauri dev mode (frontend + backend) |
| `pnpm tauri`     | Run Tauri CLI commands                    |

### Build

| Script             | Description                  |
| ------------------ | ---------------------------- |
| `pnpm build`       | Build Angular for production |
| `pnpm build:tauri` | Build Rust backend only      |
| `pnpm build:all`   | Build frontend + backend     |
| `pnpm tauri build` | Build full Tauri application |

### Testing

| Script               | Description                    |
| -------------------- | ------------------------------ |
| `pnpm test`          | Run tests with Vitest (watch)  |
| `pnpm test:ui`       | Run tests with Vitest UI       |
| `pnpm test:ci`       | Run tests once (CI mode)       |
| `pnpm test:coverage` | Run tests with coverage report |

### Linting & Formatting

| Script              | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm lint`         | Run ESLint                         |
| `pnpm lint:fix`     | Fix ESLint errors automatically    |
| `pnpm lint:rust`    | Run Cargo Clippy                   |
| `pnpm lint:all`     | Lint TypeScript + Rust             |
| `pnpm format`       | Format all files with Prettier     |
| `pnpm format:check` | Check formatting without modifying |

### Sidecars & Setup

| Script                   | Description                          |
| ------------------------ | ------------------------------------ |
| `pnpm download:chrome`   | Download Chrome Headless Shell       |
| `pnpm download:node`     | Download Node.js portable            |
| `pnpm bundle:lighthouse` | Bundle Lighthouse sidecar            |
| `pnpm setup:sidecar`     | Download all + bundle (manual setup) |
| `pnpm setup`             | Force re-run postinstall setup       |

### Release

| Script                 | Description                         |
| ---------------------- | ----------------------------------- |
| `pnpm check`           | Run lint + tests + build (CI check) |
| `pnpm prepare:release` | Prepare a new release (tests + tag) |

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
│   ├── src/
│   │   └── node-main.mjs         # Main script (ESM, Flow API)
│   └── package.json
├── scripts/                      # Build scripts
│   ├── postinstall.mjs           # Auto-setup on pnpm install
│   ├── download-chrome.mjs       # Download Chrome Headless Shell
│   ├── download-node.mjs         # Download Node.js portable
│   ├── bundle-lighthouse.mjs     # Bundle Lighthouse sidecar
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

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Architecture technique détaillée |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guide de contribution |
| [docs/API.md](docs/API.md) | Documentation des commandes Tauri |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Guide développement Angular |
| [docs/BACKEND.md](docs/BACKEND.md) | Guide développement Rust |
| [docs/ECOINDEX.md](docs/ECOINDEX.md) | Méthodologie EcoIndex détaillée |
| [CLAUDE.md](CLAUDE.md) | Instructions pour Claude Code |

## License

MIT
