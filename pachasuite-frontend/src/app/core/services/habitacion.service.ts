import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Habitacion, BusquedaParams } from '../models/models';
import { AuthService } from './auth.service';

export interface HabitacionCreateBody {
  numero: string;
  nombre: string;
  tipo: string;
  capacidad: number;
  precioBase: number;
  camas?: string;
  sizeM2?: number;
}

@Injectable({ providedIn: 'root' })
export class HabitacionService {

  constructor(private http: HttpClient, private authService: AuthService) {}

  /** Lectura y amenidades existen en ambas rutas — recepcionista usa /recepcion,
   *  admin usa /admin (ambas devuelven los mismos datos del mismo service backend). */
  private get baseLectura(): string {
    return this.authService.isAdmin()
      ? `${environment.apiUrl}/admin/habitaciones`
      : `${environment.apiUrl}/recepcion/habitaciones`;
  }

  /** Crear, editar (datos generales) e imágenes son EXCLUSIVOS de admin en el backend. */
  private get baseAdminOnly(): string {
    return `${environment.apiUrl}/admin/habitaciones`;
  }

  buscarDisponibles(params: BusquedaParams): Observable<Habitacion[]> {
    const p = new HttpParams()
      .set('checkIn',  params.checkIn)
      .set('checkOut', params.checkOut)
      .set('adultos',  params.adultos.toString())
      .set('ninos',    params.ninos.toString());
    return this.http
      .get<Habitacion[]>(`${environment.apiUrl}/public/habitaciones/disponibles`, { params: p })
      .pipe(catchError(err => throwError(() => err)));
  }

  findAll(): Observable<Habitacion[]> {
    return this.http.get<Habitacion[]>(this.baseLectura);
  }

  listarTodas(): Observable<Habitacion[]> {
    return this.http
      .get<Habitacion[]>(`${environment.apiUrl}/public/habitaciones`)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ── NUEVO: crear habitación (solo ADMIN) ──
  create(body: HabitacionCreateBody): Observable<Habitacion> {
    return this.http.post<Habitacion>(this.baseAdminOnly, body);
  }

  // ── ACTUALIZADO: ahora incluye camas y sizeM2 (solo ADMIN) ──
  update(id: number, body: Partial<Habitacion> & { camas?: string; sizeM2?: number }): Observable<Habitacion> {
    return this.http.put<Habitacion>(`${this.baseAdminOnly}/${id}`, body);
  }

  // ── NUEVO: eliminar habitación (solo ADMIN) ──
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseAdminOnly}/${id}`);
  }

  // ── Amenidades: ADMIN y RECEPCIONISTA pueden togglearlas ──
  updateAmenidades(id: number, amenidades: Record<string, boolean>): Observable<Habitacion> {
    return this.http.put<Habitacion>(`${this.baseLectura}/${id}/amenidades`, amenidades);
  }

  // ── Imágenes (solo ADMIN) ──
  subirImagen(id: number, file: File): Observable<{ url: string; imagenes: string[]; total: number }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string; imagenes: string[]; total: number }>(
      `${this.baseAdminOnly}/${id}/imagenes`, formData
    );
  }

  eliminarImagen(id: number, url: string): Observable<{ imagenes: string[]; total: number }> {
    const params = new HttpParams().set('url', url);
    return this.http.delete<{ imagenes: string[]; total: number }>(
      `${this.baseAdminOnly}/${id}/imagenes`, { params }
    );
  }

  reordenarImagenes(id: number, imagenes: string[]): Observable<Habitacion> {
    return this.http.put<Habitacion>(
      `${this.baseAdminOnly}/${id}/imagenes/orden`, { imagenes }
    );
  }
}
