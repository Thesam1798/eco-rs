import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import type { EcoIndexGrade } from '../../core/models';
import { getGradeBgClass } from '../../core/utils';

@Component({
  selector: 'app-score-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center justify-center px-3 py-1 rounded-full text-white font-bold text-sm"
      [class]="bgClass()"
    >
      {{ grade() }}
    </span>
  `,
})
export class ScoreBadgeComponent {
  readonly grade = input.required<EcoIndexGrade>();

  readonly bgClass = computed(() => getGradeBgClass(this.grade()));
}
