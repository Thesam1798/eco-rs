import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyzerService, HistoryService } from '../../core/services';
import type { AnalysisMode } from '../../core/models';
import { UrlInputComponent } from './components/url-input/url-input.component';
import { AnalysisOptionsComponent } from './components/analysis-options/analysis-options.component';
import { LoadingIndicatorComponent } from './components/loading-indicator/loading-indicator.component';

@Component({
  selector: 'app-analyzer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UrlInputComponent, AnalysisOptionsComponent, LoadingIndicatorComponent],
  template: `
    <div class="min-h-screen bg-gray-50 py-12 px-4">
      <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-10">
          <h1 class="text-3xl font-bold text-gray-900">EcoIndex Analyzer</h1>
          <p class="mt-2 text-gray-600">Mesurez l'empreinte environnementale de vos pages web</p>
        </div>

        @if (analyzer.isLoading()) {
          <!-- Loading -->
          <app-loading-indicator [mode]="mode()" [url]="analyzer.currentUrl()" />
        } @else {
          <!-- Form -->
          <div class="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <app-url-input (urlSubmit)="onAnalyze($event)" />
            <app-analysis-options [(mode)]="mode" [(includeHtml)]="includeHtml" />
          </div>

          <!-- Error -->
          @if (analyzer.hasError()) {
            <div class="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p class="text-red-800 font-medium">{{ analyzer.error()?.message }}</p>
              @if (analyzer.error()?.details) {
                <p class="mt-2 text-sm text-red-600">{{ analyzer.error()?.details }}</p>
              }
            </div>
          }

          <!-- Recent history -->
          @if (history.hasEntries()) {
            <div class="mt-8">
              <h3 class="text-sm font-medium text-gray-700 mb-3">Analyses récentes</h3>
              <div class="space-y-2">
                @for (entry of history.recentEntries(); track entry.id) {
                  <button
                    type="button"
                    (click)="onSelectHistory(entry.url)"
                    class="w-full text-left px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-grade-a transition-colors"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-mono text-gray-600 truncate">{{ entry.url }}</span>
                      <span
                        class="text-xs font-bold px-2 py-0.5 rounded text-white"
                        [class]="'bg-grade-' + entry.grade.toLowerCase()"
                      >
                        {{ entry.grade }}
                      </span>
                    </div>
                  </button>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class AnalyzerComponent {
  readonly analyzer = inject(AnalyzerService);
  readonly history = inject(HistoryService);
  private readonly router = inject(Router);

  readonly mode = signal<AnalysisMode>('quick');
  readonly includeHtml = signal(false);

  async onAnalyze(url: string): Promise<void> {
    const currentMode = this.mode();

    if (currentMode === 'quick') {
      await this.analyzer.analyzeQuick(url);
    } else {
      await this.analyzer.analyzeFull(url, this.includeHtml());
    }

    if (this.analyzer.hasResult()) {
      const result = this.analyzer.result();
      if (result) {
        this.history.addEntry(result);
      }
      await this.router.navigate(['/results']);
    }
  }

  onSelectHistory(url: string): void {
    this.onAnalyze(url);
  }
}
