import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring.component';
import { ScoreBadgeComponent } from '../../../../shared/components/score-badge/score-badge.component';
import type { EcoIndexGrade } from '../../../../core/models';

@Component({
  selector: 'app-ecoindex-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ProgressRingComponent, ScoreBadgeComponent],
  template: `
    <div class="flex flex-col items-center">
      <app-progress-ring [value]="score()" [size]="180" [strokeWidth]="12">
        <div class="flex flex-col items-center">
          <span class="text-4xl font-bold text-gray-800">
            {{ score() | number: '1.0-0' }}
          </span>
          <span class="text-sm text-gray-500">/100</span>
        </div>
      </app-progress-ring>

      <div class="mt-4">
        <app-score-badge [grade]="grade()" />
      </div>

      <p class="mt-2 text-sm text-gray-600">
        {{ gradeDescription() }}
      </p>
    </div>
  `,
})
export class EcoindexGaugeComponent {
  readonly score = input.required<number>();
  readonly grade = input.required<EcoIndexGrade>();

  readonly gradeDescription = computed(() => {
    const descriptions: Record<EcoIndexGrade, string> = {
      A: 'Excellent — Site très éco-responsable',
      B: 'Très bien — Faible impact environnemental',
      C: 'Bien — Impact modéré',
      D: 'Moyen — Amélioration possible',
      E: 'Insuffisant — Impact significatif',
      F: 'Mauvais — Impact élevé',
      G: 'Très mauvais — Impact très élevé',
    };
    return descriptions[this.grade()];
  });
}
