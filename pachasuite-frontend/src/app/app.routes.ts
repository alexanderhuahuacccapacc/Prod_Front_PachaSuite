import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { recepcionGuard } from './core/guards/recepcion.guard';

export const routes: Routes = [

  {
    path: '',
    loadComponent: () => import('./public/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'habitaciones',
    loadComponent: () => import('./public/habitaciones/habitaciones.component').then(m => m.HabitacionesComponent)
  },
  {
    path: 'huespedes',
    loadComponent: () => import('./public/huespedes/huespedes.component').then(m => m.HuespedesComponent)
  },
  {
    path: 'confirmacion/:codigo',
    loadComponent: () => import('./public/confirmacion/confirmacion.component').then(m => m.ConfirmacionComponent)
  },

  // ── Admin ───────────────────────────────────────────────────
  {
    path: 'admin/login',
    loadComponent: () => import('./admin/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    canMatch:         [adminGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'habitaciones',
        loadComponent: () => import('./admin/habitaciones/habitaciones-admin.component').then(m => m.HabitacionesAdminComponent)
      },
      {
        path: 'reservas',
        loadComponent: () => import('./admin/reservas/reservas.component').then(m => m.ReservasComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // ── Recepción ───────────────────────────────────────────────
  // Reutiliza los mismos componentes que /admin/* — cada componente
  // oculta internamente los botones/acciones según el rol del usuario.
  {
    path: 'recepcion',
    canActivate: [recepcionGuard],
    canActivateChild: [recepcionGuard],
    canMatch:         [recepcionGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'habitaciones',
        loadComponent: () => import('./admin/habitaciones/habitaciones-admin.component').then(m => m.HabitacionesAdminComponent)
      },
      {
        path: 'reservas',
        loadComponent: () => import('./admin/reservas/reservas.component').then(m => m.ReservasComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: '' }
];
