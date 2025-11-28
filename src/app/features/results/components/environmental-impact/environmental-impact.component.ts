import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-environmental-impact',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="grid grid-cols-2 gap-6">
      <!-- GHG -->
      <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
            <span class="text-2xl">🌿</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-green-800">
              {{ ghg() | number: '1.2-2' }}
              <span class="text-sm font-normal">gCO₂e</span>
            </div>
            <div class="text-sm text-green-600">Émissions GES</div>
          </div>
        </div>
        <p class="mt-3 text-xs text-green-700">Par visite de page</p>
      </div>

      <!-- Water -->
      <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
            <span class="text-2xl">💧</span>
          </div>
          <div>
            <div class="text-2xl font-bold text-blue-800">
              {{ water() | number: '1.2-2' }}
              <span class="text-sm font-normal">cl</span>
            </div>
            <div class="text-sm text-blue-600">Consommation eau</div>
          </div>
        </div>
        <p class="mt-3 text-xs text-blue-700">Par visite de page</p>
      </div>
    </div>
  `,
})
export class EnvironmentalImpactComponent {
  readonly ghg = input.required<number>();
  readonly water = input.required<number>();
}
