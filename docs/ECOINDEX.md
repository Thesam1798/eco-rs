# Méthodologie EcoIndex

Ce document détaille l'implémentation de la méthodologie EcoIndex dans l'application, en alignement avec la référence officielle [cnumr/ecoindex_reference](https://github.com/cnumr/ecoindex_reference).

## Table des matières

- [Introduction](#introduction)
- [Métriques collectées](#métriques-collectées)
- [Protocole de mesure](#protocole-de-mesure)
- [Calcul du score](#calcul-du-score)
- [Tables de quantiles](#tables-de-quantiles)
- [Attribution des grades](#attribution-des-grades)
- [Impact environnemental](#impact-environnemental)
- [Comparaison avec EcoindexApp](#comparaison-avec-ecoindexapp)
- [Limitations](#limitations)
- [Références](#références)

## Introduction

EcoIndex est une méthodologie française développée par le collectif [GreenIT.fr](https://www.greenit.fr/) et maintenue par le [CNUMR](https://github.com/cnumr) (Collectif Conception Numérique Responsable).

L'objectif est de mesurer l'empreinte environnementale d'une page web à travers trois indicateurs techniques simples, puis de calculer :
- Un **score** de 0 à 100 (plus élevé = plus écologique)
- Un **grade** de A (meilleur) à G (pire)
- L'**impact environnemental** en émissions GES et consommation d'eau

## Métriques collectées

### 1. Nombre d'éléments DOM

Le comptage des éléments DOM représente la complexité de la page.

**Règles de comptage :**
- Compte tous les éléments HTML dans le document
- **Exclut** les enfants des éléments `<svg>` (un SVG complexe compte comme 1)
- **Inclut** les éléments dans le Shadow DOM
- **Inclut** les éléments dans les iframes same-origin (si accessible)

**Implémentation (JavaScript dans le sidecar) :**

```javascript
async function countDOMNodesWithoutSVG(page) {
  return page.evaluate(() => {
    function countInRoot(root) {
      let total = 0;
      let svgChildren = 0;

      const elements = root.querySelectorAll('*');
      total += elements.length;

      // Soustraire les enfants SVG
      const svgs = root.querySelectorAll('svg');
      for (const svg of svgs) {
        svgChildren += svg.querySelectorAll('*').length;
      }

      // Traverser le Shadow DOM
      for (const el of elements) {
        if (el.shadowRoot) {
          const shadowResult = countInRoot(el.shadowRoot);
          total += shadowResult.total;
          svgChildren += shadowResult.svgChildren;
        }
      }

      return { total, svgChildren };
    }

    const result = countInRoot(document);
    return result.total - result.svgChildren;
  });
}
```

### 2. Nombre de requêtes HTTP

Le nombre de ressources chargées par la page.

**Règles de comptage :**
- Compte toutes les requêtes HTTP/HTTPS
- **Exclut** les URLs `data:` et `blob:`
- Inclut toutes les ressources (documents, scripts, styles, images, polices, XHR, etc.)

### 3. Taille de transfert

La quantité de données transférées sur le réseau.

**Règles de mesure :**
- Utilise la **taille compressée** (bytes over wire)
- Mesure via l'API `total-byte-weight` de Lighthouse
- Convertie en kilooctets (KB) pour le calcul

## Protocole de mesure

L'application implémente le protocole de mesure de [EcoindexApp](https://github.com/cnumr/EcoindexApp) :

### 1. Configuration du navigateur

```
Viewport: 1920 × 1080 (desktop)
Headless: Oui (Chrome Headless Shell)
Cache: Désactivé (mesure à froid)
```

### 2. Séquence de navigation

```
1. [Navigation] Charger l'URL
2. [Attente]    3 secondes
3. [Scroll]     Défiler jusqu'en bas de page
4. [Attente]    3 secondes
5. [Mesure]     Collecter les métriques
```

**Implémentation du scroll (CDP) :**

```javascript
async function executeScrollPattern(page) {
  const session = await page.createCDPSession();

  // Attente initiale
  await new Promise(r => setTimeout(r, 3000));

  // Obtenir la hauteur de la page
  const dimensions = await page.evaluate(() => ({
    height: Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    ),
  }));

  // Scroll via CDP (comme EcoindexApp)
  await session.send('Input.synthesizeScrollGesture', {
    x: 100,
    y: 600,
    yDistance: -dimensions.height,
    speed: 1000,
  });

  // Attente finale
  await new Promise(r => setTimeout(r, 3000));

  await session.detach();
}
```

### 3. Utilisation de Lighthouse Flow API

L'application utilise l'API Flow de Lighthouse plutôt que l'API directe :

```javascript
const flow = await startFlow(page, { config: LIGHTHOUSE_CONFIG });
await flow.navigate(url, { stepName: 'EcoIndex Analysis' });
const flowResult = await flow.createFlowResult();
```

Cela garantit :
- Une mesure cohérente avec EcoindexApp
- Le reset du stockage entre les analyses
- Des métriques réseau précises

## Calcul du score

### Formule

Le score EcoIndex est calculé comme suit :

```
score = 100 - 5 × (3×Q_dom + 2×Q_req + Q_size) / 6
```

Où :
- `Q_dom` = position quantile du nombre d'éléments DOM (0-20)
- `Q_req` = position quantile du nombre de requêtes (0-20)
- `Q_size` = position quantile de la taille en KB (0-20)

### Poids des métriques

| Métrique | Poids | Impact |
|----------|-------|--------|
| DOM elements | 3 | Élevé (50%) |
| HTTP requests | 2 | Moyen (33%) |
| Transfer size | 1 | Faible (17%) |

Le DOM a le plus grand impact car il reflète la complexité côté client.

### Interpolation des quantiles

La position quantile est calculée par interpolation linéaire :

```rust
pub fn get_quantile_position(value: f64, quantiles: &[f64]) -> f64 {
    // Si valeur <= min, retourne 0
    if value <= quantiles[0] {
        return 0.0;
    }

    // Si valeur >= max, retourne 20
    if value >= quantiles[quantiles.len() - 1] {
        return (quantiles.len() - 1) as f64;
    }

    // Interpolation linéaire entre deux quantiles
    for i in 1..quantiles.len() {
        if value < quantiles[i] {
            let lower = quantiles[i - 1];
            let upper = quantiles[i];
            // Position = index_inférieur + fraction
            return (i - 1) as f64 + (value - lower) / (upper - lower);
        }
    }

    (quantiles.len() - 1) as f64
}
```

**Exemple :**

```
DOM elements = 500
Quantiles[9] = 537, Quantiles[10] = 603

Position = 9 + (500 - 537) / (603 - 537)
         = 9 + (-37) / 66
         = 9 - 0.56
         ≈ 8.44
```

### Implémentation Rust

```rust
pub fn compute_score(metrics: &PageMetrics) -> f64 {
    let q_dom = Self::get_quantile_position(
        f64::from(metrics.dom_elements),
        &DOM_QUANTILES
    );
    let q_req = Self::get_quantile_position(
        f64::from(metrics.requests),
        &REQUEST_QUANTILES
    );
    let q_size = Self::get_quantile_position(
        metrics.size_kb,
        &SIZE_QUANTILES
    );

    // Formule: 100 - 5 × (3×Q_dom + 2×Q_req + Q_size) / 6
    let weighted = 3.0 * q_dom + 2.0 * q_req + q_size;
    let score = 100.0 - (5.0 * weighted) / 6.0;

    score.clamp(0.0, 100.0)
}
```

## Tables de quantiles

Les tables de quantiles proviennent de l'analyse de 500,000 URLs du HTTP Archive.

### DOM Elements

```rust
pub const DOM_QUANTILES: [f64; 21] = [
    0.0,      // 0%
    47.0,     // 5%
    75.0,     // 10%
    159.0,    // 15%
    233.0,    // 20%
    298.0,    // 25%
    358.0,    // 30%
    417.0,    // 35%
    476.0,    // 40%
    537.0,    // 45%
    603.0,    // 50%
    674.0,    // 55%
    753.0,    // 60%
    843.0,    // 65%
    949.0,    // 70%
    1076.0,   // 75%
    1237.0,   // 80%
    1459.0,   // 85%
    1801.0,   // 90%
    2479.0,   // 95%
    594601.0, // 100%
];
```

### HTTP Requests

```rust
pub const REQUEST_QUANTILES: [f64; 21] = [
    0.0,    // 0%
    2.0,    // 5%
    15.0,   // 10%
    25.0,   // 15%
    34.0,   // 20%
    42.0,   // 25%
    49.0,   // 30%
    56.0,   // 35%
    63.0,   // 40%
    70.0,   // 45%
    78.0,   // 50%
    86.0,   // 55%
    95.0,   // 60%
    105.0,  // 65%
    117.0,  // 70%
    130.0,  // 75%
    147.0,  // 80%
    170.0,  // 85%
    205.0,  // 90%
    281.0,  // 95%
    3920.0, // 100%
];
```

### Transfer Size (KB)

```rust
pub const SIZE_QUANTILES: [f64; 21] = [
    0.0,       // 0%
    1.37,      // 5%
    144.7,     // 10%
    319.53,    // 15%
    479.46,    // 20%
    631.97,    // 25%
    783.38,    // 30%
    937.91,    // 35%
    1098.62,   // 40%
    1265.47,   // 45%
    1448.32,   // 50%
    1648.27,   // 55%
    1876.08,   // 60%
    2142.06,   // 65%
    2465.37,   // 70%
    2866.31,   // 75%
    3401.59,   // 80%
    4155.73,   // 85%
    5400.08,   // 90%
    8037.54,   // 95%
    223212.26, // 100%
];
```

## Attribution des grades

Le grade est déterminé par le score :

| Grade | Score minimum | Description |
|-------|---------------|-------------|
| A | 81 | Excellent |
| B | 71 | Très bon |
| C | 61 | Bon |
| D | 51 | Moyen |
| E | 41 | Insuffisant |
| F | 31 | Mauvais |
| G | 0 | Très mauvais |

**Implémentation :**

```rust
pub const GRADE_THRESHOLDS: [(f64, char); 7] = [
    (81.0, 'A'),
    (71.0, 'B'),
    (61.0, 'C'),
    (51.0, 'D'),
    (41.0, 'E'),
    (31.0, 'F'),
    (0.0, 'G'),
];

pub fn get_grade(score: f64) -> char {
    for (threshold, grade) in GRADE_THRESHOLDS {
        if score >= threshold {
            return grade;
        }
    }
    'G'
}
```

## Impact environnemental

### Émissions de gaz à effet de serre (GES)

Exprimées en grammes de CO2 équivalent (gCO2e) par page vue :

```
GES = 2 + 2 × (100 - score) / 100
```

| Score | GES (gCO2e) |
|-------|-------------|
| 100 | 2.0 |
| 75 | 2.5 |
| 50 | 3.0 |
| 25 | 3.5 |
| 0 | 4.0 |

### Consommation d'eau

Exprimée en centilitres (cl) par page vue :

```
Eau = 3 + 3 × (100 - score) / 100
```

| Score | Eau (cl) |
|-------|----------|
| 100 | 3.0 |
| 75 | 3.75 |
| 50 | 4.5 |
| 25 | 5.25 |
| 0 | 6.0 |

### Implémentation

```rust
pub fn compute_ghg(score: f64) -> f64 {
    2.0 + 2.0 * (100.0 - score) / 100.0
}

pub fn compute_water(score: f64) -> f64 {
    3.0 + 3.0 * (100.0 - score) / 100.0
}
```

## Comparaison avec EcoindexApp

Cette application vise une compatibilité maximale avec [EcoindexApp](https://github.com/cnumr/EcoindexApp) :

| Élément | EcoIndex Analyzer | EcoindexApp |
|---------|-------------------|-------------|
| Lighthouse Flow API | Oui | Oui |
| Warm Navigation | Oui | Oui |
| Viewport | 1920×1080 | 1920×1080 |
| Scroll Pattern | wait→scroll→wait | wait→scroll→wait |
| DOM counting | Exclut SVG children | Exclut SVG children |
| Transfer size | Compressé | Compressé |
| Quantiles | Officiels CNUMR | Officiels CNUMR |
| Formule | Identique | Identique |

### Différences mineures

1. **Runtime** : Rust + Node.js sidecar vs Python
2. **Chrome** : Chrome Headless Shell bundlé vs Chrome local
3. **Timing** : Peut varier selon la machine

## Limitations

### Limitations techniques

1. **Réseau** : Les mesures dépendent de la connexion réseau
2. **Variabilité** : Les résultats peuvent varier entre les exécutions
3. **Contenu dynamique** : Le contenu chargé après le scroll n'est pas comptabilisé
4. **Third-party** : Les scripts tiers affectent les mesures

### Limitations méthodologiques

1. **Proxy de l'impact** : Les métriques techniques sont un proxy de l'impact réel
2. **Facteurs non mesurés** :
   - Efficacité du code JavaScript
   - Optimisation des images
   - Durée de vie du cache
   - Infrastructure serveur

### Recommandations

Pour des résultats cohérents :
- Effectuer plusieurs mesures
- Comparer sur la même machine
- Éviter les heures de pointe réseau
- Désactiver les extensions de navigateur

## Références

### Documentation officielle

- [EcoIndex.fr](https://www.ecoindex.fr/) - Site officiel
- [Méthodologie EcoIndex](https://www.ecoindex.fr/comment-ca-marche/) - Explication de la méthode
- [cnumr/ecoindex_reference](https://github.com/cnumr/ecoindex_reference) - Référence officielle

### Applications de référence

- [EcoindexApp](https://github.com/cnumr/EcoindexApp) - Application desktop Python
- [ecoindex-cli](https://github.com/cnumr/ecoindex-cli) - CLI Python

### Publications

- [115 bonnes pratiques d'écoconception web](https://github.com/cnumr/best-practices) - Guide CNUMR
- [Référentiel général d'écoconception](https://ecoresponsable.numerique.gouv.fr/publications/referentiel-general-ecoconception/) - DINUM

---

## Voir aussi

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture de l'application
- [API.md](API.md) - Documentation API
- [BACKEND.md](BACKEND.md) - Implémentation Rust du calculateur
