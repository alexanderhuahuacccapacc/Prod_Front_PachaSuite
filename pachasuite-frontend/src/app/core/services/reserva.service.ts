import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ReservaRequest, ReservaResponse, ReservaWizardState,
  Habitacion, HuespedForm, BusquedaParams, VerificacionRequest
} from '../models/models';
import { AuthService } from './auth.service';

export interface AdminReservaRequest {
  checkIn: string;
  checkOut: string;
  adultos: number;
  ninos: number;
  habitacionId: number;
  huespedes: HuespedForm[];
  extrasCodigos: string[];
  pagoEstado: string;
}

export interface EditarReservaRequest {
  checkIn: string;
  checkOut: string;
  adultos: number;
  ninos: number;
  extrasCodigos: string[];
  pagoEstado: string;
}

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private reservando = false;
  captchaToken = signal('');

  wizardState = signal<ReservaWizardState>({
    acompanantes: [],
    busqueda: null,
    habitacion: null,
    extrasSeleccionados: [],
    huespedes: [],
    emailTitular: ''
    // ❌ ELIMINADO: telefonoTitular
  });

  constructor(private http: HttpClient, private authService: AuthService) {}

  setCaptchaToken(token: string): void {
    this.captchaToken.set(token);
  }

  // ✅ Método actualizado: solo email
  enviarCodigo(email: string, nombre?: string): Observable<{ message: string }> {
    const req: VerificacionRequest = {
      contacto: email,
      nombre: nombre || '',
      captchaToken: this.captchaToken()
    };

    return this.http
      .post<{ message: string }>(
        `${environment.apiUrl}/public/verificacion/enviar`,
        req
      )
      .pipe(catchError(err => throwError(() => err)));
  }

  crearReserva(req: ReservaRequest): Observable<ReservaResponse> {
    if (this.reservando) {
      return throwError(() => new Error('Ya hay una reserva en proceso'));
    }

    this.reservando = true;

    return this.http
      .post<ReservaResponse>(`${environment.apiUrl}/reservas`, req)
      .pipe(
        catchError(err => {
          this.reservando = false;
          return throwError(() => err);
        }),
        tap(() => {
          this.reservando = false;
        })
      );
  }

  findByCodigo(codigo: string): Observable<ReservaResponse> {
    return this.http
      .get<ReservaResponse>(`${environment.apiUrl}/reservas/${codigo}`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ── ADMIN: paginado, Page<ReservaResponseDTO> ──────────────────
  findAllAdmin(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/admin/reservas`);
  }

  confirmarAdmin(id: number): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(`${environment.apiUrl}/admin/reservas/${id}/confirmar`, {});
  }

  cancelarAdmin(id: number): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(`${environment.apiUrl}/admin/reservas/${id}/cancelar`, {});
  }

  editarAdmin(id: number, req: EditarReservaRequest): Observable<ReservaResponse> {
    return this.http
      .put<ReservaResponse>(`${environment.apiUrl}/admin/reservas/${id}/editar`, req)
      .pipe(catchError(err => throwError(() => err)));
  }

  crearReservaAdmin(req: AdminReservaRequest): Observable<ReservaResponse> {
    return this.authService.isAdmin()
      ? this.http.post<ReservaResponse>(`${environment.apiUrl}/admin/reservas`, req)
        .pipe(catchError(err => throwError(() => err)))
      : this.crearReservaRecepcion(req);
  }

  // ── RECEPCIONISTA: misma forma de respuesta que admin (Page), mismos verbos PUT ─
  findAllRecepcion(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/recepcion/reservas`);
  }

  confirmarRecepcion(id: number): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(`${environment.apiUrl}/recepcion/reservas/${id}/confirmar`, {});
  }

  cancelarRecepcion(id: number): Observable<ReservaResponse> {
    return this.http.put<ReservaResponse>(`${environment.apiUrl}/recepcion/reservas/${id}/cancelar`, {});
  }

  editarRecepcion(id: number, req: EditarReservaRequest): Observable<ReservaResponse> {
    return this.http
      .put<ReservaResponse>(`${environment.apiUrl}/recepcion/reservas/${id}/editar`, req)
      .pipe(catchError(err => throwError(() => err)));
  }
  crearReservaRecepcion(req: AdminReservaRequest): Observable<ReservaResponse> {
    return this.http
      .post<ReservaResponse>(`${environment.apiUrl}/recepcion/reservas`, req)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ── Helpers que eligen la variante correcta según el rol actual ─
  // Usar estos desde los componentes compartidos (Dashboard, etc.)
  // en vez de llamar admin/recepcion directamente.
  findAll(): Observable<any> {
    return this.authService.isAdmin() ? this.findAllAdmin() : this.findAllRecepcion();
  }

  confirmar(id: number): Observable<ReservaResponse> {
    return this.authService.isAdmin() ? this.confirmarAdmin(id) : this.confirmarRecepcion(id);
  }

  cancelar(id: number): Observable<ReservaResponse> {
    return this.authService.isAdmin() ? this.cancelarAdmin(id) : this.cancelarRecepcion(id);
  }

  setBusqueda(b: BusquedaParams): void {
    this.wizardState.update(s => ({ ...s, busqueda: b }));
  }

  setHabitacion(h: Habitacion, extras: string[]): void {
    this.wizardState.update(s => ({ ...s, habitacion: h, extrasSeleccionados: extras }));
  }

  // ✅ Actualizado: solo email
  setHuespedes(huespedes: HuespedForm[], email: string): void {
    this.wizardState.update(s => ({ ...s, huespedes, emailTitular: email }));
  }

  resetWizard(): void {
    this.wizardState.set({
      acompanantes: [],
      busqueda: null, habitacion: null,
      extrasSeleccionados: [], huespedes: [],
      emailTitular: ''
    });
    this.captchaToken.set('');
  }

  getHabitaciones(): Observable<Habitacion[]> {
    return this.http
      .get<Habitacion[]>(`${environment.apiUrl}/public/habitaciones`)
      .pipe(catchError(err => throwError(() => err)));
  }

  setHabitacionSeleccionada(habitacion: Habitacion): void {
    this.wizardState.update(s => ({
      ...s,
      habitacion: habitacion,
      extrasSeleccionados: []
    }));
  }

  calcularNoches(): number {
    const b = this.wizardState().busqueda;
    if (!b) return 0;
    // Forzar parsing como fecha local agregando T00:00:00
    const d1 = new Date(b.checkIn  + 'T00:00:00');
    const d2 = new Date(b.checkOut + 'T00:00:00');
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
  }

  editar(id: number, req: EditarReservaRequest): Observable<ReservaResponse> {
    return this.authService.isAdmin() ? this.editarAdmin(id, req) : this.editarRecepcion(id, req);
  }
}
