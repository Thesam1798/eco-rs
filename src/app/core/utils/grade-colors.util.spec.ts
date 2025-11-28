import { describe, it, expect } from 'vitest';
import {
  getColorForScore,
  getGradeTextClass,
  getGradeBgClass,
  GRADE_HEX_COLORS,
  GRADE_COLORS,
  GRADE_BG_COLORS,
} from './grade-colors.util';

describe('grade-colors.util', () => {
  describe('getColorForScore', () => {
    it('should return grade A color for score >= 81', () => {
      expect(getColorForScore(81)).toBe(GRADE_HEX_COLORS.A);
      expect(getColorForScore(100)).toBe(GRADE_HEX_COLORS.A);
    });

    it('should return grade B color for score 71-80', () => {
      expect(getColorForScore(71)).toBe(GRADE_HEX_COLORS.B);
      expect(getColorForScore(80)).toBe(GRADE_HEX_COLORS.B);
    });

    it('should return grade C color for score 61-70', () => {
      expect(getColorForScore(61)).toBe(GRADE_HEX_COLORS.C);
      expect(getColorForScore(70)).toBe(GRADE_HEX_COLORS.C);
    });

    it('should return grade D color for score 51-60', () => {
      expect(getColorForScore(51)).toBe(GRADE_HEX_COLORS.D);
      expect(getColorForScore(60)).toBe(GRADE_HEX_COLORS.D);
    });

    it('should return grade E color for score 41-50', () => {
      expect(getColorForScore(41)).toBe(GRADE_HEX_COLORS.E);
      expect(getColorForScore(50)).toBe(GRADE_HEX_COLORS.E);
    });

    it('should return grade F color for score 31-40', () => {
      expect(getColorForScore(31)).toBe(GRADE_HEX_COLORS.F);
      expect(getColorForScore(40)).toBe(GRADE_HEX_COLORS.F);
    });

    it('should return grade G color for score < 31', () => {
      expect(getColorForScore(30)).toBe(GRADE_HEX_COLORS.G);
      expect(getColorForScore(0)).toBe(GRADE_HEX_COLORS.G);
    });
  });

  describe('getGradeTextClass', () => {
    it('should return correct Tailwind text class for each grade', () => {
      expect(getGradeTextClass('A')).toBe(GRADE_COLORS.A);
      expect(getGradeTextClass('B')).toBe(GRADE_COLORS.B);
      expect(getGradeTextClass('G')).toBe(GRADE_COLORS.G);
    });
  });

  describe('getGradeBgClass', () => {
    it('should return correct Tailwind bg class for each grade', () => {
      expect(getGradeBgClass('A')).toBe(GRADE_BG_COLORS.A);
      expect(getGradeBgClass('B')).toBe(GRADE_BG_COLORS.B);
      expect(getGradeBgClass('G')).toBe(GRADE_BG_COLORS.G);
    });
  });
});
