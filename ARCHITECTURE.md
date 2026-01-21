# Architecture

Ce document décrit l'architecture technique de EcoIndex Analyzer, une application desktop cross-platform pour analyser l'empreinte environnementale des pages web.

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EcoIndex Analyzer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐         ┌──────────────────────────────────────┐  │
│  │   Frontend Angular   │  IPC    │          Backend Rust/Tauri          │  │
│  │                      │◄───────►│                                      │  │
│  │  - Standalone Comps  │         │  - Commands (IPC handlers)          │  │
│  │  - Signals/State     │         │  - Calculator (EcoIndex)            │  │
│  │  - Tailwind CSS v4   │         │  - Browser (Chrome CDP)             │  │
│  │                      │         │  - Analytics (stats)                │  │
│  └──────────────────────┘         │                                      │  │
│                                   │      ┌─────────────────────────┐     │  │
│                                   │      │   Lighthouse Sidecar    │     │  │
│                                   │      │   (Node.js / ESM)       │     │  │
│                                   │      │                         │     │  │
│                                   │      │  - Flow API             │     │  │
│                                   │      │  - Puppeteer-core       │     │  │
│                                   └──────┴─────────────────────────┴─────┘  │
│                                                    │                        │
│                                                    ▼                        │
│                                   ┌─────────────────────────────────────┐   │
│                                   │     Chrome Headless Shell           │   │
│                                   │     (bundled, cross-platform)       │   │
│                                   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Composants principaux

### 1. Frontend Angular (`src/`)

Application Angular 20+ utilisant les patterns modernes :

```
src/
├── app/
│   ├── core/                    # Couche centrale
│   │   ├── models/              # Interfaces TypeScript
│   │   │   ├── ecoindex.model.ts
│   │   │   ├── analysis.model.ts
│   │   │   └── lighthouse.model.ts
│   │   ├── services/            # Services injectables
│   │   │   ├── analyzer.service.ts    # Orchestration analyses
│   │   │   └── history.service.ts     # Historique
│   │   └── utils/               # Utilitaires
│   │       └── grade-colors.util.ts
│   │
│   ├── features/                # Modules fonctionnels
│   │   ├── analyzer/            # Page d'analyse
│   │   │   ├── analyzer.component.ts
│   │   │   └── components/
│   │   │       ├── url-input/
│   │   │       ├── analysis-options/
│   │   │       └── loading-indicator/
│   │   │
│   │   └── results/             # Page de résultats
│   │       ├── results.component.ts
│   │       └── components/      # 16+ composants
│   │           ├── ecoindex-card/
│   │           ├── ecoindex-gauge/
│   │           ├── environmental-impact/
│   │           ├── core-metrics/
│   │           ├── lighthouse-section/
│   │           └── ...
│   │
│   ├── shared/                  # Composants partagés
│   │   ├── components/
│   │   │   ├── score-badge/
│   │   │   └── progress-ring/
│   │   └── pipes/
│   │       └── format-bytes.pipe.ts
│   │
│   ├── app.component.ts         # Composant racine
│   ├── app.routes.ts            # Configuration routes
│   └── app.config.ts            # Providers
│
├── main.ts                      # Point d'entrée
├── styles.scss                  # Styles globaux
└── index.html                   # Template HTML
```

**Patterns utilisés :**

- **Standalone Components** : Pas de NgModules, imports explicites
- **Signals** : Gestion d'état réactive avec `signal()`, `computed()`
- **OnPush** : Stratégie de détection de changements optimisée
- **Lazy Loading** : Routes chargées à la demande

**Exemple de service avec Signals :**

```typescript
@Injectable({ providedIn: 'root' })
export class AnalyzerService {
  // State privé
  private readonly _state = signal<AnalysisState>('idle');
  private readonly _result = signal<AnalysisResult | null>(null);

  // State public (lecture seule)
  readonly state = this._state.asReadonly();
  readonly result = this._result.asReadonly();

  // Computed
  readonly isLoading = computed(() => this._state() === 'loading');

  async analyze(url: string): Promise<void> {
    this._state.set('loading');
    const data = await invoke<EcoIndexResult>('analyze_ecoindex', { url });
    this._result.set({ mode: 'quick', data });
    this._state.set('success');
  }
}
```

### 2. Backend Rust/Tauri (`src-tauri/`)

Backend Rust avec architecture modulaire :

