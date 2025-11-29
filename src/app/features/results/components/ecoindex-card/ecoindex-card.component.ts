import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { AnalysisResult, PageMetrics } from '../../../../core/models';
import { EcoindexGaugeComponent } from '../ecoindex-gauge/ecoindex-gauge.component';
import { MetricsGridComponent } from '../metrics-grid/metrics-grid.component';
import { EnvironmentalImpactComponent } from '../environmental-impact/environmental-impact.component';

@Component({
  selector: 'app-ecoindex-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, EcoindexGaugeComponent, MetricsGridComponent, EnvironmentalImpactComponent],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-8">
      <h2 class="text-xl font-semibold text-gray-800 mb-6">EcoIndex</h2>

      <div class="flex flex-col lg:flex-row gap-8">
        <!-- Gauge -->
        <div class="flex-shrink-0">
          <app-ecoindex-gauge [score]="score()" [grade]="grade()" />
        </div>

        <!-- Details -->
        <div class="flex-1 space-y-6">
          <!-- Metrics -->
          <app-metrics-grid [metrics]="metrics()" />

          <!-- Environmental Impact -->
          <app-environmental-impact [ghg]="ghg()" [water]="water()" />
        </div>
      </div>

      <!-- URL -->
      <div class="mt-6 pt-6 border-t border-gray-100">
        <p class="text-sm text-gray-500">
          URL analysée :
          <a
            [href]="url()"
            target="_blank"
            class="text-grade-a hover:underline font-mono text-xs ml-2"
          >
            {{ url() }}
          </a>
        </p>
        <p class="text-xs text-gray-400 mt-1">
          {{ timestamp() | date: 'dd/MM/yyyy HH:mm:ss' }}
        </p>
      </div>
    </div>
  `,
})
export class EcoindexCardComponent {
  readonly result = input.required<AnalysisResult>();

  readonly score = computed(() => {
    const r = this.result();
    return r.mode === 'quick' ? r.data.score : r.data.ecoindex.score;
  });

  readonly grade = computed(() => {
    const r = this.result();
    return r.mode === 'quick' ? r.data.grade : r.data.ecoindex.grade;
  });

  readonly ghg = computed(() => {
    const r = this.result();
    return r.mode === 'quick' ? r.data.ghg : r.data.ecoindex.ghg;
  });

  readonly water = computed(() => {
    const r = this.result();
    return r.mode === 'quick' ? r.data.water : r.data.ecoindex.water;
  });

  readonly metrics = computed((): PageMetrics => {
    const r = this.result();
    if (r.mode === 'quick') {
      return r.data.metrics;
    }
    return {
      domElements: r.data.ecoindex.domElements,
      requests: r.data.ecoindex.requests,
      sizeKb: r.data.ecoindex.sizeKb,
      resourceBreakdown: r.data.ecoindex.resourceBreakdown,
    };
  });

  readonly url = computed(() => this.result().data.url);
  readonly timestamp = computed(() => this.result().data.timestamp);
}
