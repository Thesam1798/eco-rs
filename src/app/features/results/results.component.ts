import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { openPath } from '@tauri-apps/plugin-opener';
import { AnalyzerService } from '../../core/services';
import { EcoindexCardComponent } from './components/ecoindex-card/ecoindex-card.component';
import { LighthouseScoresComponent } from './components/lighthouse-scores/lighthouse-scores.component';
import { DomainStatsComponent } from './components/domain-stats/domain-stats.component';
import { CacheAnalysisComponent } from './components/cache-analysis/cache-analysis.component';
import { ProtocolStatsComponent } from './components/protocol-stats/protocol-stats.component';
import { DuplicatesComponent } from './components/duplicates/duplicates.component';

@Component({
  selector: 'app-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EcoindexCardComponent,
    LighthouseScoresComponent,
    DomainStatsComponent,
    CacheAnalysisComponent,
    ProtocolStatsComponent,
    DuplicatesComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 py-12 px-4">
      <div class="max-w-4xl mx-auto">
        <!-- Back button -->
        <button
          type="button"
          (click)="onBack()"
          class="mb-6 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <span>←</span>
          <span>Nouvelle analyse</span>
        </button>

        @if (analyzer.hasResult()) {
          @let result = analyzer.result()!;

          <!-- EcoIndex Card -->
          <app-ecoindex-card [result]="result" />

          <!-- Lighthouse Scores (full mode only) -->
          @if (result.mode === 'full') {
            <div class="mt-8">
              <h2 class="text-xl font-semibold text-gray-800 mb-4">Scores Lighthouse</h2>
              <app-lighthouse-scores [result]="result.data" />
            </div>

            <!-- Request Analysis Section -->
            @if (result.data.requests && result.data.requests.length > 0) {
              <div class="mt-8">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Analyse des requetes HTTP</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <app-domain-stats [requests]="result.data.requests" />
                  <app-protocol-stats [requests]="result.data.requests" />
                </div>
                <div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <app-cache-analysis [requests]="result.data.requests" />
                  <app-duplicates [requests]="result.data.requests" />
                </div>
              </div>
            }

            <!-- Open HTML Report -->
            @if (result.data.htmlReportPath) {
              <div class="mt-6">
                <button
                  type="button"
                  (click)="onOpenReport(result.data.htmlReportPath!)"
                  class="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Ouvrir le rapport Lighthouse
                </button>
              </div>
            }
          }
        } @else {
          <!-- No result -->
          <div class="text-center py-12">
            <p class="text-gray-600">Aucun résultat à afficher.</p>
            <button
              type="button"
              (click)="onBack()"
              class="mt-4 px-6 py-2 bg-grade-a text-white rounded-lg hover:bg-green-700"
            >
              Lancer une analyse
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class ResultsComponent {
  readonly analyzer = inject(AnalyzerService);
  private readonly router = inject(Router);

  onBack(): void {
    this.analyzer.reset();
    this.router.navigate(['/']);
  }

  async onOpenReport(reportPath: string): Promise<void> {
    try {
      // Open the HTML report in the default browser
      await openPath(reportPath);
    } catch (error) {
      console.error('Failed to open HTML report:', error);
    }
  }
}
