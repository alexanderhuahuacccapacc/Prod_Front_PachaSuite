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

  // Sesión válida y es admin → entra.
  if (auth.isAdmin()) return true;

  // Sesión válida pero con otro rol (ej. recepcionista) → lo mandamos a
  // SU dashboard, sin cerrarle la sesión.
  if (auth.isRecepcionista()) {
    return router.createUrlTree(['/recepcion/dashboard']);
  }

  // Rol desconocido/sin rol → ahí sí, fuera.
  auth.logout();
  return router.createUrlTree(['/admin/login']);
};

export const adminGuard: CanActivateFn & CanActivateChildFn & CanMatchFn = () => checkAuth();
