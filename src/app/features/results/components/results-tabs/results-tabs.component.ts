import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';

export type ResultsTab = 'overview' | 'requests' | 'cache' | 'performance';

interface TabConfig {
  id: ResultsTab;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-results-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-b border-gray-200">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            (click)="onTabClick(tab.id)"
            [class]="getTabClass(tab.id)"
            [attr.aria-current]="activeTab() === tab.id ? 'page' : null"
          >
            <span class="mr-2">{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
            @if (tab.id === 'requests' && requestCount() > 0) {
              <span
                class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {{ requestCount() }}
              </span>
            }
            @if (tab.id === 'cache' && cacheIssueCount() > 0) {
              <span
                class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
              >
                {{ cacheIssueCount() }}
              </span>
            }
          </button>
        }
      </nav>
    </div>
  `,
})
export class ResultsTabsComponent {
  readonly activeTab = input.required<ResultsTab>();
  readonly requestCount = input<number>(0);
  readonly cacheIssueCount = input<number>(0);
  readonly tabChange = output<ResultsTab>();

  readonly tabs: TabConfig[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'requests', label: 'Requetes', icon: '🌐' },
    { id: 'cache', label: 'Cache', icon: '💾' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
  ];

  onTabClick(tabId: ResultsTab): void {
    this.tabChange.emit(tabId);
  }

  getTabClass(tabId: ResultsTab): string {
    const baseClasses =
      'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors';
    if (this.activeTab() === tabId) {
      return `${baseClasses} border-emerald-500 text-emerald-600`;
    }
    return `${baseClasses} border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700`;
  }
}
