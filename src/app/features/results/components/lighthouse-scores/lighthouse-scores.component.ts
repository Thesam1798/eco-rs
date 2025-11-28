import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring.component';
import type { LighthouseResult } from '../../../../core/models';

@Component({
  selector: 'app-lighthouse-scores',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProgressRingComponent],
  template: `
    <div class="grid grid-cols-4 gap-4">
      <!-- Performance -->
      <div class="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
        <app-progress-ring
          [value]="result().performance.performanceScore"
          [size]="80"
          [strokeWidth]="6"
        >
          <span class="text-lg font-bold">{{ result().performance.performanceScore }}</span>
        </app-progress-ring>
        <span class="mt-2 text-sm text-gray-600">Performance</span>
      </div>

      <!-- Accessibility -->
      <div class="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
        <app-progress-ring
          [value]="result().accessibility.accessibilityScore"
          [size]="80"
          [strokeWidth]="6"
        >
          <span class="text-lg font-bold">{{ result().accessibility.accessibilityScore }}</span>
        </app-progress-ring>
        <span class="mt-2 text-sm text-gray-600">Accessibilité</span>
      </div>

      <!-- Best Practices -->
      <div class="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
        <app-progress-ring
          [value]="result().bestPractices.bestPracticesScore"
          [size]="80"
          [strokeWidth]="6"
        >
          <span class="text-lg font-bold">{{ result().bestPractices.bestPracticesScore }}</span>
        </app-progress-ring>
        <span class="mt-2 text-sm text-gray-600">Bonnes pratiques</span>
      </div>

      <!-- SEO -->
      <div class="flex flex-col items-center p-4 bg-white rounded-lg border border-gray-200">
        <app-progress-ring [value]="result().seo.seoScore" [size]="80" [strokeWidth]="6">
          <span class="text-lg font-bold">{{ result().seo.seoScore }}</span>
        </app-progress-ring>
        <span class="mt-2 text-sm text-gray-600">SEO</span>
      </div>
    </div>
  `,
})
export class LighthouseScoresComponent {
  readonly result = input.required<LighthouseResult>();
}
