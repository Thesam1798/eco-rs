import { Injectable, signal, computed } from '@angular/core';
import type { HistoryEntry, AnalysisResult } from '../models';

const STORAGE_KEY = 'ecoindex-history';
const MAX_ENTRIES = 50;

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  private readonly _entries = signal<HistoryEntry[]>([]);

  readonly entries = this._entries.asReadonly();
  readonly hasEntries = computed(() => this._entries().length > 0);
  readonly recentEntries = computed(() => this._entries().slice(0, 10));

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Ajoute une entrée à l'historique
   */
  addEntry(result: AnalysisResult): void {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      url: result.data.url,
      timestamp: result.data.timestamp,
      mode: result.mode,
      score: result.mode === 'quick' ? result.data.score : result.data.ecoindex.score,
      grade: result.mode === 'quick' ? result.data.grade : result.data.ecoindex.grade,
    };

    const updated = [entry, ...this._entries()].slice(0, MAX_ENTRIES);
    this._entries.set(updated);
    this.saveToStorage();
  }

  /**
   * Supprime une entrée
   */
  removeEntry(id: string): void {
    const updated = this._entries().filter((e) => e.id !== id);
    this._entries.set(updated);
    this.saveToStorage();
  }

  /**
   * Vide l'historique
   */
  clearHistory(): void {
    this._entries.set([]);
    this.saveToStorage();
  }

  /**
   * Charge depuis localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const entries = JSON.parse(stored) as HistoryEntry[];
        this._entries.set(entries);
      }
    } catch {
      console.warn('Failed to load history from storage');
    }
  }

  /**
   * Sauvegarde dans localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries()));
    } catch {
      console.warn('Failed to save history to storage');
    }
  }
}
