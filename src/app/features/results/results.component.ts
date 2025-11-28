import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyzerService } from '../../core/services';
import { EcoindexCardComponent } from './components/ecoindex-card/ecoindex-card.component';
import { LighthouseScoresComponent } from './components/lighthouse-scores/lighthouse-scores.component';

@Component({
  selector: 'app-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EcoindexCardComponent, LighthouseScoresComponent],
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

            <!-- Download HTML Report -->
            @if (result.data.rawLighthouseReport) {
              <div class="mt-6">
                <button
                  type="button"
                  (click)="onDownloadReport(result.data.rawLighthouseReport!)"
                  class="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Télécharger le rapport HTML
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

  onDownloadReport(html: string): void {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lighthouse-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
