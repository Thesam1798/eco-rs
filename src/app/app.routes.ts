import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/analyzer/analyzer.component').then((m) => m.AnalyzerComponent),
  },
  {
    path: 'results',
    loadComponent: () =>
      import('./features/results/results.component').then((m) => m.ResultsComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
