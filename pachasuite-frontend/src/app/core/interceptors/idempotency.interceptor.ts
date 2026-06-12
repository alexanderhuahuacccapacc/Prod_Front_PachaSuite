import { HttpInterceptorFn } from '@angular/common/http';

export const idempotencyInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo para POST de reservas
  if (req.method === 'POST' && req.url.includes('/api/reservas')) {
    const idempotencyKey = crypto.randomUUID();
    const clonedReq = req.clone({
      setHeaders: {
        'Idempotency-Key': idempotencyKey
      }
    });
    return next(clonedReq);
  }
  return next(req);
};
