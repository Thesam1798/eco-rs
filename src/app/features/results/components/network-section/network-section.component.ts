import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';
import { DomainStatsComponent } from '../domain-stats/domain-stats.component';
import { ProtocolStatsComponent } from '../protocol-stats/protocol-stats.component';
import { CacheAnalysisComponent } from '../cache-analysis/cache-analysis.component';
import { CacheIssuesComponent } from '../cache-issues/cache-issues.component';
import { DuplicatesComponent } from '../duplicates/duplicates.component';
import type { LighthouseResult, ResourceBreakdown } from '../../../../core/models';

@Component({
  selector: 'app-network-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormatBytesPipe,
    DomainStatsComponent,
    ProtocolStatsComponent,
    CacheAnalysisComponent,
    CacheIssuesComponent,
    DuplicatesComponent,
  ],
  template: `
    <div class="space-y-6">
      <h2 class="text-xl font-semibold text-gray-800">Analyse réseau</h2>

      <!-- Requests Summary -->
      <div class="bg-white rounded-2xl shadow-lg p-6">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Résumé des requêtes</h3>
        <div class="grid grid-cols-6 gap-3">
          <div class="text-center p-3 bg-yellow-50 rounded-lg">
            <div class="text-xl font-bold text-yellow-700">{{ breakdown().scripts }}</div>
            <div class="text-xs text-yellow-600">JS</div>
          </div>
          <div class="text-center p-3 bg-blue-50 rounded-lg">
            <div class="text-xl font-bold text-blue-700">{{ breakdown().stylesheets }}</div>
            <div class="text-xs text-blue-600">CSS</div>
          </div>
          <div class="text-center p-3 bg-green-50 rounded-lg">
            <div class="text-xl font-bold text-green-700">{{ breakdown().images }}</div>
            <div class="text-xs text-green-600">Images</div>
          </div>
          <div class="text-center p-3 bg-purple-50 rounded-lg">
            <div class="text-xl font-bold text-purple-700">{{ breakdown().fonts }}</div>
            <div class="text-xs text-purple-600">Polices</div>
          </div>
          <div class="text-center p-3 bg-orange-50 rounded-lg">
            <div class="text-xl font-bold text-orange-700">{{ breakdown().xhr }}</div>
            <div class="text-xs text-orange-600">XHR</div>
          </div>
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-xl font-bold text-gray-700">{{ breakdown().other }}</div>
            <div class="text-xs text-gray-600">Autres</div>
          </div>
        </div>

        <!-- Compression Status -->
        @if (compression()) {
          <div class="mt-4 p-4 rounded-lg" [class]="compressionStatusClass()">
            <div class="flex items-center justify-between">
              <span class="font-medium">Compression (Gzip/Brotli)</span>
              @if (compression()!.score >= 90) {
                <span class="text-green-700 font-semibold">Optimisé</span>
              } @else {
                <span class="text-amber-700">
                  {{ compression()!.potentialSavings | formatBytes }} économisables
                </span>
              }
            </div>
          </div>
        }

        <!-- Fonts Check -->
        <div class="mt-4 p-4 rounded-lg" [class]="fontsStatusClass()">
          <div class="flex items-center justify-between">
            <span class="font-medium">Polices</span>
            @if (fontStats().total === 0) {
              <span class="text-gray-500">Aucune police</span>
            } @else if (hasNonWoff2Fonts()) {
              <span class="text-amber-700">{{ fontsStatusMessage() }}</span>
            } @else {
              <span class="text-green-700">{{ fontsStatusMessage() }}</span>
            }
          </div>
          @if (hasNonWoff2Fonts()) {
            <p class="text-xs text-amber-600 mt-1">
              Privilégiez le format woff2 pour de meilleures performances
            </p>
          }
        </div>
      </div>

      <!-- Domain & Protocol Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @if (analytics()) {
          <app-domain-stats [analytics]="analytics()!.domainStats" />
          <app-protocol-stats [analytics]="analytics()!.protocolStats" />
        } @else if (requests().length > 0) {
          <app-domain-stats [requests]="requests()" />
          <app-protocol-stats [requests]="requests()" />
        }
      </div>

      <!-- Cache Analysis -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        @if (analytics()) {
          <app-cache-analysis [analytics]="analytics()!.cacheStats" />
          <app-cache-issues [analytics]="analytics()!.cacheStats" />
        } @else if (requests().length > 0) {
          <app-cache-analysis [requests]="requests()" />
          <app-cache-issues [requests]="requests()" />
        }
      </div>

      <!-- Duplicates -->
      @if (analytics()) {
        <app-duplicates [analytics]="analytics()!.duplicateStats" />
      } @else if (requests().length > 0) {
        <app-duplicates [requests]="requests()" />
      }
    </div>
  `,
})
export class NetworkSectionComponent {
  readonly result = input.required<LighthouseResult>();

