import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';
import type { LighthouseResult } from '../../../../core/models';

@Component({
  selector: 'app-core-metrics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormatBytesPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Métriques fondamentales</h3>
      <div class="grid grid-cols-3 gap-4">
        <!-- Page Weight -->
        <div class="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
          <div class="text-3xl font-bold text-purple-800">
            {{ sizeBytes() | formatBytes: 1 }}
          </div>
          <div class="text-sm text-purple-600 mt-1">Poids de la page</div>
        </div>

        <!-- DOM Size -->
        <div class="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
          <div class="text-3xl font-bold text-blue-800">
            {{ domElements() | number }}
          </div>
          <div class="text-sm text-blue-600 mt-1">Éléments DOM</div>
        </div>

        <!-- Requests -->
        <div class="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
          <div class="text-3xl font-bold text-amber-800">
            {{ requests() | number }}
          </div>
          <div class="text-sm text-amber-600 mt-1">Requêtes HTTP</div>
        </div>
      </div>
    </div>
  `,
})
export class CoreMetricsComponent {
  readonly result = input.required<LighthouseResult>();

  readonly sizeBytes = computed(() => this.result().ecoindex.sizeKb * 1024);
  readonly domElements = computed(() => this.result().ecoindex.domElements);
  readonly requests = computed(() => this.result().ecoindex.requests);
}
