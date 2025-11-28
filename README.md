# EcoIndex Analyzer

Application desktop cross-platform pour analyser l'empreinte environnementale des pages web.

## Stack Technique

- **Frontend** : Angular 20+ (standalone, signals, OnPush)
- **Backend** : Rust + Tauri 2
- **CSS** : Tailwind CSS v4
- **Tests** : Vitest
- **Package Manager** : pnpm

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 8
- [Rust](https://www.rust-lang.org/tools/install) >= 1.75
- [Tauri CLI](https://v2.tauri.app/start/prerequisites/)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd eco-app-rs

# Install dependencies
pnpm install

# Install Rust dependencies
cd src-tauri && cargo build
```

## Development

```bash
# Start development server
pnpm tauri dev

# Or run frontend only
pnpm start
```

## Available Scripts

| Script               | Description                        |
| -------------------- | ---------------------------------- |
| `pnpm start`         | Start Angular development server   |
| `pnpm build`         | Build Angular for production       |
| `pnpm test`          | Run unit tests with Vitest         |
| `pnpm test:ui`       | Run tests with Vitest UI           |
| `pnpm test:coverage` | Run tests with coverage report     |
| `pnpm lint`          | Run ESLint on all files            |
| `pnpm lint:fix`      | Fix ESLint errors automatically    |
| `pnpm format`        | Format all files with Prettier     |
| `pnpm format:check`  | Check formatting without modifying |
| `pnpm tauri dev`     | Start Tauri in development mode    |
| `pnpm tauri build`   | Build Tauri application            |

## Project Structure

```
eco-app-rs/
├── src/                          # Angular Frontend
│   ├── app/
│   │   ├── core/                 # Core services and guards
│   │   ├── shared/               # Shared components and utilities
│   │   ├── features/             # Feature modules
│   │   └── models/               # TypeScript interfaces
│   └── styles/
│       └── tailwind.css          # Tailwind CSS v4 theme
├── src-tauri/                    # Rust Backend
│   ├── src/
│   │   ├── domain/               # Domain models
│   │   ├── errors/               # Error types
│   │   ├── utils/                # Utility functions
│   │   ├── app.rs                # Tauri app builder
│   │   ├── lib.rs                # Library entry point
│   │   └── main.rs               # Binary entry point
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
├── .husky/                       # Git hooks
├── .vscode/                      # VSCode settings
├── eslint.config.js              # ESLint flat config
├── vitest.config.ts              # Vitest configuration
└── package.json
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

**Scopes**: app, backend, ui, api, config, deps, hooks, ci, docs, rust, tauri

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
