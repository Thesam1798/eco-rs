import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';
import type { PageMetrics } from '../../../../core/models';

@Component({
  selector: 'app-metrics-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormatBytesPipe],
  template: `
    <div class="grid grid-cols-3 gap-4">
      <!-- DOM Elements -->
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <div class="text-2xl font-bold text-gray-800">
          {{ metrics().domElements | number }}
        </div>
        <div class="text-sm text-gray-500 mt-1">Éléments DOM</div>
      </div>

      <!-- Requests -->
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <div class="text-2xl font-bold text-gray-800">
          {{ metrics().requests | number }}
        </div>
        <div class="text-sm text-gray-500 mt-1">Requêtes HTTP</div>
      </div>

      <!-- Size -->
      <div class="bg-white rounded-lg p-4 border border-gray-200">
        <div class="text-2xl font-bold text-gray-800">
          {{ metrics().sizeKb * 1024 | formatBytes }}
        </div>
        <div class="text-sm text-gray-500 mt-1">Taille transférée</div>
      </div>
    </div>
  `,
})
export class MetricsGridComponent {
  readonly metrics = input.required<PageMetrics>();
}
