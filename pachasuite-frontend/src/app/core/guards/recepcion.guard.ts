import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const checkAuth = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Sin sesión válida → fuera, al login.
  if (!auth.hasValidSession()) {
    auth.logout();
    return router.createUrlTree(['/admin/login']);
  }

  // Recepcionista o admin (supervisando) → entra.
  if (auth.isRecepcionista() || auth.isAdmin()) return true;

  // Rol desconocido/sin rol → fuera.
  auth.logout();
  return router.createUrlTree(['/admin/login']);
};

export const recepcionGuard: CanActivateFn & CanActivateChildFn & CanMatchFn = () => checkAuth();
