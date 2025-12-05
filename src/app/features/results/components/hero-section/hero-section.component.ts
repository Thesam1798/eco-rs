import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ProgressRingComponent } from '../../../../shared/components/progress-ring/progress-ring.component';
import { ScoreBadgeComponent } from '../../../../shared/components/score-badge/score-badge.component';
import { EnvironmentalImpactComponent } from '../environmental-impact/environmental-impact.component';
import type { LighthouseResult } from '../../../../core/models';
import type { EcoIndexGrade } from '../../../../core/models';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, ProgressRingComponent, ScoreBadgeComponent, EnvironmentalImpactComponent],
  template: `
    <div class="bg-white rounded-2xl shadow-lg p-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- EcoIndex (left) -->
        <div class="flex flex-col items-center">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">EcoIndex</h2>
          <app-progress-ring [value]="ecoScore()" [size]="160" [strokeWidth]="12">
            <div class="flex flex-col items-center">
              <span class="text-4xl font-bold text-gray-800">
                {{ ecoScore() | number: '1.0-0' }}
              </span>
              <span class="text-sm text-gray-500">/100</span>
            </div>
          </app-progress-ring>
          <div class="mt-4">
            <app-score-badge [grade]="grade()" />
          </div>
          <p class="mt-2 text-sm text-gray-600 text-center">
            {{ gradeDescription() }}
          </p>
        </div>

        <!-- Performance (right) -->
        <div class="flex flex-col items-center">
          <h2 class="text-lg font-semibold text-gray-700 mb-4">Performance</h2>
          <app-progress-ring [value]="perfScore()" [size]="160" [strokeWidth]="12">
            <div class="flex flex-col items-center">
              <span class="text-4xl font-bold text-gray-800">
                {{ perfScore() }}
              </span>
              <span class="text-sm text-gray-500">/100</span>
            </div>
          </app-progress-ring>
          <div class="mt-4">
            <span class="px-3 py-1.5 rounded-full text-sm font-semibold" [class]="perfBadgeClass()">
              {{ perfLabel() }}
            </span>
          </div>
          <p class="mt-2 text-sm text-gray-600 text-center">Score Lighthouse Performance</p>
        </div>
      </div>

      <!-- Environmental Impact -->
      <div class="mt-8 pt-6 border-t border-gray-100">
        <app-environmental-impact [ghg]="ghg()" [water]="water()" />
      </div>
    </div>
  `,
})
export class HeroSectionComponent {
  readonly result = input.required<LighthouseResult>();

  readonly ecoScore = computed(() => this.result().ecoindex.score);
  readonly grade = computed(() => this.result().ecoindex.grade as EcoIndexGrade);
  readonly perfScore = computed(() => this.result().performance.performanceScore);
  readonly ghg = computed(() => this.result().ecoindex.ghg);
  readonly water = computed(() => this.result().ecoindex.water);

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

  readonly perfLabel = computed(() => {
    const score = this.perfScore();
    if (score >= 90) return 'Excellent';
    if (score >= 50) return 'Moyen';
    return 'Faible';
  });

  readonly perfBadgeClass = computed(() => {
    const score = this.perfScore();
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 50) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  });
}
