import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { CacheItem } from '../../../../core/models';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';

@Component({
  selector: 'app-cache-analysis',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatBytesPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Analyse du cache</h3>

      @if (cacheItems().length === 0) {
        <p class="text-gray-500 text-sm">Toutes les ressources ont une bonne politique de cache</p>
      } @else {
        <div class="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p class="text-sm text-amber-800">
            <span class="font-semibold">{{ cacheItems().length }}</span> ressource(s) avec un TTL
            cache court ou absent
          </p>
          <p class="text-xs text-amber-600 mt-1">
            Perte potentielle : {{ totalWastedBytes() | formatBytes }}
          </p>
        </div>

        <div class="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="border-b border-gray-200">
                <th class="text-left py-2 px-3 font-medium text-gray-600">Ressource</th>
                <th class="text-right py-2 px-3 font-medium text-gray-600">TTL</th>
                <th class="text-right py-2 px-3 font-medium text-gray-600">Taille</th>
              </tr>
            </thead>
            <tbody>
              @for (item of cacheItems(); track item.url) {
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-2 px-3">
                    <div class="flex items-center gap-2">
                      <span [class]="getCacheBadgeClass(item.cacheLifetimeMs)">
                        {{ getCacheBadgeText(item.cacheLifetimeMs) }}
                      </span>
                      <span
                        class="font-mono text-xs text-gray-700 truncate max-w-[180px]"
                        [title]="item.url"
                      >
                        {{ getFilename(item.url) }}
                      </span>
                    </div>
                  </td>
                  <td class="py-2 px-3 text-right text-gray-600 font-mono text-xs">
                    {{ formatCacheTtl(item.cacheLifetimeMs) }}
                  </td>
                  <td class="py-2 px-3 text-right text-gray-600">
                    {{ item.totalBytes | formatBytes }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class CacheAnalysisComponent {
  readonly cacheAnalysis = input.required<CacheItem[]>();

  readonly cacheItems = computed(() =>
    this.cacheAnalysis()
      .filter((item) => item.cacheLifetimeMs < 604800000) // Less than 7 days
      .sort((a, b) => a.cacheLifetimeMs - b.cacheLifetimeMs)
  );

  readonly totalWastedBytes = computed(() =>
    this.cacheItems().reduce((sum, item) => sum + item.wastedBytes, 0)
  );

  formatCacheTtl(ms: number): string {
    if (ms === 0) return 'Aucun';
    const seconds = ms / 1000;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}j`;
  }

  getCacheBadgeClass(ms: number): string {
    const base = 'px-1.5 py-0.5 rounded text-xs font-medium';
    if (ms === 0) return `${base} bg-red-100 text-red-700`;
    if (ms < 86400000) return `${base} bg-amber-100 text-amber-700`; // < 1 day
    return `${base} bg-green-100 text-green-700`;
  }

  getCacheBadgeText(ms: number): string {
    if (ms === 0) return 'Aucun';
    if (ms < 86400000) return 'Court';
    return 'OK';
  }

  getFilename(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || pathname;
    } catch {
      return url;
    }
  }
}
