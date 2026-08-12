import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'want-to-consume',
    loadComponent: () => import('./pages/want-to-consume/want-to-consume.component').then(m => m.WantToConsumeComponent)
  },
  {
    path: 'importers',

    loadComponent: () => import('./pages/importers/importers.component').then(m => m.ImportersComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
