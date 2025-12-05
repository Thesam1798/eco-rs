import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { RequestDetail, CacheAnalytics, ProblematicResource } from '../../../../core/models';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';

const MS_HOUR = 3600000;
const MS_DAY = 86400000;
const MS_WEEK = 604800000;

@Component({
  selector: 'app-cache-issues',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatBytesPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Ressources problematiques</h3>

      @if (problematicResources().length === 0) {
        <p class="text-green-600 text-sm">Toutes les ressources ont une bonne politique de cache</p>
      } @else {
        <div class="mb-3 text-sm text-amber-700">
          <span class="font-semibold">{{ problematicResources().length }}</span> ressource(s) avec
          cache &lt; 7 jours
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-white">
              <tr class="border-b border-gray-200">
                <th class="text-left py-2 px-2 font-medium text-gray-600">Fichier</th>
                <th class="text-left py-2 px-2 font-medium text-gray-600">Domaine</th>
                <th class="text-right py-2 px-2 font-medium text-gray-600">TTL</th>
                <th class="text-right py-2 px-2 font-medium text-gray-600">Taille</th>
              </tr>
            </thead>
            <tbody>
              @for (item of problematicResources(); track item.url) {
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td class="py-2 px-2">
                    <div class="flex items-center gap-1.5">
                      <span [class]="getBadgeClass(item)">
                        {{ getBadgeText(item) }}
                      </span>
                      <span
                        class="font-mono text-xs text-gray-700 truncate max-w-[120px]"
                        [title]="item.url"
                      >
                        {{ getFilename(item) }}
                      </span>
                    </div>
                  </td>
                  <td
                    class="py-2 px-2 text-xs text-gray-500 truncate max-w-[100px]"
                    [title]="item.domain"
                  >
                    {{ item.domain }}
                  </td>
                  <td
                    class="py-2 px-2 text-right text-gray-600 font-mono text-xs whitespace-nowrap"
                  >
                    {{ getTtlLabel(item) }}
                  </td>
                  <td class="py-2 px-2 text-right text-gray-600 text-xs whitespace-nowrap">
                    {{ getResourceSize(item) | formatBytes }}
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
export class CacheIssuesComponent {
  /** Pre-computed analytics from backend (preferred) */
  readonly analytics = input<CacheAnalytics>();
  /** Raw requests for fallback computation */
  readonly requests = input<RequestDetail[]>();

  readonly problematicResources = computed((): ProblematicResource[] => {
    // Prefer pre-computed analytics
    const analytics = this.analytics();
    if (analytics) {
      return analytics.problematicResources;
    }

    // Fallback: compute from raw requests
    const requests = this.requests();
    if (!requests || requests.length === 0) return [];

    return requests
      .filter((item) => item.cacheLifetimeMs < MS_WEEK)
      .sort((a, b) => a.cacheLifetimeMs - b.cacheLifetimeMs)
      .map((item) => ({
        url: item.url,
        domain: item.domain,
        filename: this.extractFilename(item.url),
        cacheLifetimeMs: item.cacheLifetimeMs,
        cacheTtlLabel: this.formatCacheTtl(item.cacheLifetimeMs),
        badgeClass: this.computeBadgeClass(item.cacheLifetimeMs),
        badgeText: this.computeBadgeText(item.cacheLifetimeMs),
        resourceSize: item.resourceSize,
      }));
  });

  // Helper methods that work with both data sources
  getFilename(item: ProblematicResource): string {
    return item.filename;
  }

  getBadgeClass(item: ProblematicResource): string {
    const base = 'px-1 py-0.5 rounded text-xs font-medium';
    return `${base} ${item.badgeClass}`;
  }

  getBadgeText(item: ProblematicResource): string {
    return item.badgeText;
  }

  getTtlLabel(item: ProblematicResource): string {
    return item.cacheTtlLabel;
  }

  getResourceSize(item: ProblematicResource): number {
    return item.resourceSize;
  }

  // Fallback computation methods
  private extractFilename(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').pop() || pathname;
    } catch {
      return url;
    }
  }

  private formatCacheTtl(ms: number): string {
    if (ms === 0) return 'Aucun';
    const seconds = ms / 1000;
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}j`;
  }

  private computeBadgeClass(ms: number): string {
    if (ms === 0) return 'bg-red-100 text-red-700';
    if (ms < MS_DAY) return 'bg-amber-100 text-amber-700';
    return 'bg-yellow-100 text-yellow-700';
  }

  private computeBadgeText(ms: number): string {
    if (ms === 0) return '!';
    if (ms < MS_HOUR) return '<1h';
    if (ms < MS_DAY) return '<1j';
    return '<7j';
  }
}