```
src-tauri/
├── src/
│   ├── main.rs                  # Point d'entrée binaire
│   ├── lib.rs                   # Exports publics
│   ├── app.rs                   # Configuration Tauri
│   │
│   ├── domain/                  # Modèles de domaine
│   │   ├── mod.rs
│   │   ├── ecoindex.rs          # EcoIndexResult
│   │   ├── lighthouse.rs        # LighthouseResult
│   │   ├── metrics.rs           # PageMetrics
│   │   └── quantiles.rs         # Tables quantiles officielles
│   │
│   ├── calculator/              # Calcul EcoIndex
│   │   ├── mod.rs
│   │   └── ecoindex.rs          # EcoIndexCalculator
│   │
│   ├── browser/                 # Automatisation Chrome
│   │   ├── mod.rs
│   │   ├── launcher.rs          # Lancement via CDP
│   │   └── collector.rs         # Collecte métriques
│   │
│   ├── sidecar/                 # Gestion processus externes
│   │   ├── mod.rs
│   │   └── lighthouse.rs        # Communication sidecar
│   │
│   ├── analytics/               # Analyse réseau
│   │   ├── mod.rs
│   │   ├── cache_stats.rs       # Stats cache
│   │   ├── duplicate_stats.rs   # Ressources dupliquées
│   │   ├── domain_stats.rs      # Stats par domaine
│   │   └── protocol_stats.rs    # HTTP/HTTPS
│   │
│   ├── commands/                # Handlers IPC Tauri
│   │   ├── mod.rs
│   │   ├── analyze.rs           # analyze_ecoindex
│   │   └── lighthouse.rs        # analyze_lighthouse
│   │
│   ├── errors/                  # Types d'erreurs
│   │   ├── mod.rs
│   │   ├── browser.rs           # BrowserError
│   │   └── sidecar.rs           # SidecarError
│   │
│   └── utils/                   # Utilitaires
│       ├── mod.rs
│       └── paths.rs             # Résolution chemins
│
├── binaries/                    # Executables (gitignored)
├── resources/                   # Ressources bundlées
├── icons/                       # Icônes application
├── capabilities/                # Permissions Tauri
├── Cargo.toml                   # Dépendances Rust
└── tauri.conf.json              # Configuration Tauri
```

**Flux de données :**

```
┌─────────────┐    IPC     ┌─────────────┐     CDP      ┌─────────────┐
│   Angular   │───────────►│   Command   │─────────────►│   Chrome    │
│  invoke()   │            │   Handler   │              │   Browser   │
└─────────────┘            └──────┬──────┘              └─────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │ Calculator  │
                           │  EcoIndex   │
                           └──────┬──────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │   Result    │
                           │    JSON     │
                           └─────────────┘
```

### 3. Lighthouse Sidecar (`lighthouse-sidecar/`)

Processus Node.js externe pour les analyses Lighthouse complètes :

```
lighthouse-sidecar/
├── src/
│   └── node-main.mjs           # Script principal (ESM)
├── package.json                # Dépendances
└── .npmrc                      # Configuration npm
```

**Responsabilités :**

- Utilisation de l'API Flow de Lighthouse
- Navigation à froid (cache désactivé)
- Pattern de scroll EcoIndex (3s → scroll → 3s)
- Comptage DOM sans enfants SVG
- Extraction métriques réseau détaillées

**Bundling :**

Le sidecar est packagé en binaire autonome avec `@yao-pkg/pkg` :
- Inclut Node.js runtime
- Cross-platform (Windows, macOS, Linux)
- Distribué avec l'application

## Communication IPC

### Commandes Tauri

L'application expose deux commandes principales :

#### 1. `analyze_ecoindex` (Rapide ~5s)

```rust
#[tauri::command]
pub async fn analyze_ecoindex(
    app: tauri::AppHandle,
    url: String,
) -> Result<EcoIndexResult, BrowserError>
```

Flux :
1. Lance Chrome via CDP (chromiumoxide)
2. Collecte métriques (DOM, requêtes, taille)
3. Calcule le score EcoIndex
4. Retourne `EcoIndexResult`

#### 2. `analyze_lighthouse` (Complet ~30s)

```rust
#[tauri::command]
pub async fn analyze_lighthouse(
    app: tauri::AppHandle,
    url: String,
    include_html: bool,
) -> Result<LighthouseResult, SidecarError>
```

Flux :
1. Lance le sidecar Node.js
2. Le sidecar utilise Lighthouse Flow API
3. Parse la sortie JSON
4. Calcule EcoIndex côté Rust
5. Retourne `LighthouseResult` enrichi

### Invocation depuis Angular

```typescript
// Analyse rapide
const result = await invoke<EcoIndexResult>('analyze_ecoindex', { url });

// Analyse complète
const result = await invoke<LighthouseResult>('analyze_lighthouse', {
  url,
  includeHtml: false,
});
```

