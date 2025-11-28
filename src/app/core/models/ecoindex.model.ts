/**
 * Grades EcoIndex (A = meilleur, G = pire)
 */
export type EcoIndexGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

/**
 * Métriques brutes collectées
 */
export interface PageMetrics {
  domElements: number;
  requests: number;
  sizeKb: number;
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
