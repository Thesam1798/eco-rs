import { Component, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AnalysisMode } from '../../../../core/models';

@Component({
  selector: 'app-analysis-options',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col gap-4">
      <div class="flex gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="quick"
            [ngModel]="mode()"
            (ngModelChange)="mode.set($event)"
            class="w-4 h-4 text-grade-a"
          />
          <span class="text-sm"> <strong>Rapide</strong> (~5s) — EcoIndex seul </span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="full"
            [ngModel]="mode()"
            (ngModelChange)="mode.set($event)"
            class="w-4 h-4 text-grade-a"
          />
          <span class="text-sm"> <strong>Complet</strong> (~30s) — Lighthouse + EcoIndex </span>
        </label>
      </div>

      @if (mode() === 'full') {
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            [ngModel]="includeHtml()"
            (ngModelChange)="includeHtml.set($event)"
            class="w-4 h-4 text-grade-a rounded"
          />
          <span class="text-sm text-gray-600"> Inclure le rapport HTML Lighthouse </span>
        </label>
      }
    </div>
  `,
})
export class AnalysisOptionsComponent {
  readonly mode = model<AnalysisMode>('quick');
  readonly includeHtml = model<boolean>(false);
}
