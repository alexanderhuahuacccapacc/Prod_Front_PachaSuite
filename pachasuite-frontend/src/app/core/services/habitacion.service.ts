import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Habitacion, BusquedaParams } from '../models/models';

@Injectable({ providedIn: 'root' })
export class HabitacionService {

  constructor(private http: HttpClient) {}

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

  // Admin
  findAll(): Observable<Habitacion[]> {
    return this.http.get<Habitacion[]>(`${environment.apiUrl}/admin/habitaciones`);
  }
  // Listar todas las habitaciones (público, sin filtro de disponibilidad)
  listarTodas(): Observable<Habitacion[]> {
    return this.http
      .get<Habitacion[]>(`${environment.apiUrl}/public/habitaciones`)
      .pipe(catchError(err => throwError(() => err)));
  }

  update(id: number, body: Partial<Habitacion>): Observable<Habitacion> {
    return this.http.put<Habitacion>(`${environment.apiUrl}/admin/habitaciones/${id}`, body);
  }

  updateAmenidades(id: number, amenidades: Record<string, boolean>): Observable<Habitacion> {
    return this.http.put<Habitacion>(`${environment.apiUrl}/admin/habitaciones/${id}/amenidades`, amenidades);
  }
  subirImagen(id: number, file: File): Observable<{ url: string; imagenes: string[]; total: number }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string; imagenes: string[]; total: number }>(
      `${environment.apiUrl}/admin/habitaciones/${id}/imagenes`,
      formData
    );
  }

// Eliminar imagen
  eliminarImagen(id: number, url: string): Observable<{ imagenes: string[]; total: number }> {
    const params = new HttpParams().set('url', url);
    return this.http.delete<{ imagenes: string[]; total: number }>(
      `${environment.apiUrl}/admin/habitaciones/${id}/imagenes`,
      { params }
    );
  }

// Actualizar orden de imágenes (opcional - si quieres reordenar)
  reordenarImagenes(id: number, imagenes: string[]): Observable<Habitacion> {
    return this.http.put<Habitacion>(`${environment.apiUrl}/admin/habitaciones/${id}/imagenes/orden`, { imagenes });
  }
}
