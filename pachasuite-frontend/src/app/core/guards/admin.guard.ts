import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const checkAuth = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Ya no verificamos el token (está en cookie HttpOnly, JS no puede leerlo)
  // Solo verificamos si hay sesión activa y si es admin
  if (auth.hasValidSession() && auth.isAdmin()) return true;

  auth.logout();
  return router.createUrlTree(['/admin/login']);
};

export const adminGuard: CanActivateFn & CanActivateChildFn & CanMatchFn = () => checkAuth();