# Guide Backend Rust/Tauri

Ce guide couvre le développement de la partie backend Rust de EcoIndex Analyzer.

## Table des matières

- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Structure du projet](#structure-du-projet)
- [Modules](#modules)
- [Commandes Tauri](#commandes-tauri)
- [Gestion des erreurs](#gestion-des-erreurs)
- [Tests](#tests)
- [Linting et formatage](#linting-et-formatage)
- [Bonnes pratiques](#bonnes-pratiques)
- [Debugging](#debugging)

## Architecture

Le backend utilise :

| Technologie | Version | Usage |
|-------------|---------|-------|
| Rust | 1.75+ | Langage de programmation |
| Tauri | 2.x | Framework desktop |
| Tokio | 1.x | Runtime asynchrone |
| Chromiumoxide | 0.7 | Chrome DevTools Protocol |
| Serde | 1.x | Sérialisation JSON |
| Thiserror | 2.x | Gestion des erreurs |

## Démarrage rapide

```bash
# Depuis le dossier racine
cd src-tauri

# Vérifier la compilation
cargo check

# Compiler en debug
cargo build

# Compiler en release
cargo build --release

# Lancer les tests
cargo test

# Linter (Clippy)
cargo clippy -- -D warnings

# Formater
cargo fmt
```

## Structure du projet

```
src-tauri/
├── src/
│   ├── main.rs                  # Point d'entrée binaire
│   ├── lib.rs                   # Exports publics de la bibliothèque
│   ├── app.rs                   # Configuration et builder Tauri
│   │
│   ├── domain/                  # Modèles de domaine
│   │   ├── mod.rs               # Exports du module
│   │   ├── ecoindex.rs          # EcoIndexResult
│   │   ├── lighthouse.rs        # Types Lighthouse
│   │   ├── metrics.rs           # PageMetrics
│   │   └── quantiles.rs         # Tables quantiles officielles
│   │
│   ├── calculator/              # Logique de calcul EcoIndex
│   │   ├── mod.rs
│   │   └── ecoindex.rs          # EcoIndexCalculator
│   │
│   ├── browser/                 # Automatisation Chrome
│   │   ├── mod.rs
│   │   ├── launcher.rs          # Lancement navigateur
│   │   └── collector.rs         # Collecte métriques
│   │
│   ├── sidecar/                 # Gestion processus externes
│   │   ├── mod.rs
│   │   └── lighthouse.rs        # Communication sidecar Node.js
│   │
│   ├── analytics/               # Analyse des données réseau
│   │   ├── mod.rs
│   │   ├── cache_stats.rs       # Statistiques cache
│   │   ├── duplicate_stats.rs   # Ressources dupliquées
│   │   ├── domain_stats.rs      # Stats par domaine
│   │   └── protocol_stats.rs    # Stats par protocole
│   │
│   ├── commands/                # Handlers IPC Tauri
│   │   ├── mod.rs
│   │   ├── analyze.rs           # analyze_ecoindex
│   │   └── lighthouse.rs        # analyze_lighthouse
│   │
│   ├── errors/                  # Types d'erreurs
│   │   ├── mod.rs               # Exports
│   │   ├── browser.rs           # BrowserError
│   │   └── sidecar.rs           # SidecarError
│   │
│   └── utils/                   # Utilitaires
│       ├── mod.rs
│       └── paths.rs             # Résolution chemins
│
├── binaries/                    # Sidecars (gitignored)
├── resources/                   # Ressources bundlées
├── icons/                       # Icônes application
├── capabilities/                # Permissions Tauri
│   └── default.json
├── Cargo.toml                   # Dépendances et configuration
├── Cargo.lock                   # Versions verrouillées
├── tauri.conf.json              # Configuration Tauri
├── build.rs                     # Script de build
├── clippy.toml                  # Configuration Clippy
└── rustfmt.toml                 # Configuration Rustfmt
```

## Modules

### domain/ - Modèles de données

Types de données sérialisables pour la communication frontend/backend.

```rust
// domain/ecoindex.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EcoIndexResult {
    pub score: f64,
    pub grade: char,
    pub ghg: f64,
    pub water: f64,
    pub metrics: PageMetrics,
    pub url: String,
    pub timestamp: String,
}
```

### calculator/ - Calcul EcoIndex

Implémentation de l'algorithme EcoIndex avec interpolation quantile.

```rust
// calculator/ecoindex.rs
pub struct EcoIndexCalculator;

impl EcoIndexCalculator {
    /// Calcule la position quantile avec interpolation linéaire
    pub fn get_quantile_position(value: f64, quantiles: &[f64]) -> f64 {
        // Interpolation entre les quantiles
    }

    /// Formule EcoIndex : 100 - 5 × (3×Q_dom + 2×Q_req + Q_size) / 6
    pub fn compute_score(metrics: &PageMetrics) -> f64 {
        let q_dom = Self::get_quantile_position(metrics.dom_elements as f64, &DOM_QUANTILES);
        let q_req = Self::get_quantile_position(metrics.requests as f64, &REQUEST_QUANTILES);
        let q_size = Self::get_quantile_position(metrics.size_kb, &SIZE_QUANTILES);

        let weighted = 3.0 * q_dom + 2.0 * q_req + q_size;
        100.0 - (5.0 * weighted) / 6.0
    }

    /// Détermine le grade (A-G)
    pub fn get_grade(score: f64) -> char { /* ... */ }

    /// Calcule les émissions GES
    pub fn compute_ghg(score: f64) -> f64 {
        2.0 + 2.0 * (100.0 - score) / 100.0
    }

    /// Calcule la consommation d'eau
    pub fn compute_water(score: f64) -> f64 {
        3.0 + 3.0 * (100.0 - score) / 100.0
    }
}
```

### browser/ - Automatisation Chrome

Communication avec Chrome via CDP (Chrome DevTools Protocol).

```rust
// browser/launcher.rs
use chromiumoxide::{Browser, BrowserConfig};

pub struct BrowserLauncher {
    chrome_path: PathBuf,
}

impl BrowserLauncher {
    pub async fn launch(&self) -> Result<(Browser, JoinHandle<()>), BrowserError> {
        let config = BrowserConfig::builder()
            .chrome_executable(&self.chrome_path)
            .window_size(1920, 1080)
            .build()?;

        let (browser, mut handler) = Browser::launch(config).await?;

        let handle = tokio::spawn(async move {
            loop {
                if handler.next().await.is_none() {
                    break;
                }
            }
        });

        Ok((browser, handle))
    }
}
```

### sidecar/ - Gestion du sidecar Lighthouse

Spawn et communication avec le processus Node.js externe.

```rust
// sidecar/lighthouse.rs
use tauri_plugin_shell::ShellExt;

pub async fn run_lighthouse_analysis(
    app: &AppHandle,
    url: &str,
    chrome_path: &str,
    include_html: bool,
) -> Result<LighthouseResult, SidecarError> {
    let shell = app.shell();

    let args = vec![
        script_path.to_string_lossy().to_string(),
        url.to_string(),
        chrome_path.to_string(),
    ];

    let (mut rx, child) = shell
        .sidecar("node")
        .map_err(|e| SidecarError::SpawnFailed(e.to_string()))?
        .args(&args)
        .spawn()
        .map_err(|e| SidecarError::SpawnFailed(e.to_string()))?;

    // Collecter la sortie...
    // Parser le JSON...
    // Calculer EcoIndex côté Rust...
}
```

### commands/ - Handlers IPC

Fonctions exposées au frontend via `#[tauri::command]`.

```rust
// commands/analyze.rs
#[tauri::command]
pub async fn analyze_ecoindex(
    app: tauri::AppHandle,
    url: String,
) -> Result<EcoIndexResult, BrowserError> {
    let chrome_path = resolve_chrome_path(&app)?;
    let launcher = BrowserLauncher::new(chrome_path);
    let (browser, handler) = launcher.launch().await?;

    let collector = MetricsCollector::new(&browser);
    let metrics = collector.collect(&url).await?;

    drop(browser);
    handler.abort();

    let result = EcoIndexCalculator::compute(&metrics, &url);
    Ok(result)
}
```

## Commandes Tauri

### Déclarer une commande

```rust
// Dans commands/my_command.rs
#[tauri::command]
pub async fn my_command(
    app: tauri::AppHandle,    // Injection automatique
    param1: String,           // Paramètre frontend
    param2: Option<bool>,     // Paramètre optionnel
) -> Result<MyResult, MyError> {
    // Logique...
    Ok(result)
}
```

### Enregistrer les commandes

```rust
// Dans app.rs
pub fn build_app() -> tauri::Builder<Wry> {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::analyze_ecoindex,
            commands::analyze_lighthouse,
            // Ajouter ici les nouvelles commandes
        ])
}
```

### Appeler depuis Angular

```typescript
const result = await invoke<MyResult>('my_command', {
  param1: 'value',
  param2: true,
});
```

## Gestion des erreurs

### Définir une erreur avec thiserror

```rust
// errors/browser.rs
use thiserror::Error;
use serde::Serialize;

#[derive(Debug, Error, Serialize)]
pub enum BrowserError {
    #[error("Chrome not found: {0}")]
    ChromeNotFound(String),

    #[error("Navigation failed: {0}")]
    NavigationFailed(String),

    #[error("Timeout after {0}ms")]
    Timeout(u64),

    #[error("Metrics collection failed: {0}")]
    MetricsCollectionFailed(String),
}
```

### Propager les erreurs

```rust
fn do_something() -> Result<Output, BrowserError> {
    let value = some_operation()
        .map_err(|e| BrowserError::NavigationFailed(e.to_string()))?;

    Ok(value)
}
```

### Erreurs dans les commandes

Les erreurs sont automatiquement sérialisées et envoyées au frontend :

```rust
#[tauri::command]
pub async fn my_command() -> Result<Data, MyError> {
    // Si Err retourné, sérialisé en JSON pour le frontend
    let data = risky_operation()?;
    Ok(data)
}
```

## Tests

### Tests unitaires

Dans le même fichier que le code :

```rust
// calculator/ecoindex.rs

pub fn compute_score(metrics: &PageMetrics) -> f64 {
    // ...
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_light_page_scores_high() {
        let metrics = PageMetrics::new(100, 10, 100.0);
        let score = EcoIndexCalculator::compute_score(&metrics);
        assert!(score >= 80.0, "Light page should score A: {score}");
    }

    #[test]
    fn test_heavy_page_scores_low() {
        let metrics = PageMetrics::new(5000, 200, 10000.0);
        let score = EcoIndexCalculator::compute_score(&metrics);
        assert!(score < 50.0, "Heavy page should score low: {score}");
    }

    #[test]
    fn test_grade_boundaries() {
        assert_eq!(EcoIndexCalculator::get_grade(100.0), 'A');
        assert_eq!(EcoIndexCalculator::get_grade(81.0), 'A');
        assert_eq!(EcoIndexCalculator::get_grade(80.0), 'B');
        assert_eq!(EcoIndexCalculator::get_grade(30.0), 'G');
    }
}
```

### Exécuter les tests

```bash
# Tous les tests
cargo test

# Tests d'un module
cargo test calculator

# Test spécifique
cargo test test_grade_boundaries

# Avec output
cargo test -- --nocapture
```

### Tests d'intégration

```rust
// tests/integration_test.rs (à la racine de src-tauri)
use ecoindex_app_lib::calculator::EcoIndexCalculator;
use ecoindex_app_lib::domain::PageMetrics;

#[test]
fn test_full_calculation() {
    let metrics = PageMetrics::new(500, 50, 1000.0);
    let result = EcoIndexCalculator::compute(&metrics, "https://example.com");

    assert!(result.score >= 0.0 && result.score <= 100.0);
    assert!(['A', 'B', 'C', 'D', 'E', 'F', 'G'].contains(&result.grade));
}
```

## Linting et formatage

### Configuration Clippy

Le projet utilise des lints stricts (`Cargo.toml`) :

```toml
[lints.clippy]
pedantic = { level = "warn", priority = -1 }
nursery = { level = "warn", priority = -1 }

# Interdiction de panic
unwrap_used = "warn"
expect_used = "warn"
panic = "warn"
todo = "warn"

# Performance
inefficient_to_string = "deny"
large_enum_variant = "warn"
needless_pass_by_value = "warn"

# Autorisations spécifiques
module_name_repetitions = "allow"
must_use_candidate = "allow"
```

### Exécuter Clippy

```bash
# Vérifier
cargo clippy -- -D warnings

# Depuis la racine
pnpm lint:rust
```

### Formater

```bash
cargo fmt

# Vérifier seulement
cargo fmt -- --check
```

## Bonnes pratiques

### 1. Pas de panic

```rust
// Bon - Propagation d'erreur
fn parse_value(input: &str) -> Result<u32, ParseError> {
    input.parse().map_err(ParseError::from)
}

// Éviter
fn parse_value(input: &str) -> u32 {
    input.parse().unwrap() // Peut panic !
}
```

### 2. Utiliser `?` pour propager les erreurs

```rust
// Bon
async fn process() -> Result<Data, MyError> {
    let value = step_one()?;
    let result = step_two(value)?;
    Ok(result)
}

// Éviter
async fn process() -> Result<Data, MyError> {
    let value = match step_one() {
        Ok(v) => v,
        Err(e) => return Err(e),
    };
    // ...
}
```

### 3. Documentation des fonctions publiques

```rust
/// Calcule le score EcoIndex à partir des métriques de page.
///
/// # Arguments
///
/// * `metrics` - Les métriques collectées (DOM, requêtes, taille)
///
/// # Returns
///
/// Un score entre 0 et 100 (plus élevé = meilleur)
///
/// # Example
///
/// ```
/// let metrics = PageMetrics::new(500, 50, 1000.0);
/// let score = EcoIndexCalculator::compute_score(&metrics);
/// assert!(score >= 0.0 && score <= 100.0);
/// ```
pub fn compute_score(metrics: &PageMetrics) -> f64 {
    // ...
}
```

### 4. Typage fort

```rust
// Bon - Types explicites
struct Url(String);
struct Score(f64);

fn analyze(url: Url) -> Result<Score, Error> { /* ... */ }

// Éviter - Types primitifs partout
fn analyze(url: String) -> Result<f64, Error> { /* ... */ }
```

### 5. Immutabilité par défaut

```rust
// Bon - Immutable par défaut
let result = compute();
let processed = transform(result);

// Éviter sauf si nécessaire
let mut result = compute();
result.modify();
```

### 6. Pattern matching exhaustif

```rust
// Bon - Tous les cas gérés
match grade {
    'A' => "#2ecc71",
    'B' => "#27ae60",
    'C' => "#f1c40f",
    'D' => "#e67e22",
    'E' => "#e74c3c",
    'F' => "#c0392b",
    'G' => "#8e44ad",
    _ => "#gray", // Cas par défaut explicite
}
```

## Debugging

### Logging

```rust
use log::{debug, info, warn, error};

pub fn process(url: &str) -> Result<(), Error> {
    info!("Starting analysis for: {}", url);
    debug!("Chrome path: {:?}", chrome_path);

    if let Err(e) = risky_operation() {
        warn!("Operation failed, retrying: {}", e);
    }

    error!("Fatal error occurred");
    Ok(())
}
```

### Activer les logs

```bash
# En développement
RUST_LOG=debug pnpm tauri:dev

# Niveaux: trace, debug, info, warn, error
RUST_LOG=ecoindex_app=debug,chromiumoxide=warn pnpm tauri:dev
```

### Debug avec VS Code

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Tauri",
      "cargo": {
        "args": ["build", "--manifest-path=src-tauri/Cargo.toml"]
      },
      "args": [],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

---

## Voir aussi

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture globale
- [API.md](API.md) - Documentation API Tauri
- [FRONTEND.md](FRONTEND.md) - Guide développement Angular
- [ECOINDEX.md](ECOINDEX.md) - Méthodologie EcoIndex
- [The Rust Book](https://doc.rust-lang.org/book/) - Documentation Rust
- [Tauri Docs](https://v2.tauri.app/) - Documentation Tauri
