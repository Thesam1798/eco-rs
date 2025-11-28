import type { EcoIndexGrade } from '../models';

/**
 * Couleurs Tailwind pour chaque grade
 * Correspond aux variables définies dans tailwind.css
 */
export const GRADE_COLORS: Record<EcoIndexGrade, string> = {
  A: 'text-grade-a',
  B: 'text-grade-b',
  C: 'text-grade-c',
  D: 'text-grade-d',
  E: 'text-grade-e',
  F: 'text-grade-f',
  G: 'text-grade-g',
};

export const GRADE_BG_COLORS: Record<EcoIndexGrade, string> = {
  A: 'bg-grade-a',
  B: 'bg-grade-b',
  C: 'bg-grade-c',
  D: 'bg-grade-d',
  E: 'bg-grade-e',
  F: 'bg-grade-f',
  G: 'bg-grade-g',
};

export const GRADE_BORDER_COLORS: Record<EcoIndexGrade, string> = {
  A: 'border-grade-a',
  B: 'border-grade-b',
  C: 'border-grade-c',
  D: 'border-grade-d',
  E: 'border-grade-e',
  F: 'border-grade-f',
  G: 'border-grade-g',
};

/**
 * Couleurs HEX pour SVG/Canvas
 */
export const GRADE_HEX_COLORS: Record<EcoIndexGrade, string> = {
  A: '#349a47',
  B: '#51b84b',
  C: '#cadb2a',
  D: '#f6eb15',
  E: '#fecd06',
  F: '#f99839',
  G: '#ed2124',
};

/**
 * Retourne la couleur HEX pour un score donné
 */
export function getColorForScore(score: number): string {
  if (score >= 81) return GRADE_HEX_COLORS.A;
  if (score >= 71) return GRADE_HEX_COLORS.B;
  if (score >= 61) return GRADE_HEX_COLORS.C;
  if (score >= 51) return GRADE_HEX_COLORS.D;
  if (score >= 41) return GRADE_HEX_COLORS.E;
  if (score >= 31) return GRADE_HEX_COLORS.F;
  return GRADE_HEX_COLORS.G;
}

/**
 * Retourne la classe Tailwind text pour un grade
 */
export function getGradeTextClass(grade: EcoIndexGrade): string {
  return GRADE_COLORS[grade];
}

/**
 * Retourne la classe Tailwind bg pour un grade
 */
export function getGradeBgClass(grade: EcoIndexGrade): string {
  return GRADE_BG_COLORS[grade];
}
