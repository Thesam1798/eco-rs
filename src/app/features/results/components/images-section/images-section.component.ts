import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { FormatBytesPipe } from '../../../../shared/pipes/format-bytes.pipe';
import type { ImageFormatAnalytics } from '../../../../core/models';

@Component({
  selector: 'app-images-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormatBytesPipe],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Optimisation des images</h3>

      @if (!imageFormats() || imageFormats()!.items.length === 0) {
        <div class="p-4 bg-green-50 rounded-lg">
          <div class="flex items-center gap-2">
            <span class="text-green-600 text-xl">✓</span>
            <p class="text-green-700 font-medium">
              Toutes les images utilisent des formats modernes
            </p>
          </div>
        </div>
      } @else {
        <div class="mb-4 p-4 bg-amber-50 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <span class="font-medium text-amber-800">Formats modernes disponibles</span>
              <p class="text-sm text-amber-600 mt-1">
                {{ imageFormats()!.items.length }} image(s) peuvent être converties en WebP/AVIF
              </p>
            </div>
            <span class="text-amber-700 font-bold">
              {{ imageFormats()!.potentialSavings | formatBytes }} économisables
            </span>
          </div>
        </div>

        <!-- Image List -->
        <div class="space-y-2 max-h-48 overflow-y-auto">
          @for (item of imageFormats()!.items.slice(0, 10); track item.url) {
            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
              <div class="flex items-center gap-2 min-w-0">
                <span
                  class="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs uppercase font-mono"
                >
                  {{ item.fromFormat }}
                </span>
                <span class="truncate text-gray-700" [title]="item.url">
                  {{ getFilename(item.url) }}
                </span>
              </div>
              <span class="text-amber-700 whitespace-nowrap ml-2 font-medium">
                -{{ item.wastedBytes | formatBytes }}
              </span>
            </div>
          }
        </div>

        @if (imageFormats()!.items.length > 10) {
          <p class="mt-2 text-xs text-gray-500">
            Et {{ imageFormats()!.items.length - 10 }} autres images...
          </p>
        }
      }
    </div>
  `,
})
export class ImagesSectionComponent {
  readonly imageFormats = input<ImageFormatAnalytics>();

  getFilename(url: string): string {
    try {
      return new URL(url).pathname.split('/').pop() || url;
    } catch {
      return url.split('/').pop() || url;
    }
  }
}
