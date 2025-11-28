import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { getColorForScore } from '../../../core/utils';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-flex items-center justify-center">
      <svg [attr.width]="size()" [attr.height]="size()" class="-rotate-90">
        <!-- Background circle -->
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          stroke="currentColor"
          class="text-gray-200"
          [attr.stroke-width]="strokeWidth()"
        />
        <!-- Progress circle -->
        <circle
          [attr.cx]="center()"
          [attr.cy]="center()"
          [attr.r]="radius()"
          fill="none"
          [attr.stroke]="strokeColor()"
          [attr.stroke-width]="strokeWidth()"
          [attr.stroke-dasharray]="circumference()"
          [attr.stroke-dashoffset]="dashOffset()"
          stroke-linecap="round"
          class="transition-all duration-500 ease-out"
        />
      </svg>
      <div class="absolute inset-0 flex items-center justify-center">
        <ng-content />
      </div>
    </div>
  `,
})
export class ProgressRingComponent {
  readonly value = input.required<number>();
  readonly size = input<number>(120);
  readonly strokeWidth = input<number>(8);

  readonly center = computed(() => this.size() / 2);
  readonly radius = computed(() => (this.size() - this.strokeWidth()) / 2);
  readonly circumference = computed(() => 2 * Math.PI * this.radius());
  readonly dashOffset = computed(() => {
    const progress = Math.min(100, Math.max(0, this.value())) / 100;
    return this.circumference() * (1 - progress);
  });
  readonly strokeColor = computed(() => getColorForScore(this.value()));
}
