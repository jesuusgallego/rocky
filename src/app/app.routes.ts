import { Routes } from '@angular/router';
import { ProgressPage } from './progress/progress-page';
import { TodayPage } from './today/today-page';

/** Cada dirección de la app y la pantalla que muestra. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'hoy' },
  { path: 'hoy', component: TodayPage, title: 'Hoy · Rocky' },
  { path: 'progreso', component: ProgressPage, title: 'Progreso · Rocky' },
  // Cualquier otra dirección lleva a Hoy.
  { path: '**', redirectTo: 'hoy' },
];
