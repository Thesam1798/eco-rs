# Documentation API

Ce document décrit les commandes Tauri IPC exposées par le backend Rust et les types de données associés.

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Commandes Tauri](#commandes-tauri)
  - [analyze_ecoindex](#analyze_ecoindex)
  - [analyze_lighthouse](#analyze_lighthouse)
- [Types de données](#types-de-données)
  - [EcoIndexResult](#ecoindexresult)
  - [LighthouseResult](#lighthouseresult)
  - [Types auxiliaires](#types-auxiliaires)
- [Gestion des erreurs](#gestion-des-erreurs)
- [Exemples d'utilisation](#exemples-dutilisation)

## Vue d'ensemble

L'application expose deux commandes IPC principales :

| Commande | Durée | Description |
|----------|-------|-------------|
| `analyze_ecoindex` | ~5s | Analyse rapide EcoIndex uniquement |
| `analyze_lighthouse` | ~30s | Analyse complète avec Lighthouse |

Les commandes sont invoquées depuis Angular via l'API Tauri :

```typescript
import { invoke } from '@tauri-apps/api/core';

// Appel d'une commande
const result = await invoke<TypeRetour>('nom_commande', { param1, param2 });
```

## Commandes Tauri

### analyze_ecoindex

Analyse rapide d'une URL pour calculer son score EcoIndex.

**Signature Rust :**

```rust
#[tauri::command]
pub async fn analyze_ecoindex(
    app: tauri::AppHandle,
    url: String,
) -> Result<EcoIndexResult, BrowserError>
```

**Paramètres :**

| Nom | Type | Description |
|-----|------|-------------|
| `url` | `string` | URL à analyser (doit être valide avec protocole) |

**Retour :**

[`EcoIndexResult`](#ecoindexresult) - Résultat de l'analyse EcoIndex

**Exemple Angular :**

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { EcoIndexResult } from '../models';

async function analyzeQuick(url: string): Promise<EcoIndexResult> {
  return invoke<EcoIndexResult>('analyze_ecoindex', { url });
}
```

**Flux interne :**

1. Résolution du chemin Chrome bundlé
2. Lancement Chrome via CDP (chromiumoxide)
3. Navigation vers l'URL
4. Collecte des métriques (DOM, requêtes, taille)
5. Calcul du score EcoIndex
6. Fermeture du navigateur
7. Retour du résultat

---

### analyze_lighthouse

Analyse complète d'une URL avec Lighthouse et calcul EcoIndex.

**Signature Rust :**

```rust
#[tauri::command]
pub async fn analyze_lighthouse(
    app: tauri::AppHandle,
    url: String,
    include_html: bool,
) -> Result<LighthouseResult, SidecarError>
```

**Paramètres :**

| Nom | Type | Description |
|-----|------|-------------|
| `url` | `string` | URL à analyser |
| `include_html` | `boolean` | Générer un rapport HTML Lighthouse |

**Retour :**

[`LighthouseResult`](#lighthouseresult) - Résultat complet de l'analyse

**Exemple Angular :**

```typescript
import { invoke } from '@tauri-apps/api/core';
import type { LighthouseResult } from '../models';

async function analyzeFull(url: string, includeHtml = false): Promise<LighthouseResult> {
  return invoke<LighthouseResult>('analyze_lighthouse', { url, includeHtml });
}
```

**Flux interne :**

1. Résolution des chemins Chrome et Node.js bundlés
2. Spawn du sidecar Node.js avec le script Lighthouse
3. Le sidecar :
   - Lance Chrome via Puppeteer
   - Utilise Lighthouse Flow API
   - Applique le pattern de scroll EcoIndex
   - Collecte toutes les métriques
   - Retourne JSON sur stdout
4. Parse de la sortie JSON
5. Calcul EcoIndex côté Rust
6. Calcul des analytics réseau
7. Retour du résultat enrichi

---

## Types de données

### EcoIndexResult

Résultat d'une analyse EcoIndex rapide.

```typescript
interface EcoIndexResult {
  /** Score EcoIndex (0-100, plus élevé = meilleur) */
  score: number;

  /** Grade de 'A' (meilleur) à 'G' (pire) */
  grade: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

  /** Émissions de gaz à effet de serre en gCO2e par page vue */
  ghg: number;

  /** Consommation d'eau en centilitres par page vue */
  water: number;

  /** Métriques brutes utilisées pour le calcul */
  metrics: PageMetrics;

  /** URL analysée */
  url: string;

  /** Timestamp de l'analyse (ISO 8601) */
  timestamp: string;
}
```

### PageMetrics

Métriques de page collectées.

```typescript
interface PageMetrics {
  /** Nombre d'éléments DOM (sans enfants SVG) */
  dom_elements: number;

  /** Nombre de requêtes HTTP */
  requests: number;

  /** Taille totale en kilooctets */
  size_kb: number;
}
```

### LighthouseResult

Résultat complet d'une analyse Lighthouse avec EcoIndex.

```typescript
interface LighthouseResult {
  /** URL analysée */
  url: string;

  /** Timestamp de l'analyse (ISO 8601) */
  timestamp: string;

  /** Métriques EcoIndex */
  ecoindex: EcoIndexMetrics;

  /** Métriques de performance */
  performance: PerformanceMetrics;

  /** Métriques d'accessibilité */
  accessibility: AccessibilityMetrics;

  /** Métriques Best Practices */
  bestPractices: BestPracticesMetrics;

  /** Métriques SEO */
  seo: SeoMetrics;

  /** Détails de chaque requête HTTP */
  requests: RequestDetail[];

  /** Analyse du cache */
  cacheAnalysis: CacheItem[];

  /** Chemin vers le rapport HTML (si demandé) */
  htmlReportPath?: string;

  /** Analytics pré-calculés */
  analytics?: RequestAnalytics;

  /** Métriques TTFB */
  ttfb?: TtfbMetrics;

  /** Analyse de couverture (JS/CSS inutilisés) */
  coverage?: CoverageAnalytics;

  /** Opportunités de compression */
  compression?: CompressionAnalytics;

  /** Opportunités de format d'image */
  imageFormats?: ImageFormatAnalytics;
}
```

### EcoIndexMetrics

Métriques EcoIndex dans le résultat Lighthouse.

```typescript
interface EcoIndexMetrics {
  /** Score EcoIndex (0-100) */
  score: number;

  /** Grade (A-G) */
  grade: string;

  /** Émissions GES (gCO2e) */
  ghg: number;

  /** Consommation eau (cl) */
  water: number;

  /** Nombre d'éléments DOM */
  domElements: number;

  /** Nombre de requêtes HTTP */
  requests: number;

  /** Taille en KB */
  sizeKb: number;

  /** Répartition par type de ressource */
  resourceBreakdown: ResourceBreakdown;
}
```

### PerformanceMetrics

Métriques de performance Lighthouse.

```typescript
interface PerformanceMetrics {
  /** Score de performance (0-100) */
  performanceScore: number;

  /** First Contentful Paint (ms) */
  firstContentfulPaint: number;

  /** Largest Contentful Paint (ms) */
  largestContentfulPaint: number;

  /** Total Blocking Time (ms) */
  totalBlockingTime: number;

  /** Cumulative Layout Shift */
  cumulativeLayoutShift: number;

  /** Speed Index (ms) */
  speedIndex: number;

  /** Time to Interactive (ms) */
  timeToInteractive: number;
}
```

### Types auxiliaires

#### ResourceBreakdown

```typescript
interface ResourceBreakdown {
  scripts: number;      // JavaScript
  stylesheets: number;  // CSS
  images: number;       // Images
  fonts: number;        // Polices
  xhr: number;          // XHR/Fetch
  other: number;        // Autres
}
```

#### RequestDetail

```typescript
interface RequestDetail {
  url: string;            // URL complète
  domain: string;         // Domaine
  protocol: string;       // h2, http/1.1, etc.
  statusCode: number;     // Code HTTP
  mimeType: string;       // Type MIME
  resourceType: string;   // Document, Script, Image, etc.
  transferSize: number;   // Taille transférée (compressée)
  resourceSize: number;   // Taille ressource (décompressée)
  priority: string;       // Priorité (VeryHigh, High, Medium, Low)
  startTime: number;      // Temps de début (ms)
  endTime: number;        // Temps de fin (ms)
  duration: number;       // Durée (ms)
  fromCache: boolean;     // Servi depuis cache
  cacheLifetimeMs: number; // Durée de vie cache (ms)
}
```

#### CacheItem

```typescript
interface CacheItem {
  url: string;
  cacheLifetimeMs: number;      // Durée de vie cache
  cacheHitProbability: number;  // Probabilité de hit (0-1)
  totalBytes: number;
  wastedBytes: number;          // Bytes gaspillés
}
```

#### TtfbMetrics

```typescript
interface TtfbMetrics {
  ttfb: number;         // Time To First Byte (ms)
  displayValue: string; // Valeur formatée
}
```

#### CoverageAnalytics

```typescript
interface CoverageAnalytics {
  unusedJs: UnusedCodeStats;
  unusedCss: UnusedCodeStats;
}

interface UnusedCodeStats {
  wastedBytes: number;
  wastedPercentage: number;
  items: CoverageItem[];
}

interface CoverageItem {
  url: string;
  totalBytes: number;
  wastedBytes: number;
  wastedPercent: number;
}
```

#### CompressionAnalytics

```typescript
interface CompressionAnalytics {
  potentialSavings: number;  // Économies potentielles (bytes)
  items: CompressionItem[];
  score: number;             // Score (0-100)
}

interface CompressionItem {
  url: string;
  totalBytes: number;
  wastedBytes: number;
}
```

#### ImageFormatAnalytics

```typescript
interface ImageFormatAnalytics {
  potentialSavings: number;  // Économies potentielles (bytes)
  items: ImageFormatItem[];
  score: number;             // Score (0-100)
}

interface ImageFormatItem {
  url: string;
  fromFormat: string;    // Format actuel (jpeg, png, etc.)
  totalBytes: number;
  wastedBytes: number;
}
```

#### AccessibilityMetrics

```typescript
interface AccessibilityMetrics {
  accessibilityScore: number;  // Score (0-100)
  issues: AccessibilityIssue[];
}

interface AccessibilityIssue {
  id: string;      // Identifiant de l'audit
  title: string;   // Titre de l'issue
  impact: string;  // critical, serious, moderate, minor
}
```

#### RequestAnalytics

Analytics pré-calculés côté Rust.

```typescript
interface RequestAnalytics {
  /** Stats par domaine */
  domainStats: DomainStat[];

  /** Stats par protocole */
  protocolStats: ProtocolStat[];

  /** Ressources dupliquées */
  duplicates: DuplicateResource[];

  /** Issues de cache */
  cacheIssues: CacheIssue[];
}
```

---

## Gestion des erreurs

### BrowserError

Erreurs liées au navigateur (commande `analyze_ecoindex`).

```typescript
interface BrowserError {
  type: 'ChromeNotFound' | 'NavigationFailed' | 'MetricsCollectionFailed' | 'Timeout';
  details: string;
}
```

### SidecarError

Erreurs liées au sidecar (commande `analyze_lighthouse`).

```typescript
interface SidecarError {
  type: 'BinaryNotFound' | 'SpawnFailed' | 'ProcessFailed' | 'ParseError' | 'AnalysisFailed';
  details: string;
}
```

### Gestion côté Angular

```typescript
async function analyze(url: string): Promise<void> {
  try {
    const result = await invoke<EcoIndexResult>('analyze_ecoindex', { url });
    // Traitement du résultat
  } catch (err) {
    const error = parseError(err);
    console.error(`[${error.code}] ${error.message}`);
  }
}

function parseError(err: unknown): { code: string; message: string } {
  if (typeof err === 'object' && err !== null) {
    const e = err as Record<string, unknown>;
    if ('type' in e && 'details' in e) {
      return { code: String(e.type), message: String(e.details) };
    }
    if ('message' in e) {
      return { code: 'UNKNOWN', message: String(e.message) };
    }
  }
  return { code: 'UNKNOWN', message: String(err) };
}
```

---

## Exemples d'utilisation

### Service Angular complet

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

@Injectable({ providedIn: 'root' })
export class AnalyzerService {
  private readonly _state = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  private readonly _result = signal<EcoIndexResult | LighthouseResult | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = computed(() => this._state() === 'loading');
  readonly result = this._result.asReadonly();
  readonly error = this._error.asReadonly();

  async analyzeQuick(url: string): Promise<void> {
    this._state.set('loading');
    this._error.set(null);

    try {
      const data = await invoke<EcoIndexResult>('analyze_ecoindex', { url });
      this._result.set(data);
      this._state.set('success');
    } catch (err) {
      this._error.set(this.parseError(err));
      this._state.set('error');
    }
  }

  async analyzeFull(url: string, includeHtml = false): Promise<void> {
    this._state.set('loading');
    this._error.set(null);

    try {
      const data = await invoke<LighthouseResult>('analyze_lighthouse', {
        url,
        includeHtml,
      });
      this._result.set(data);
      this._state.set('success');
    } catch (err) {
      this._error.set(this.parseError(err));
      this._state.set('error');
    }
  }

  private parseError(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const e = err as Record<string, unknown>;
      if ('details' in e) return String(e.details);
      if ('message' in e) return String(e.message);
    }
    return String(err);
  }
}
```

### Composant Angular

```typescript
@Component({
  selector: 'app-analyzer',
  template: `
    <form (ngSubmit)="analyze()">
      <input [(ngModel)]="url" placeholder="https://example.com" />
      <button type="submit" [disabled]="analyzerService.isLoading()">
        {{ analyzerService.isLoading() ? 'Analyse...' : 'Analyser' }}
      </button>
    </form>

    @if (analyzerService.error()) {
      <div class="error">{{ analyzerService.error() }}</div>
    }

    @if (analyzerService.result(); as result) {
      <div class="result">
        <span class="score">{{ result.score }}</span>
        <span class="grade">{{ result.grade }}</span>
      </div>
    }
  `,
})
export class AnalyzerComponent {
  url = '';
  analyzerService = inject(AnalyzerService);

  async analyze(): Promise<void> {
    if (this.url) {
      await this.analyzerService.analyzeQuick(this.url);
    }
  }
}
```

---

## Voir aussi

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture globale
- [FRONTEND.md](FRONTEND.md) - Guide développement Angular
- [BACKEND.md](BACKEND.md) - Guide développement Rust
- [ECOINDEX.md](ECOINDEX.md) - Méthodologie EcoIndex
