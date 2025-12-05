import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { RequestDetail, DuplicateAnalytics, DuplicateGroup } from '../../../../core/models';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';

@Component({
  selector: 'app-duplicates',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatBytesPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Detection des duplicatas</h3>

      @if (duplicates().length === 0) {
        <p class="text-gray-500 text-sm">Aucun duplicata detecte</p>
      } @else {
        <div class="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p class="text-sm text-amber-800">
            <span class="font-semibold">{{ duplicates().length }}</span> ressource(s) dupliquee(s)
            detectee(s)
          </p>
          <p class="text-xs text-amber-600 mt-1">
            Perte potentielle : {{ totalWastedBytes() | formatBytes }}
          </p>
        </div>

        <div class="space-y-4">
          @for (dup of duplicates(); track dup.filename + dup.resourceSize) {
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                    {{ dup.resourceType }}
                  </span>
                  <span class="font-mono text-sm text-gray-800">{{ dup.filename }}</span>
                </div>
                <span class="text-sm text-gray-500">{{ dup.resourceSize | formatBytes }}</span>
              </div>
              <div class="text-xs text-gray-500">
                <p class="mb-1">{{ dup.urls.length }} occurrences :</p>
                <ul class="list-disc list-inside space-y-0.5">
                  @for (domain of getDomains(dup); track domain) {
                    <li class="truncate">{{ domain }}</li>
                  }
                </ul>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DuplicatesComponent {
  /** Pre-computed analytics from backend (preferred) */
  readonly analytics = input<DuplicateAnalytics>();
  /** Raw requests for fallback computation */
  readonly requests = input<RequestDetail[]>();

  readonly duplicates = computed((): DuplicateGroup[] => {
    // Prefer pre-computed analytics
    const analytics = this.analytics();
    if (analytics) {
      return analytics.duplicates;
    }

    // Fallback: compute from raw requests
    const requests = this.requests();
    if (!requests || requests.length === 0) return [];

    const groups = new Map<
      string,
      { urls: string[]; resourceType: string; resourceSize: number }
    >();

    for (const req of requests) {
      const filename = this.extractFilename(req.url);
      if (!filename) continue;

      const key = `${filename}:${req.resourceSize}`;
      const existing = groups.get(key);

      if (existing) {
        existing.urls.push(req.url);
      } else {
        groups.set(key, {
          urls: [req.url],
          resourceType: req.resourceType,
          resourceSize: req.resourceSize,
        });
      }
    }

    return Array.from(groups.entries())
      .filter(([, group]) => group.urls.length > 1)
      .map(([key, group]) => {
        const domains = [...new Set(group.urls.map((url) => this.extractDomain(url)))].sort();
        return {
          filename: key.split(':')[0],
          resourceSize: group.resourceSize,
          resourceType: group.resourceType,
          urls: group.urls,
          domains,
          wastedBytes: (group.urls.length - 1) * group.resourceSize,
        };
      })
      .sort((a, b) => b.wastedBytes - a.wastedBytes);
  });

  readonly totalWastedBytes = computed(() => {
    const analytics = this.analytics();
    if (analytics) return analytics.totalWastedBytes;
    return this.duplicates().reduce((sum, d) => sum + d.wastedBytes, 0);
  });

  getDomains(dup: DuplicateGroup): string[] {
    // Pre-computed analytics has domains, fallback uses urls
    if (dup.domains && dup.domains.length > 0) {
      return dup.domains;
    }
    return dup.urls.map((url) => this.extractDomain(url));
  }

  private extractFilename(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const filename = pathname.split('/').pop() || '';
      if (!filename || filename === 'index.html') return '';
      return filename;
    } catch {
      return '';
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}
