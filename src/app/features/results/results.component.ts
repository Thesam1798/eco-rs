import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { openPath } from '@tauri-apps/plugin-opener';
import { AnalyzerService } from '../../core/services';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { CoreMetricsComponent } from './components/core-metrics/core-metrics.component';
import { LighthouseSectionComponent } from './components/lighthouse-section/lighthouse-section.component';
import { NetworkSectionComponent } from './components/network-section/network-section.component';
import { CoverageSectionComponent } from './components/coverage-section/coverage-section.component';
import { ImagesSectionComponent } from './components/images-section/images-section.component';
import { EcoindexCardComponent } from './components/ecoindex-card/ecoindex-card.component';

@Component({
  selector: 'app-results',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    HeroSectionComponent,
    CoreMetricsComponent,
    LighthouseSectionComponent,
    NetworkSectionComponent,
    CoverageSectionComponent,
    ImagesSectionComponent,
    EcoindexCardComponent,
  ],
  template: `
    <div class="min-h-screen bg-gray-50 py-8 px-4">
      <div class="max-w-5xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <button
            type="button"
            (click)="onBack()"
            class="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <span>←</span>
            <span>Nouvelle analyse</span>
          </button>

          @if (analyzer.hasResult()) {
            @let result = analyzer.result()!;
            @if (result.mode === 'full' && result.data.htmlReportPath) {
              <button
                type="button"
                (click)="onOpenReport(result.data.htmlReportPath!)"
                class="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                Rapport Lighthouse
              </button>
            }
          }
        </div>

        @if (analyzer.hasResult()) {
          @let result = analyzer.result()!;

          <!-- Quick mode: use simplified EcoIndex card -->
          @if (result.mode === 'quick') {
            <app-ecoindex-card [result]="result" />
          }

          <!-- Full mode: hierarchical layout -->
          @if (result.mode === 'full') {
            @let data = result.data;

            <!-- 1. Hero Section: EcoIndex + Performance (above the fold) -->
            <app-hero-section [result]="data" />

            <!-- 2. Core Metrics: Weight, DOM, Requests -->
            <section class="mt-6">
              <app-core-metrics [result]="data" />
            </section>

            <!-- 3. Lighthouse Section: 4 scores + FCP + TTFB -->
            <section class="mt-6">
              <app-lighthouse-section [result]="data" />
            </section>

            <!-- 4. Network Section: Requests breakdown, compression, cache -->
            <section class="mt-8">
              <app-network-section [result]="data" />
            </section>

            <!-- 5. Coverage Section: Unused JS/CSS -->
            @if (data.coverage) {
              <section class="mt-8">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Couverture du code</h2>
                <app-coverage-section [coverage]="data.coverage" />
              </section>
            }

            <!-- 6. Images Section: Format opportunities -->
            @if (data.imageFormats && data.imageFormats.items.length > 0) {
              <section class="mt-8">
                <h2 class="text-xl font-semibold text-gray-800 mb-4">Optimisation des images</h2>
                <app-images-section [imageFormats]="data.imageFormats" />
              </section>
            }

            <!-- URL & Timestamp footer -->
            <div class="mt-8 p-4 bg-white rounded-xl shadow text-center">
              <p class="text-sm text-gray-500">
                URL :
                <a
                  [href]="data.url"
                  target="_blank"
                  class="text-green-600 hover:underline font-mono text-xs"
                >
                  {{ data.url }}
                </a>
              </p>
              <p class="text-xs text-gray-400 mt-1">
                {{ data.timestamp | date: 'dd/MM/yyyy HH:mm:ss' }}
              </p>
            </div>
          }
        } @else {
          <!-- No result -->
          <div class="text-center py-12">
            <p class="text-gray-600">Aucun résultat à afficher.</p>
            <button
              type="button"
              (click)="onBack()"
              class="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
      await openPath(reportPath);
    } catch (error) {
      console.error('Failed to open HTML report:', error);
    }
  }
}