## Calcul EcoIndex

### Formule

```
score = 100 - 5 × (3×Q_dom + 2×Q_req + Q_size) / 6
```

Où `Q_x` est la position quantile (0-20) interpolée linéairement.

### Tables de quantiles

Basées sur HTTP Archive (500,000 URLs) :

| Métrique | Poids | Quantile min | Quantile max |
|----------|-------|--------------|--------------|
| DOM elements | 3 | 0 | 594,601 |
| HTTP requests | 2 | 0 | 3,920 |
| Transfer size (KB) | 1 | 0 | 223,212 |

### Grades

| Grade | Score minimum |
|-------|---------------|
| A | 81 |
| B | 71 |
| C | 61 |
| D | 51 |
| E | 41 |
| F | 31 |
| G | 0 |

### Impact environnemental

```
GES (gCO2e) = 2 + 2 × (100 - score) / 100
Eau (cl)    = 3 + 3 × (100 - score) / 100
```

## Gestion des erreurs

### Backend (Rust)

Utilisation de `thiserror` pour des erreurs typées :

```rust
#[derive(Debug, thiserror::Error)]
pub enum BrowserError {
    #[error("Chrome not found: {0}")]
    ChromeNotFound(String),

    #[error("Navigation failed: {0}")]
    NavigationFailed(String),

    #[error("Metrics collection failed: {0}")]
    MetricsCollectionFailed(String),
}
```

### Frontend (TypeScript)

```typescript
interface AnalysisError {
  code: string;
  message: string;
}
```

## Configuration

### Tauri (`tauri.conf.json`)

```json
{
  "productName": "EcoIndex Analyzer",
  "identifier": "com.ecoindex.analyzer",
  "build": {
    "frontendDist": "../dist/browser"
  },
  "app": {
    "windows": [{
      "width": 1024,
      "height": 768,
      "minWidth": 800,
      "minHeight": 600
    }]
  }
}
```

### Rust (`Cargo.toml`)

Lints stricts activés :
- `clippy::pedantic`
- `clippy::nursery`
- Interdiction de `unwrap`, `expect`, `panic`

### TypeScript (`tsconfig.json`)

Mode strict avec :
- `noImplicitAny`
- `strictNullChecks`
- `noUnusedLocals`

## Build et distribution

### Plateformes supportées

| Plateforme | Architecture | Format |
|------------|--------------|--------|
| Windows | x64 | NSIS, MSI |
| macOS | Intel (x64) | DMG |
| macOS | Apple Silicon | DMG |
| Linux | x64 | DEB, RPM, AppImage |

### Processus de build

```bash
# 1. Installation dépendances
pnpm install  # Télécharge Chrome, Node.js, bundle sidecar

# 2. Build production
pnpm tauri build

# 3. Artifacts dans src-tauri/target/release/bundle/
```

### Sidecars bundlés

L'application inclut :
- **Chrome Headless Shell** : Navigateur pour les analyses
- **Node.js portable** : Runtime pour Lighthouse
- **Lighthouse sidecar** : Binaire packagé avec pkg

## Diagramme de séquence

```
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│ Angular │          │  Tauri  │          │ Sidecar │          │ Chrome  │
└────┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │                    │
     │ invoke('analyze')  │                    │                    │
     │───────────────────►│                    │                    │
     │                    │                    │                    │
     │                    │ spawn sidecar      │                    │
     │                    │───────────────────►│                    │
     │                    │                    │                    │
     │                    │                    │ launch chrome      │
     │                    │                    │───────────────────►│
     │                    │                    │                    │
     │                    │                    │ navigate + collect │
     │                    │                    │◄──────────────────►│
     │                    │                    │                    │
     │                    │ JSON stdout        │                    │
     │                    │◄───────────────────│                    │
     │                    │                    │                    │
     │                    │ parse + calculate  │                    │
     │                    │────────┐           │                    │
     │                    │        │           │                    │
     │                    │◄───────┘           │                    │
     │                    │                    │                    │
     │ Result JSON        │                    │                    │
     │◄───────────────────│                    │                    │
     │                    │                    │                    │
```

## Voir aussi

- [docs/API.md](docs/API.md) - Documentation des commandes Tauri
- [docs/FRONTEND.md](docs/FRONTEND.md) - Guide développement Angular
- [docs/BACKEND.md](docs/BACKEND.md) - Guide développement Rust
- [docs/ECOINDEX.md](docs/ECOINDEX.md) - Méthodologie EcoIndex détaillée
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guide de contribution
