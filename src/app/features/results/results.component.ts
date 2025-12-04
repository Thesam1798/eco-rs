import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { openPath } from '@tauri-apps/plugin-opener';
import { AnalyzerService } from '../../core/services';
import { EcoindexCardComponent } from './components/ecoindex-card/ecoindex-card.component';
import { LighthouseScoresComponent } from './components/lighthouse-scores/lighthouse-scores.component';
import { DomainStatsComponent } from './components/domain-stats/domain-stats.component';
import { CacheAnalysisComponent } from './components/cache-analysis/cache-analysis.component';
import { ProtocolStatsComponent } from './components/protocol-stats/protocol-stats.component';
import { DuplicatesComponent } from './components/duplicates/duplicates.component';
import { CacheIssuesComponent } from './components/cache-issues/cache-issues.component';
import {
  ResultsTabsComponent,
  type ResultsTab,
} from './components/results-tabs/results-tabs.component';

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
    CacheIssuesComponent,
    ResultsTabsComponent,
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

          <!-- EcoIndex Card (always visible) -->
          <app-ecoindex-card [result]="result" />

          <!-- Full mode: Tab navigation -->
          @if (result.mode === 'full') {
            <div class="mt-8">
              <app-results-tabs
                [activeTab]="activeTab()"
                [requestCount]="result.data.analytics?.domainStats?.totalRequests ?? result.data.requests?.length ?? 0"
                [cacheIssueCount]="result.data.analytics?.cacheStats?.problematicCount ?? 0"
                (tabChange)="onTabChange($event)"
              />

              <!-- Tab Content -->
              <div class="mt-6">
                @switch (activeTab()) {
                  @case ('overview') {
                    <app-lighthouse-scores [result]="result.data" />
                  }
                  @case ('requests') {
                    @if (result.data.analytics) {
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <app-domain-stats [analytics]="result.data.analytics.domainStats" />
                        <app-protocol-stats [analytics]="result.data.analytics.protocolStats" />
                      </div>
                      <div class="mt-6">
                        <app-duplicates [analytics]="result.data.analytics.duplicateStats" />
                      </div>
                    } @else if (result.data.requests && result.data.requests.length > 0) {
                      <!-- Fallback: use raw requests if analytics not available -->
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <app-domain-stats [requests]="result.data.requests" />
                        <app-protocol-stats [requests]="result.data.requests" />
                      </div>
                      <div class="mt-6">
                        <app-duplicates [requests]="result.data.requests" />
                      </div>
                    } @else {
                      <div class="text-center py-12 text-gray-500">
                        Aucune donnee de requetes disponible.
                      </div>
                    }
                  }
                  @case ('cache') {
                    @if (result.data.analytics) {
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <app-cache-analysis [analytics]="result.data.analytics.cacheStats" />
                        <app-cache-issues [analytics]="result.data.analytics.cacheStats" />
                      </div>
                    } @else if (result.data.requests && result.data.requests.length > 0) {
                      <!-- Fallback: use raw requests if analytics not available -->
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <app-cache-analysis [requests]="result.data.requests" />
                        <app-cache-issues [requests]="result.data.requests" />
                      </div>
                    } @else {
                      <div class="text-center py-12 text-gray-500">
                        Aucune donnee de cache disponible.
                      </div>
                    }
                  }
                  @case ('performance') {
                    <app-lighthouse-scores [result]="result.data" />
                  }
                }
              </div>
            </div>
          }
        } @else {
          <!-- No result -->
          <div class="text-center py-12">
            <p class="text-gray-600">Aucun resultat a afficher.</p>
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

  readonly activeTab = signal<ResultsTab>('overview');

  onBack(): void {
    this.analyzer.reset();
    this.router.navigate(['/']);
  }

  onTabChange(tab: ResultsTab): void {
    this.activeTab.set(tab);
  }

  async onOpenReport(reportPath: string): Promise<void> {
    try {
      await openPath(reportPath);
    } catch (error) {
      console.error('Failed to open HTML report:', error);
    }
  }
}
