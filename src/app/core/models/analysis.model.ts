import type { EcoIndexResult } from './ecoindex.model';
import type { LighthouseResult } from './lighthouse.model';

/**
 * Mode d'analyse
 */
export type AnalysisMode = 'quick' | 'full';

/**
 * État de l'analyse
 */
export type AnalysisState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Options d'analyse
 */
export interface AnalysisOptions {
  mode: AnalysisMode;
  includeHtml: boolean;
}

/**
 * Résultat unifié (quick ou full)
 */
export type AnalysisResult =
  | { mode: 'quick'; data: EcoIndexResult }
  | { mode: 'full'; data: LighthouseResult };

/**
 * Erreur d'analyse
 */
export interface AnalysisError {
  code: string;
  message: string;
  details?: string;
}

/**
 * Entrée historique
 */
export interface HistoryEntry {
  id: string;
  url: string;
  timestamp: string;
  mode: AnalysisMode;
  score: number;
  grade: string;
}
