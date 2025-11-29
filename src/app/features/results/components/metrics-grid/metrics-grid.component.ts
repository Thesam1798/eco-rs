import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
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

    <!-- Resource Breakdown -->
    @if (hasBreakdown()) {
      <div class="mt-4 bg-white rounded-lg p-4 border border-gray-200">
        <div class="text-sm font-medium text-gray-700 mb-3">Détail des requêtes</div>
        <div class="grid grid-cols-6 gap-2 text-center">
          <div class="p-2 rounded bg-yellow-50">
            <div class="text-lg font-bold text-yellow-700">{{ breakdown().scripts }}</div>
            <div class="text-xs text-yellow-600">JS</div>
          </div>
          <div class="p-2 rounded bg-blue-50">
            <div class="text-lg font-bold text-blue-700">{{ breakdown().stylesheets }}</div>
            <div class="text-xs text-blue-600">CSS</div>
          </div>
          <div class="p-2 rounded bg-green-50">
            <div class="text-lg font-bold text-green-700">{{ breakdown().images }}</div>
            <div class="text-xs text-green-600">Images</div>
          </div>
          <div class="p-2 rounded bg-purple-50">
            <div class="text-lg font-bold text-purple-700">{{ breakdown().fonts }}</div>
            <div class="text-xs text-purple-600">Fonts</div>
          </div>
          <div class="p-2 rounded bg-orange-50">
            <div class="text-lg font-bold text-orange-700">{{ breakdown().xhr }}</div>
            <div class="text-xs text-orange-600">XHR</div>
          </div>
          <div class="p-2 rounded bg-gray-50">
            <div class="text-lg font-bold text-gray-700">{{ breakdown().other }}</div>
            <div class="text-xs text-gray-600">Autres</div>
          </div>
        </div>
      </div>
    }
  `,
})
export class MetricsGridComponent {
  readonly metrics = input.required<PageMetrics>();

  readonly hasBreakdown = computed(() => !!this.metrics().resourceBreakdown);

  readonly breakdown = computed(
    () =>
      this.metrics().resourceBreakdown ?? {
        scripts: 0,
        stylesheets: 0,
        images: 0,
        fonts: 0,
        xhr: 0,
        other: 0,
      }
  );
}
