import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';
import type { CoverageAnalytics } from '../../../../core/models';

@Component({
  selector: 'app-coverage-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormatBytesPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Couverture du code</h3>

      @if (!coverage()) {
        <p class="text-gray-500 text-sm">Données non disponibles</p>
      } @else {
        <div class="grid grid-cols-2 gap-6">
          <!-- Unused JS -->
          <div class="p-4 bg-yellow-50 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-yellow-800">JavaScript inutilisé</span>
              <span class="text-2xl font-bold text-yellow-700">
                {{ coverage()!.unusedJs.wastedPercentage | number: '1.0-0' }}%
              </span>
            </div>
            <div class="text-sm text-yellow-600">
              {{ coverage()!.unusedJs.wastedBytes | formatBytes }} économisables
            </div>
            <div class="mt-3 h-2 bg-yellow-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-yellow-500 rounded-full transition-all"
                [style.width.%]="coverage()!.unusedJs.wastedPercentage"
              ></div>
            </div>
          </div>

          <!-- Unused CSS -->
          <div class="p-4 bg-blue-50 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <span class="font-medium text-blue-800">CSS inutilisé</span>
              <span class="text-2xl font-bold text-blue-700">
                {{ coverage()!.unusedCss.wastedPercentage | number: '1.0-0' }}%
              </span>
            </div>
            <div class="text-sm text-blue-600">
              {{ coverage()!.unusedCss.wastedBytes | formatBytes }} économisables
            </div>
            <div class="mt-3 h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full transition-all"
                [style.width.%]="coverage()!.unusedCss.wastedPercentage"
              ></div>
            </div>
          </div>
        </div>

        <!-- Details (collapsible) -->
        @if (showDetails()) {
          <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="grid grid-cols-2 gap-4">
              <!-- JS Details -->
              @if (coverage()!.unusedJs.items.length > 0) {
                <div>
                  <h4 class="text-sm font-medium text-gray-700 mb-2">Fichiers JS</h4>
                  <div class="space-y-1 max-h-32 overflow-y-auto">
                    @for (item of coverage()!.unusedJs.items; track item.url) {
                      <div class="flex justify-between text-xs">
                        <span class="truncate text-gray-600 max-w-[180px]" [title]="item.url">
                          {{ getFilename(item.url) }}
                        </span>
                        <span class="text-yellow-700 ml-2">
                          {{ item.wastedPercent | number: '1.0-0' }}%
                        </span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- CSS Details -->
              @if (coverage()!.unusedCss.items.length > 0) {
                <div>
                  <h4 class="text-sm font-medium text-gray-700 mb-2">Fichiers CSS</h4>
                  <div class="space-y-1 max-h-32 overflow-y-auto">
                    @for (item of coverage()!.unusedCss.items; track item.url) {
                      <div class="flex justify-between text-xs">
                        <span class="truncate text-gray-600 max-w-[180px]" [title]="item.url">
                          {{ getFilename(item.url) }}
                        </span>
                        <span class="text-blue-700 ml-2">
                          {{ item.wastedPercent | number: '1.0-0' }}%
                        </span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (hasDetails()) {
          <button
            type="button"
            (click)="toggleDetails()"
            class="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {{ showDetails() ? 'Masquer les détails' : 'Voir les détails' }}
          </button>
        }
      }
    </div>
  `,
})
export class CoverageSectionComponent {
  readonly coverage = input<CoverageAnalytics>();

  showDetails = signal(false);

  toggleDetails(): void {
    this.showDetails.update((v) => !v);
  }

  hasDetails(): boolean {
    const cov = this.coverage();
    if (!cov) return false;
    return cov.unusedJs.items.length > 0 || cov.unusedCss.items.length > 0;
  }

  getFilename(url: string): string {
    try {
      return new URL(url).pathname.split('/').pop() || url;
    } catch {
      return url.split('/').pop() || url;
    }
  }
}
