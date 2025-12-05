import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring.component';
import type { LighthouseResult } from '../../../../core/models';

interface ScoreItem {
  label: string;
  value: number;
}

@Component({
  selector: 'app-lighthouse-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ProgressRingComponent],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Scores Lighthouse</h3>

      <!-- 4 Scores Grid -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        @for (score of scores(); track score.label) {
          <div class="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
            <app-progress-ring [value]="score.value" [size]="70" [strokeWidth]="5">
              <span class="text-lg font-bold text-gray-800">{{ score.value }}</span>
            </app-progress-ring>
            <span class="mt-2 text-sm text-gray-600 text-center">{{ score.label }}</span>
          </div>
        }
      </div>

      <!-- Key Metrics -->
      <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
        <div class="p-4 bg-blue-50 rounded-lg">
          <div class="text-xl font-bold text-blue-800">{{ fcp() | number: '1.1-1' }}s</div>
          <div class="text-sm text-blue-600">First Contentful Paint</div>
          <div class="text-xs text-blue-500 mt-1">Temps avant le premier contenu visible</div>
        </div>
        <div class="p-4 bg-amber-50 rounded-lg">
          <div class="text-xl font-bold text-amber-800">{{ ttfb() | number: '1.0-0' }}ms</div>
          <div class="text-sm text-amber-600">Time To First Byte</div>
          <div class="text-xs text-amber-500 mt-1">Temps de réponse du serveur</div>
        </div>
      </div>
    </div>
  `,
})
export class LighthouseSectionComponent {
  readonly result = input.required<LighthouseResult>();

  readonly scores = computed<ScoreItem[]>(() => [
    { label: 'Performance', value: this.result().performance.performanceScore },
    { label: 'Accessibilité', value: this.result().accessibility.accessibilityScore },
    { label: 'Bonnes pratiques', value: this.result().bestPractices.bestPracticesScore },
    { label: 'SEO', value: this.result().seo.seoScore },
  ]);

  readonly fcp = computed(() => this.result().performance.firstContentfulPaint / 1000);
  readonly ttfb = computed(() => this.result().ttfb?.ttfb ?? 0);
}
