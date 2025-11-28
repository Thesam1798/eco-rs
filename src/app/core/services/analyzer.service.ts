import { Injectable, signal, computed } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

import type {
  AnalysisState,
  AnalysisOptions,
  AnalysisResult,
  AnalysisError,
  EcoIndexResult,
  LighthouseResult,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class AnalyzerService {
  // State signals
  private readonly _state = signal<AnalysisState>('idle');
  private readonly _result = signal<AnalysisResult | null>(null);
  private readonly _error = signal<AnalysisError | null>(null);
  private readonly _currentUrl = signal<string>('');

  // Public readonly signals
  readonly state = this._state.asReadonly();
  readonly result = this._result.asReadonly();
  readonly error = this._error.asReadonly();
  readonly currentUrl = this._currentUrl.asReadonly();

  // Computed
  readonly isLoading = computed(() => this._state() === 'loading');
  readonly hasResult = computed(() => this._state() === 'success' && this._result() !== null);
  readonly hasError = computed(() => this._state() === 'error');

  /**
   * Lance une analyse EcoIndex rapide (~5s)
   */
  async analyzeQuick(url: string): Promise<void> {
    await this.runAnalysis(url, { mode: 'quick', includeHtml: false });
  }

  /**
   * Lance une analyse Lighthouse complète (~30s)
   */
  async analyzeFull(url: string, includeHtml = false): Promise<void> {
    await this.runAnalysis(url, { mode: 'full', includeHtml });
  }

  /**
   * Lance l'analyse selon les options
   */
  async runAnalysis(url: string, options: AnalysisOptions): Promise<void> {
    // Reset state
    this._state.set('loading');
    this._result.set(null);
    this._error.set(null);
    this._currentUrl.set(url);

    try {
      if (options.mode === 'quick') {
        const data = await invoke<EcoIndexResult>('analyze_ecoindex', { url });
        this._result.set({ mode: 'quick', data });
      } else {
        const data = await invoke<LighthouseResult>('analyze_lighthouse', {
          url,
          includeHtml: options.includeHtml,
        });
        this._result.set({ mode: 'full', data });
      }
      this._state.set('success');
    } catch (err) {
      this._error.set(this.parseError(err));
      this._state.set('error');
    }
  }

  /**
   * Reset l'état pour une nouvelle analyse
   */
  reset(): void {
    this._state.set('idle');
    this._result.set(null);
    this._error.set(null);
    this._currentUrl.set('');
  }

  /**
   * Parse une erreur Tauri en AnalysisError
   */
  private parseError(err: unknown): AnalysisError {
    if (typeof err === 'object' && err !== null) {
      const e = err as Record<string, unknown>;

      // Format erreur Rust sérialisée
      if ('type' in e && 'details' in e) {
        return {
          code: String(e['type']),
          message: String(e['details'] || 'Unknown error'),
        };
      }

      // Format erreur standard
      if ('message' in e) {
        return {
          code: 'UNKNOWN',
          message: String(e['message']),
        };
      }
    }

    return {
      code: 'UNKNOWN',
      message: String(err),
    };
  }
}
