import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center py-12">
      <!-- Spinner -->
      <div class="relative">
        <div class="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
        <div
          class="absolute top-0 left-0 w-16 h-16 border-4 border-grade-a rounded-full animate-spin"
          style="border-top-color: transparent"
        ></div>
      </div>

      <!-- Message -->
      <p class="mt-6 text-lg font-medium text-gray-700">Analyse en cours...</p>
      <p class="mt-2 text-sm text-gray-500">Exécution de Lighthouse (~30 secondes)</p>

      <!-- URL -->
      @if (url()) {
        <p class="mt-4 text-xs text-gray-400 font-mono truncate max-w-md">
          {{ url() }}
        </p>
      }
    </div>
  `,
})
export class LoadingIndicatorComponent {
  readonly url = input<string>('');
}
