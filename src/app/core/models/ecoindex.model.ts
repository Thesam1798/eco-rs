/**
 * Grades EcoIndex (A = meilleur, G = pire)
 */
export type EcoIndexGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

/**
 * Breakdown des ressources par type
 */
export interface ResourceBreakdown {
  scripts: number;
  stylesheets: number;
  images: number;
  fonts: number;
  xhr: number;
  other: number;
}

/**
 * Métriques brutes collectées
 */
export interface PageMetrics {
  domElements: number;
  requests: number;
  sizeKb: number;
  resourceBreakdown?: ResourceBreakdown;
}

/**
 * Résultat EcoIndex complet
 */
export interface EcoIndexResult {
  url: string;
  timestamp: string;
  score: number;
  grade: EcoIndexGrade;
  ghg: number;
  water: number;
  metrics: PageMetrics;
}
