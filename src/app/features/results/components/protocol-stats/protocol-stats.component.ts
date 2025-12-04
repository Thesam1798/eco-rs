import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { RequestDetail, ProtocolAnalytics, ProtocolStat } from '../../../../core/models';

@Component({
  selector: 'app-protocol-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Distribution des protocoles HTTP</h3>

      @if (protocolStats().length === 0) {
        <p class="text-gray-500 text-sm">Aucune donnee disponible</p>
      } @else {
        <div class="space-y-3">
          @for (stat of protocolStats(); track stat.protocol) {
            <div class="flex items-center gap-3">
              <span class="w-20 text-sm font-medium text-gray-700">{{ stat.protocol }}</span>
              <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  [style.width.%]="stat.percentage"
                  [style.background-color]="stat.color"
                ></div>
              </div>
              <span class="w-24 text-right text-sm text-gray-600">
                {{ stat.count }} ({{ stat.percentage | number: '1.0-1' }}%)
              </span>
            </div>
          }
        </div>

        <div class="mt-4 pt-4 border-t border-gray-100">
          <p class="text-sm text-gray-500">
            Total : <span class="font-medium text-gray-700">{{ totalRequests() }}</span> requetes
          </p>
        </div>
      }
    </div>
  `,
})
export class ProtocolStatsComponent {
  /** Pre-computed analytics from backend (preferred) */
  readonly analytics = input<ProtocolAnalytics>();
  /** Raw requests for fallback computation */
  readonly requests = input<RequestDetail[]>();

  private readonly protocolColors: Record<string, string> = {
    'HTTP/3': '#10b981', // green-500
    'HTTP/2': '#3b82f6', // blue-500
    'HTTP/1.1': '#f59e0b', // amber-500
    Autre: '#6b7280', // gray-500
  };

  readonly protocolStats = computed((): ProtocolStat[] => {
    // Prefer pre-computed analytics
    const analytics = this.analytics();
    if (analytics) {
      return analytics.protocols;
    }

    // Fallback: compute from raw requests
    const requests = this.requests();
    if (!requests || requests.length === 0) return [];

    const total = requests.length;
    const counts = new Map<string, number>();

    for (const req of requests) {
      const proto = this.normalizeProtocol(req.protocol);
      counts.set(proto, (counts.get(proto) || 0) + 1);
    }

    const order = ['HTTP/3', 'HTTP/2', 'HTTP/1.1', 'Autre'];
    return order
      .filter((proto) => counts.has(proto))
      .map((proto) => {
        const count = counts.get(proto) || 0;
        return {
          protocol: proto,
          count,
          percentage: (count / total) * 100,
          color: this.protocolColors[proto] || this.protocolColors['Autre'],
        };
      });
  });

  readonly totalRequests = computed(() => {
    const analytics = this.analytics();
    if (analytics) return analytics.totalRequests;
    return this.requests()?.length ?? 0;
  });

  private normalizeProtocol(protocol: string): string {
    const p = protocol.toLowerCase();
    if (p.startsWith('h3') || p.includes('quic')) return 'HTTP/3';
    if (p.startsWith('h2') || p === 'http/2') return 'HTTP/2';
    if (p.startsWith('http/1') || p === 'http/1.1' || p === 'http/1.0') return 'HTTP/1.1';
    return 'Autre';
  }
}
