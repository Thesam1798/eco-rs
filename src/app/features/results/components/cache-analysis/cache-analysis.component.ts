import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { CacheItem } from '../../../../core/models';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';

interface CacheGroup {
  label: string;
  count: number;
  totalBytes: number;
  wastedBytes: number;
  color: string;
  percentage: number;
}

const MS_HOUR = 3600000;
const MS_DAY = 86400000;
const MS_WEEK = 604800000;

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

        <!-- Grouped by TTL -->
        <div class="space-y-3">
          @for (group of cacheGroups(); track group.label) {
            <div class="flex items-center gap-3">
              <span class="w-20 text-sm font-medium text-gray-700">{{ group.label }}</span>
              <div class="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  [style.width.%]="group.percentage"
                  [style.background-color]="group.color"
                ></div>
              </div>
              <span class="w-16 text-right text-sm font-medium text-gray-700">
                {{ group.count }}
              </span>
            </div>
          }
        </div>

        <!-- Total -->
        <div class="mt-4 pt-4 border-t border-gray-100">
          <p class="text-sm text-gray-500">
            Total :
            <span class="font-medium text-gray-700">{{ cacheItems().length }}</span> ressources
          </p>
        </div>
      }
    </div>
  `,
})
export class CacheAnalysisComponent {
  readonly cacheAnalysis = input.required<CacheItem[]>();

  readonly cacheItems = computed(() =>
    this.cacheAnalysis()
      .filter((item) => item.cacheLifetimeMs < MS_WEEK)
      .sort((a, b) => a.cacheLifetimeMs - b.cacheLifetimeMs)
  );

  readonly cacheGroups = computed((): CacheGroup[] => {
    const items = this.cacheItems();
    const total = items.length;
    if (total === 0) return [];

    const groups = {
      none: { count: 0, totalBytes: 0, wastedBytes: 0 },
      hour: { count: 0, totalBytes: 0, wastedBytes: 0 },
      day: { count: 0, totalBytes: 0, wastedBytes: 0 },
      week: { count: 0, totalBytes: 0, wastedBytes: 0 },
    };

    for (const item of items) {
      const ms = item.cacheLifetimeMs;
      let group: keyof typeof groups;

      if (ms === 0) {
        group = 'none';
      } else if (ms < MS_HOUR) {
        group = 'hour';
      } else if (ms < MS_DAY) {
        group = 'day';
      } else {
        group = 'week';
      }

      groups[group].count++;
      groups[group].totalBytes += item.totalBytes;
      groups[group].wastedBytes += item.wastedBytes;
    }

    const result: CacheGroup[] = [];

    if (groups.none.count > 0) {
      result.push({
        label: 'Aucun',
        ...groups.none,
        color: '#ef4444', // red
        percentage: (groups.none.count / total) * 100,
      });
    }

    if (groups.hour.count > 0) {
      result.push({
        label: '< 1 heure',
        ...groups.hour,
        color: '#f59e0b', // amber
        percentage: (groups.hour.count / total) * 100,
      });
    }

    if (groups.day.count > 0) {
      result.push({
        label: '< 1 jour',
        ...groups.day,
        color: '#eab308', // yellow
        percentage: (groups.day.count / total) * 100,
      });
    }

    if (groups.week.count > 0) {
      result.push({
        label: '< 7 jours',
        ...groups.week,
        color: '#84cc16', // lime
        percentage: (groups.week.count / total) * 100,
      });
    }

    return result;
  });

  readonly totalWastedBytes = computed(() =>
    this.cacheItems().reduce((sum, item) => sum + item.wastedBytes, 0)
  );
}