  readonly analytics = computed(() => this.result().analytics);
  readonly requests = computed(() => this.result().requests ?? []);
  readonly compression = computed(() => this.result().compression);

  readonly breakdown = computed<ResourceBreakdown>(() => {
    return (
      this.result().ecoindex.resourceBreakdown ?? {
        scripts: 0,
        stylesheets: 0,
        images: 0,
        fonts: 0,
        xhr: 0,
        other: 0,
      }
    );
  });

  readonly compressionStatusClass = computed(() =>
    (this.compression()?.score ?? 100) >= 90 ? 'bg-green-50' : 'bg-amber-50'
  );

  readonly fontStats = computed(() => {
    const requests = this.requests();
    const fonts = requests.filter(
      (r) =>
        r.resourceType === 'Font' ||
        r.mimeType?.includes('font') ||
        /\.(woff2?|ttf|otf|eot)$/i.test(r.url || '')
    );

    const woff2 = fonts.filter(
      (r) => r.mimeType?.includes('woff2') || r.url?.toLowerCase().endsWith('.woff2')
    ).length;
    const woff = fonts.filter(
      (r) =>
        (r.mimeType?.includes('woff') && !r.mimeType?.includes('woff2')) ||
        (r.url?.toLowerCase().endsWith('.woff') && !r.url?.toLowerCase().endsWith('.woff2'))
    ).length;
    const ttf = fonts.filter(
      (r) => r.mimeType?.includes('ttf') || r.url?.toLowerCase().endsWith('.ttf')
    ).length;
    const otf = fonts.filter(
      (r) => r.mimeType?.includes('otf') || r.url?.toLowerCase().endsWith('.otf')
    ).length;
    const eot = fonts.filter(
      (r) => r.mimeType?.includes('eot') || r.url?.toLowerCase().endsWith('.eot')
    ).length;

    return { total: fonts.length, woff2, woff, ttf, otf, eot };
  });

  readonly hasNonWoff2Fonts = computed(() => {
    const stats = this.fontStats();
    return stats.woff + stats.ttf + stats.otf + stats.eot > 0;
  });

  readonly fontsStatusClass = computed(() => {
    const stats = this.fontStats();
    if (stats.total === 0) return 'bg-gray-50';
    if (this.hasNonWoff2Fonts()) return 'bg-amber-50';
    return 'bg-green-50';
  });

  readonly fontsStatusMessage = computed(() => {
    const stats = this.fontStats();
    if (stats.total === 0) return 'Aucune police';

    const parts: string[] = [];
    if (stats.woff2 > 0) parts.push(`${stats.woff2} woff2`);
    if (stats.woff > 0) parts.push(`${stats.woff} woff`);
    if (stats.ttf > 0) parts.push(`${stats.ttf} ttf`);
    if (stats.otf > 0) parts.push(`${stats.otf} otf`);
    if (stats.eot > 0) parts.push(`${stats.eot} eot`);

    return parts.join(', ');
  });
}
