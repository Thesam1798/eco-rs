import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { RequestDetail, CacheAnalytics, CacheGroup } from '../../../../core/models';

const MS_HOUR = 3600000;
const MS_DAY = 86400000;
const MS_WEEK = 604800000;

@Component({
  selector: 'app-cache-analysis',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Analyse du cache</h3>

      @if (totalResources() === 0) {
        <p class="text-gray-500 text-sm">Aucune ressource a analyser</p>
      } @else {
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
            <span class="font-medium text-gray-700">{{ totalResources() }}</span> ressources
          </p>
        </div>
      }
    </div>
  `,
})
export class CacheAnalysisComponent {
  /** Pre-computed analytics from backend (preferred) */
  readonly analytics = input<CacheAnalytics>();
  /** Raw requests for fallback computation */
  readonly requests = input<RequestDetail[]>();

  readonly cacheGroups = computed((): CacheGroup[] => {
    // Prefer pre-computed analytics
    const analytics = this.analytics();
    if (analytics) {
      return analytics.groups;
    }

    // Fallback: compute from raw requests
    const items = this.requests();
    if (!items || items.length === 0) return [];

    const total = items.length;
    const groups = {
      none: 0,
      hour: 0,
      day: 0,
      week: 0,
      good: 0,
    };

    for (const item of items) {
      const ms = item.cacheLifetimeMs;
      if (ms === 0) {
        groups.none++;
      } else if (ms < MS_HOUR) {
        groups.hour++;
      } else if (ms < MS_DAY) {
        groups.day++;
      } else if (ms < MS_WEEK) {
        groups.week++;
      } else {
        groups.good++;
      }
    }

    const result: CacheGroup[] = [];
    if (groups.none > 0) {
      result.push({
        label: 'Aucun',
        count: groups.none,
        color: '#ef4444',
        percentage: (groups.none / total) * 100,
      });
    }
    if (groups.hour > 0) {
      result.push({
        label: '< 1 heure',
        count: groups.hour,
        color: '#f59e0b',
        percentage: (groups.hour / total) * 100,
      });
    }
    if (groups.day > 0) {
      result.push({
        label: '< 1 jour',
        count: groups.day,
        color: '#eab308',
        percentage: (groups.day / total) * 100,
      });
    }
    if (groups.week > 0) {
      result.push({
        label: '< 7 jours',
        count: groups.week,
        color: '#84cc16',
        percentage: (groups.week / total) * 100,
      });
    }
    if (groups.good > 0) {
      result.push({
        label: '>= 7 jours',
        count: groups.good,
        color: '#10b981',
        percentage: (groups.good / total) * 100,
      });
    }

    return result;
  });

  readonly totalResources = computed(() => {
    const analytics = this.analytics();
    if (analytics) return analytics.totalResources;
    return this.requests()?.length ?? 0;
  });
}
