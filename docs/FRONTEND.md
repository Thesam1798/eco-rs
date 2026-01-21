# Guide Frontend Angular

Ce guide couvre le développement de la partie frontend Angular de EcoIndex Analyzer.

## Table des matières

- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Structure du projet](#structure-du-projet)
- [Patterns et conventions](#patterns-et-conventions)
- [Composants](#composants)
- [Services](#services)
- [Styling avec Tailwind](#styling-avec-tailwind)
- [Tests](#tests)
- [Communication IPC](#communication-ipc)
- [Bonnes pratiques](#bonnes-pratiques)

## Architecture

Le frontend utilise Angular 20+ avec les features modernes :

| Feature | Description |
|---------|-------------|
| Standalone Components | Pas de NgModules |
| Signals | Gestion d'état réactive |
| OnPush | Détection de changements optimisée |
| Lazy Loading | Chargement à la demande des routes |
| Tailwind CSS v4 | Styling utilitaire |

## Démarrage rapide

```bash
# Installation des dépendances
pnpm install

# Développement (Angular uniquement)
pnpm start

# Développement (avec Tauri backend)
pnpm tauri:dev

# Build production
pnpm build
```

## Structure du projet

```
src/
├── app/
│   ├── core/                    # Couche centrale
│   │   ├── models/              # Interfaces TypeScript
│   │   │   ├── index.ts         # Barrel exports
│   │   │   ├── ecoindex.model.ts
│   │   │   ├── analysis.model.ts
│   │   │   └── lighthouse.model.ts
│   │   ├── services/            # Services injectables
│   │   │   ├── analyzer.service.ts
│   │   │   └── history.service.ts
│   │   └── utils/               # Utilitaires purs
│   │       └── grade-colors.util.ts
│   │
│   ├── features/                # Modules fonctionnels
│   │   ├── analyzer/            # Feature: Page d'analyse
│   │   │   ├── analyzer.component.ts
│   │   │   ├── analyzer.component.html
│   │   │   └── components/      # Sous-composants
│   │   │       ├── url-input/
│   │   │       ├── analysis-options/
│   │   │       └── loading-indicator/
│   │   │
│   │   └── results/             # Feature: Page de résultats
│   │       ├── results.component.ts
│   │       ├── results.component.html
│   │       └── components/      # 16+ sous-composants
│   │           ├── ecoindex-card/
│   │           ├── ecoindex-gauge/
│   │           └── ...
│   │
│   ├── shared/                  # Composants/pipes réutilisables
│   │   ├── components/
│   │   │   ├── score-badge/
│   │   │   └── progress-ring/
│   │   └── pipes/
│   │       └── format-bytes.pipe.ts
│   │
│   ├── app.component.ts         # Composant racine
│   ├── app.routes.ts            # Configuration des routes
│   └── app.config.ts            # Configuration et providers
│
├── main.ts                      # Point d'entrée
├── styles.scss                  # Styles globaux
├── test-setup.ts                # Configuration Vitest
└── index.html                   # Template HTML
```

## Patterns et conventions

### Standalone Components

Tous les composants sont standalone :

```typescript
@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [CommonModule, FormsModule], // Imports explicites
  templateUrl: './my-component.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {}
```

### Signals pour l'état

Utiliser `signal()` pour l'état local, `computed()` pour les valeurs dérivées :

```typescript
@Component({...})
export class MyComponent {
  // État local
  readonly count = signal(0);
  readonly items = signal<Item[]>([]);

  // Valeur dérivée
  readonly total = computed(() => this.items().length);
  readonly isEmpty = computed(() => this.items().length === 0);

  // Modifier l'état
  increment(): void {
    this.count.update(c => c + 1);
  }

  addItem(item: Item): void {
    this.items.update(items => [...items, item]);
  }
}
```

### Injection de dépendances

Utiliser `inject()` plutôt que le constructeur :

```typescript
@Component({...})
export class MyComponent {
  // Recommandé
  private readonly analyzerService = inject(AnalyzerService);
  private readonly router = inject(Router);

  // Éviter
  // constructor(private analyzerService: AnalyzerService) {}
}
```

### OnPush Change Detection

Toujours utiliser `OnPush` :

```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

### Préfixe des composants

Utiliser le préfixe `app-` :

```typescript
@Component({
  selector: 'app-score-badge',  // Bon
  // selector: 'score-badge',   // À éviter
})
```

## Composants

### Création d'un composant

```bash
# Générer un composant standalone
ng generate component features/my-feature/components/my-component --standalone
```

### Structure type

```typescript
// my-component.component.ts
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [],
  templateUrl: './my-component.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyComponent {
  // Inputs (signals)
  readonly title = input.required<string>();
  readonly count = input(0);

  // Outputs
  readonly clicked = output<void>();

  // Computed
  readonly displayTitle = computed(() => `${this.title()}: ${this.count()}`);

  // Methods
  onClick(): void {
    this.clicked.emit();
  }
}
```

### Template

```html
<!-- my-component.component.html -->
<div class="p-4 bg-white rounded-lg shadow">
  <h2 class="text-lg font-semibold">{{ displayTitle() }}</h2>

  <button
    (click)="onClick()"
    class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
  >
    Cliquer
  </button>
</div>
```

### Utilisation

```html
<app-my-component
  [title]="'Mon titre'"
  [count]="5"
  (clicked)="handleClick()"
/>
```

## Services

### Service avec état (Signals)

```typescript
// analyzer.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

type State = 'idle' | 'loading' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class AnalyzerService {
  // État privé
  private readonly _state = signal<State>('idle');
  private readonly _result = signal<Result | null>(null);
  private readonly _error = signal<string | null>(null);

  // État public (lecture seule)
  readonly state = this._state.asReadonly();
  readonly result = this._result.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed
  readonly isLoading = computed(() => this._state() === 'loading');
  readonly hasResult = computed(() => this._result() !== null);

  // Actions
  async analyze(url: string): Promise<void> {
    this._state.set('loading');
    this._error.set(null);

    try {
      const data = await invoke<Result>('analyze_ecoindex', { url });
      this._result.set(data);
      this._state.set('success');
    } catch (err) {
      this._error.set(String(err));
      this._state.set('error');
    }
  }

  reset(): void {
    this._state.set('idle');
    this._result.set(null);
    this._error.set(null);
  }
}
```

### Utilisation dans un composant

```typescript
@Component({...})
export class AnalyzerComponent {
  private readonly analyzerService = inject(AnalyzerService);

  // Accès direct aux signals
  readonly isLoading = this.analyzerService.isLoading;
  readonly result = this.analyzerService.result;
  readonly error = this.analyzerService.error;

  async onSubmit(url: string): Promise<void> {
    await this.analyzerService.analyze(url);
  }
}
```

## Styling avec Tailwind

### Configuration

Le projet utilise Tailwind CSS v4 avec PostCSS :

```css
/* styles.scss */
@import "tailwindcss";
```

### Classes utilitaires

```html
<!-- Layout -->
<div class="flex flex-col gap-4 p-4 md:flex-row md:gap-6">

<!-- Typographie -->
<h1 class="text-2xl font-bold text-gray-900">

<!-- Couleurs -->
<div class="bg-green-500 text-white">

<!-- Responsive -->
<div class="w-full md:w-1/2 lg:w-1/3">

<!-- États -->
<button class="bg-blue-500 hover:bg-blue-600 disabled:opacity-50">

<!-- Animations -->
<div class="transition-all duration-300 ease-in-out">
```

### Thème personnalisé

Pour étendre le thème, modifier `tailwind.config.js` :

```javascript
export default {
  theme: {
    extend: {
      colors: {
        ecoindex: {
          A: '#2ecc71',
          B: '#27ae60',
          C: '#f1c40f',
          D: '#e67e22',
          E: '#e74c3c',
          F: '#c0392b',
          G: '#8e44ad',
        },
      },
    },
  },
};
```

## Tests

### Configuration

Tests avec Vitest :

```bash
# Mode watch
pnpm test

# Une seule fois (CI)
pnpm test:ci

# Avec couverture
pnpm test:coverage

# Interface UI
pnpm test:ui
```

### Écrire un test

```typescript
// my-component.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { MyComponent } from './my-component.component';

describe('MyComponent', () => {
  it('should render title', async () => {
    await render(MyComponent, {
      inputs: { title: 'Test Title', count: 5 },
    });

    expect(screen.getByText('Test Title: 5')).toBeTruthy();
  });

  it('should emit on click', async () => {
    const clickedSpy = vi.fn();

    await render(MyComponent, {
      inputs: { title: 'Test', count: 0 },
      on: { clicked: clickedSpy },
    });

    screen.getByRole('button').click();

    expect(clickedSpy).toHaveBeenCalled();
  });
});
```

### Test de service

```typescript
// analyzer.service.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AnalyzerService } from './analyzer.service';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('AnalyzerService', () => {
  let service: AnalyzerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyzerService);
  });

  it('should start in idle state', () => {
    expect(service.state()).toBe('idle');
    expect(service.result()).toBeNull();
  });

  it('should set loading state on analyze', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    vi.mocked(invoke).mockResolvedValue({ score: 80 });

    const promise = service.analyze('https://example.com');

    expect(service.state()).toBe('loading');

    await promise;

    expect(service.state()).toBe('success');
    expect(service.result()?.score).toBe(80);
  });
});
```

## Communication IPC

### Import de l'API Tauri

```typescript
import { invoke } from '@tauri-apps/api/core';
```

### Appel d'une commande

```typescript
// Typage du retour
const result = await invoke<EcoIndexResult>('analyze_ecoindex', { url });

// Typage des paramètres
interface AnalyzeParams {
  url: string;
  includeHtml: boolean;
}

const result = await invoke<LighthouseResult>('analyze_lighthouse', {
  url: 'https://example.com',
  includeHtml: false,
} satisfies AnalyzeParams);
```

### Gestion des erreurs

```typescript
try {
  const result = await invoke<Result>('command', { param });
} catch (err) {
  // Les erreurs Rust sont sérialisées
  if (typeof err === 'object' && err !== null) {
    const { type, details } = err as { type: string; details: string };
    console.error(`[${type}] ${details}`);
  }
}
```

## Bonnes pratiques

### 1. Utiliser des types stricts

```typescript
// Bon
interface User {
  id: string;
  name: string;
  email: string;
}

const user = signal<User | null>(null);

// Éviter
const user = signal<any>(null);
```

### 2. Préférer les signaux aux observables pour l'état local

```typescript
// Bon - Signals
readonly count = signal(0);
readonly doubled = computed(() => this.count() * 2);

// Éviter pour l'état local simple
// readonly count$ = new BehaviorSubject(0);
```

### 3. Extraire la logique métier dans des services

```typescript
// Bon - Logique dans le service
@Injectable({ providedIn: 'root' })
export class ScoreService {
  getGradeColor(grade: string): string {
    const colors: Record<string, string> = {
      A: '#2ecc71',
      B: '#27ae60',
      // ...
    };
    return colors[grade] ?? '#gray';
  }
}

// Composant simple
@Component({...})
export class ScoreComponent {
  private scoreService = inject(ScoreService);
  readonly grade = input.required<string>();
  readonly color = computed(() => this.scoreService.getGradeColor(this.grade()));
}
```

### 4. Composants atomiques et réutilisables

```typescript
// Composant réutilisable
@Component({
  selector: 'app-score-badge',
  template: `
    <span
      class="px-2 py-1 rounded text-white font-bold"
      [style.background-color]="color()"
    >
      {{ grade() }}
    </span>
  `,
})
export class ScoreBadgeComponent {
  readonly grade = input.required<string>();
  readonly color = input.required<string>();
}
```

### 5. Lazy loading des routes

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/analyzer/analyzer.component')
      .then(m => m.AnalyzerComponent),
  },
  {
    path: 'results',
    loadComponent: () => import('./features/results/results.component')
      .then(m => m.ResultsComponent),
  },
];
```

### 6. Éviter les mutations directes

```typescript
// Bon
items.update(list => [...list, newItem]);

// Éviter
items().push(newItem); // Mutation directe, pas de détection
```

---

## Voir aussi

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture globale
- [API.md](API.md) - Documentation API Tauri
- [BACKEND.md](BACKEND.md) - Guide développement Rust
- [Angular.dev](https://angular.dev/) - Documentation officielle Angular
- [Tailwind CSS](https://tailwindcss.com/docs) - Documentation Tailwind
