# Guide de contribution

Merci de votre intérêt pour contribuer à EcoIndex Analyzer ! Ce guide vous aidera à démarrer.

## Table des matières

- [Code de conduite](#code-de-conduite)
- [Prérequis](#prérequis)
- [Installation de l'environnement](#installation-de-lenvironnement)
- [Structure du projet](#structure-du-projet)
- [Workflow de développement](#workflow-de-développement)
- [Conventions de code](#conventions-de-code)
- [Commits et branches](#commits-et-branches)
- [Tests](#tests)
- [Pull Requests](#pull-requests)
- [Ressources utiles](#ressources-utiles)

## Code de conduite

Ce projet adhère au [Contributor Covenant](https://www.contributor-covenant.org/). En participant, vous vous engagez à respecter ce code.

## Prérequis

### Outils requis

| Outil | Version | Installation |
|-------|---------|--------------|
| Node.js | >= 22 | [nodejs.org](https://nodejs.org/) |
| pnpm | >= 9 | `npm install -g pnpm` |
| Rust | >= 1.75 | [rustup.rs](https://rustup.rs/) |
| Tauri CLI | v2 | `cargo install tauri-cli` |

### Vérification de l'installation

```bash
node --version    # v22.x.x
pnpm --version    # 9.x.x
rustc --version   # 1.75+
cargo tauri --version
```

### IDE recommandé

**VSCode** avec les extensions :
- Angular Language Service
- rust-analyzer
- Tauri VSCode
- Prettier
- ESLint
- Tailwind CSS IntelliSense

## Installation de l'environnement

### 1. Fork et clone

```bash
# Fork le repository sur GitHub
# Puis clonez votre fork
git clone https://github.com/VOTRE_USERNAME/eco-rs.git
cd eco-rs

# Ajoutez le upstream
git remote add upstream https://github.com/ORIGINAL_OWNER/eco-rs.git
```

### 2. Installation des dépendances

```bash
# Installe toutes les dépendances et configure les sidecars
pnpm install
```

Le script `postinstall` :
- Télécharge Chrome Headless Shell
- Télécharge Node.js portable
- Bundle le sidecar Lighthouse

### 3. Setup manuel (si postinstall échoue)

```bash
# Télécharger Chrome
pnpm download:chrome

# Télécharger Node.js portable
pnpm download:node

# Bundler le sidecar Lighthouse
pnpm bundle:lighthouse

# Ou tout en une commande
pnpm setup:sidecar
```

### 4. Lancer l'application

```bash
# Mode développement (frontend + backend)
pnpm tauri:dev

# Angular uniquement (pour le styling)
pnpm start
```

## Structure du projet

```
eco-rs/
├── src/                    # Frontend Angular
│   ├── app/
│   │   ├── core/           # Services, models, utils
│   │   ├── features/       # Modules fonctionnels
│   │   └── shared/         # Composants partagés
│   └── styles/
├── src-tauri/              # Backend Rust
│   ├── src/
│   │   ├── commands/       # Handlers IPC
│   │   ├── domain/         # Modèles de données
│   │   ├── calculator/     # Calcul EcoIndex
│   │   ├── browser/        # Chrome automation
│   │   ├── sidecar/        # Communication sidecar
│   │   ├── analytics/      # Analyse réseau
│   │   └── errors/         # Types d'erreurs
│   └── binaries/           # Sidecars (gitignored)
├── lighthouse-sidecar/     # Sidecar Node.js
├── scripts/                # Scripts de build
└── docs/                   # Documentation
```

Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour plus de détails.

## Workflow de développement

### 1. Synchroniser avec upstream

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### 2. Créer une branche

```bash
# Pour une feature
git checkout -b feat/ma-feature

# Pour un bugfix
git checkout -b fix/mon-bugfix

# Pour de la documentation
git checkout -b docs/ma-doc
```

### 3. Développer

```bash
# Lancer en mode dev
pnpm tauri:dev

# Les modifications Angular sont hot-reloadées
# Les modifications Rust nécessitent un restart
```

### 4. Linter et formater

```bash
# TypeScript
pnpm lint        # Vérifier
pnpm lint:fix    # Corriger

# Rust
pnpm lint:rust   # Clippy

# Prettier
pnpm format      # Formater tout
pnpm format:check # Vérifier
```

### 5. Tester

```bash
# Frontend (watch mode)
pnpm test

# Frontend (CI mode)
pnpm test:ci

# Rust
cd src-tauri && cargo test
```

### 6. Vérification complète

```bash
# Lint + tests + build
pnpm check
```

## Conventions de code

### TypeScript / Angular

- **Strict mode** : Pas de `any`, types explicites
- **Standalone** : Composants sans NgModule
- **Signals** : Préférer `signal()` à RxJS pour l'état local
- **OnPush** : Stratégie de détection de changements
- **Préfixe** : Composants avec `app-`

```typescript
// Bon
@Component({
  selector: 'app-my-component',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
  readonly data = signal<Data | null>(null);
}

// Éviter
@Component({...})
export class MyComponent {
  data: any; // Pas de any
}
```

### Rust

- **Clippy pedantic/nursery** : Lints stricts activés
- **Pas de panic** : Éviter `unwrap()`, `expect()`, `panic!()`
- **thiserror** : Utiliser pour les erreurs typées
- **Documentation** : Documenter les fonctions publiques

```rust
// Bon
pub fn do_something(input: &str) -> Result<Output, MyError> {
    let value = input.parse().map_err(MyError::ParseError)?;
    Ok(process(value))
}

// Éviter
pub fn do_something(input: &str) -> Output {
    let value = input.parse().unwrap(); // Panic possible !
    process(value)
}
```

### CSS / Tailwind

- **Tailwind v4** : Utiliser les classes utilitaires
- **Pas de CSS custom** sauf nécessité absolue
- **Responsive** : Mobile-first avec `sm:`, `md:`, `lg:`

```html
<!-- Bon -->
<div class="flex flex-col gap-4 p-4 md:flex-row md:gap-6">

<!-- Éviter -->
<div style="display: flex; flex-direction: column;">
```

## Commits et branches

### Convention de commits

Ce projet utilise [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

#### Types

| Type | Description |
|------|-------------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Formatage (pas de changement de code) |
| `refactor` | Refactoring |
| `perf` | Amélioration de performance |
| `test` | Ajout/modification de tests |
| `build` | Changements de build |
| `ci` | Configuration CI |
| `chore` | Maintenance |
| `revert` | Revert d'un commit |

#### Scopes

| Scope | Description |
|-------|-------------|
| `app` | Application globale |
| `backend` | Backend Rust |
| `ui` | Interface utilisateur |
| `api` | API/Commands Tauri |
| `config` | Configuration |
| `deps` | Dépendances |
| `ci` | CI/CD |
| `docs` | Documentation |
| `rust` | Code Rust spécifique |
| `tauri` | Configuration Tauri |

#### Exemples

```bash
# Feature
feat(ui): add dark mode toggle

# Bug fix
fix(backend): handle empty URL gracefully

# Documentation
docs(api): document analyze_lighthouse command

# Refactoring
refactor(calculator): simplify quantile interpolation
```

### Git Hooks

Les hooks Husky sont configurés :

- **pre-commit** : lint-staged (ESLint + Prettier sur fichiers staged)
- **commit-msg** : Validation commitlint

```bash
# Si vous devez bypasser (déconseillé)
git commit --no-verify -m "message"
```

## Tests

### Tests Frontend (Vitest)

```bash
# Mode watch
pnpm test

# Une seule fois
pnpm test:ci

# Avec couverture
pnpm test:coverage

# Interface UI
pnpm test:ui
```

Écrire les tests dans `*.spec.ts` :

```typescript
import { describe, it, expect } from 'vitest';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  it('should create', () => {
    // Test implementation
  });
});
```

### Tests Backend (Cargo)

```bash
cd src-tauri
cargo test
```

Écrire les tests dans le même fichier :

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculation() {
        let result = calculate(100, 50, 1000.0);
        assert!(result >= 0.0 && result <= 100.0);
    }
}
```

## Pull Requests

### Avant de soumettre

1. **Synchroniser** avec upstream/main
2. **Linter** : `pnpm lint:all`
3. **Formater** : `pnpm format`
4. **Tester** : `pnpm test:ci && cd src-tauri && cargo test`
5. **Build** : `pnpm build:all`

### Créer la PR

1. Poussez votre branche
2. Créez la PR sur GitHub
3. Remplissez le template :
   - Description claire des changements
   - Issue(s) liée(s)
   - Screenshots (si UI)
   - Checklist de vérification

### Review process

- Au moins 1 approval requis
- CI doit passer (lint, tests, build)
- Pas de conflits avec main
- Commits squashés si demandé

### Après merge

```bash
git checkout main
git pull upstream main
git branch -d feat/ma-feature
```

## Ressources utiles

### Documentation officielle

- [Angular](https://angular.dev/)
- [Tauri](https://v2.tauri.app/)
- [Rust](https://doc.rust-lang.org/book/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Projet

- [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture technique
- [docs/API.md](docs/API.md) - API Tauri
- [docs/FRONTEND.md](docs/FRONTEND.md) - Guide Angular
- [docs/BACKEND.md](docs/BACKEND.md) - Guide Rust
- [docs/ECOINDEX.md](docs/ECOINDEX.md) - Méthodologie EcoIndex

### EcoIndex

- [EcoIndex officiel](https://www.ecoindex.fr/)
- [Méthodologie](https://github.com/cnumr/ecoindex_reference)
- [EcoindexApp](https://github.com/cnumr/EcoindexApp)

## Questions ?

- Ouvrez une [Issue](../../issues) sur GitHub
- Consultez les [Discussions](../../discussions)

Merci pour votre contribution !
