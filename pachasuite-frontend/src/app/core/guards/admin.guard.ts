import { inject } from '@angular/core';
import { CanActivateFn, CanActivateChildFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

const checkAuth = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.hasValidToken() && auth.isAdmin()) return true;

  auth.logout();
  return router.createUrlTree(['/admin/login']);
};


export const adminGuard: CanActivateFn & CanActivateChildFn & CanMatchFn = () => checkAuth();
