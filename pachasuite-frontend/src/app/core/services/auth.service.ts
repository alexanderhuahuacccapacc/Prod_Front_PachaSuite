import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { JwtResponse, LoginRequest } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly USER_KEY = 'pacha_user'; // solo guardamos info del usuario, NO el token

  isLoggedIn  = signal(this.hasValidSession());
  currentUser = signal<any | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(req: LoginRequest): Observable<any> {
    return this.http.post<any>(
      `${environment.apiUrl}/auth/login`,
      req,
      { withCredentials: true }  // ← envía y recibe cookies
    ).pipe(
      tap(res => {
        // El token ya está en la cookie HttpOnly, solo guardamos info del usuario
        const user = { email: res.email, rol: res.rol };
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.isLoggedIn.set(true);
        this.currentUser.set(user);
      })
    );
  }

  logout(): void {
    // Llamar al backend para limpiar la cookie
    this.http.post(
      `${environment.apiUrl}/auth/logout`,
      {},
      { withCredentials: true }
    ).subscribe();

    localStorage.removeItem(this.USER_KEY);
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/admin/login']);
  }

  isAdmin(): boolean {
    const user = this.loadUser();
    return user?.rol === 'ROLE_ADMIN';
  }

  isRecepcionista(): boolean {
    const user = this.loadUser();
    return user?.rol === 'ROLE_RECEPCIONISTA';
  }

  getRol(): string | null {
    return this.loadUser()?.rol ?? null;
  }

  hasValidSession(): boolean {
    // Ya no podemos leer el token (está en cookie HttpOnly)
    // Solo verificamos si hay info de usuario guardada
    return !!localStorage.getItem(this.USER_KEY);
  }

  private loadUser(): any | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
