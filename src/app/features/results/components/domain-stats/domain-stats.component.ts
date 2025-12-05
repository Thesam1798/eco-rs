import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { RequestDetail, DomainAnalytics, DomainStat } from '../../../../core/models';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';
import { DecimalPipe } from '@angular/common';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

@Component({
  selector: 'app-domain-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatBytesPipe, DecimalPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Statistiques par domaine</h3>

      @if (domainStats().length === 0) {
        <p class="text-gray-500 text-sm">Aucune donnee disponible</p>
      } @else {
        <div class="space-y-3">
          @for (stat of domainStats(); track stat.domain) {
            <div class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span class="truncate text-gray-700 font-medium" [title]="stat.domain">
                  {{ stat.domain }}
                </span>
                <span class="text-gray-500 whitespace-nowrap ml-2">
                  {{ stat.requestCount }} req ({{ stat.totalTransferSize | formatBytes }})
                </span>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-300"
                    [style.width.%]="stat.percentage"
                    [style.background-color]="stat.color"
                  ></div>
                </div>
                <span class="w-12 text-right text-xs text-gray-500">
                  {{ stat.percentage | number: '1.0-1' }}%
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Total -->
        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm text-gray-600">
          <span>
            Total : <span class="font-medium text-gray-700">{{ totalRequests() }}</span> requetes
          </span>
          <span class="font-medium text-gray-700">{{ totalSize() | formatBytes }}</span>
        </div>
      }
    </div>
  `,
})
export class DomainStatsComponent {
  /** Pre-computed analytics from backend (preferred) */
  readonly analytics = input<DomainAnalytics>();
  /** Raw requests for fallback computation */
  readonly requests = input<RequestDetail[]>();

  readonly domainStats = computed((): DomainStat[] => {
    // Prefer pre-computed analytics
    const analytics = this.analytics();
    if (analytics) {
      return analytics.domains;
    }

    // Fallback: compute from raw requests
    const requests = this.requests();
    if (!requests || requests.length === 0) return [];

    const statsMap = new Map<string, { requestCount: number; totalTransferSize: number }>();

    for (const req of requests) {
      const existing = statsMap.get(req.domain);
      if (existing) {
        existing.requestCount++;
        existing.totalTransferSize += req.transferSize;
      } else {
        statsMap.set(req.domain, {
          requestCount: 1,
          totalTransferSize: req.transferSize,
        });
      }
    }

    const total = requests.length;
    const sorted = Array.from(statsMap.entries()).sort(
      (a, b) => b[1].requestCount - a[1].requestCount
    );

    return sorted.map(([domain, stats], index) => ({
      domain: domain || '(inconnu)',
      requestCount: stats.requestCount,
      totalTransferSize: stats.totalTransferSize,
      percentage: (stats.requestCount / total) * 100,
      color: COLORS[index % COLORS.length],
    }));
  });

  readonly totalRequests = computed(() => {
    const analytics = this.analytics();
    if (analytics) return analytics.totalRequests;
    return this.domainStats().reduce((sum, s) => sum + s.requestCount, 0);
  });

  readonly totalSize = computed(() => {
    const analytics = this.analytics();
    if (analytics) return analytics.totalSize;
    return this.domainStats().reduce((sum, s) => sum + s.totalTransferSize, 0);
  });
}
