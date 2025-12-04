import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { RequestDetail } from '../../../../core/models';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';

interface DomainStat {
  domain: string;
  requestCount: number;
  totalTransferSize: number;
}

@Component({
  selector: 'app-domain-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatBytesPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Statistiques par domaine</h3>

      @if (domainStats().length === 0) {
        <p class="text-gray-500 text-sm">Aucune donnee disponible</p>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200">
                <th class="text-left py-2 px-3 font-medium text-gray-600">Domaine</th>
                <th class="text-right py-2 px-3 font-medium text-gray-600">Requetes</th>
                <th class="text-right py-2 px-3 font-medium text-gray-600">Taille</th>
              </tr>
            </thead>
            <tbody>
              @for (stat of domainStats(); track stat.domain) {
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                  <td
                    class="py-2 px-3 font-mono text-xs text-gray-700 truncate max-w-[200px]"
                    [title]="stat.domain"
                  >
                    {{ stat.domain }}
                  </td>
                  <td class="py-2 px-3 text-right text-gray-600">
                    {{ stat.requestCount }}
                  </td>
                  <td class="py-2 px-3 text-right text-gray-600">
                    {{ stat.totalTransferSize | formatBytes }}
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="bg-gray-50 font-medium">
                <td class="py-2 px-3 text-gray-700">Total</td>
                <td class="py-2 px-3 text-right text-gray-700">{{ totalRequests() }}</td>
                <td class="py-2 px-3 text-right text-gray-700">{{ totalSize() | formatBytes }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </div>
  `,
})
export class DomainStatsComponent {
  readonly requests = input.required<RequestDetail[]>();

  readonly domainStats = computed((): DomainStat[] => {
    const requests = this.requests();
    const statsMap = new Map<string, DomainStat>();

    for (const req of requests) {
      const existing = statsMap.get(req.domain);
      if (existing) {
        existing.requestCount++;
        existing.totalTransferSize += req.transferSize;
      } else {
        statsMap.set(req.domain, {
          domain: req.domain || '(inconnu)',
          requestCount: 1,
          totalTransferSize: req.transferSize,
        });
      }
    }

    return Array.from(statsMap.values()).sort((a, b) => b.totalTransferSize - a.totalTransferSize);
  });

  readonly totalRequests = computed(() =>
    this.domainStats().reduce((sum, s) => sum + s.requestCount, 0)
  );

  readonly totalSize = computed(() =>
    this.domainStats().reduce((sum, s) => sum + s.totalTransferSize, 0)
  );
}
