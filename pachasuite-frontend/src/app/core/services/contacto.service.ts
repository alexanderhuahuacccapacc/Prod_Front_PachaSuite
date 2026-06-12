import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── DTOs públicos del formulario de contacto (frontend → backend) ──
export interface ContactoRequest {
  nombre:   string;
  email:    string;
  telefono: string;
  asunto:   string;
  mensaje:  string;
}

export interface ContactoResponse {
  id:        number;
  nombre:    string;
  email:     string;
  telefono:  string;
  asunto:    string;
  mensaje:   string;
  leido:     boolean;
  respondido:  boolean;
  createdAt: string;
}

// Alias para compatibilidad con el dashboard
export type MensajeContacto = ContactoResponse;

@Injectable({ providedIn: 'root' })
export class ContactoService {

  private base = `${environment.apiUrl}/mensajes-contacto`;

  constructor(private http: HttpClient) {}

  // ── Envío público desde el formulario de contacto ──────────────
  enviar(req: ContactoRequest): Observable<ContactoResponse> {
    return this.http
      .post<ContactoResponse>(`${environment.apiUrl}/mensajes-contacto`, req)
      .pipe(catchError(err => throwError(() => err)));
  }

  // ── Métodos de administración (panel dashboard) ────────────────
  findAll(): Observable<MensajeContacto[]> {
    return this.http.get<MensajeContacto[]>(this.base);
  }

  findNoLeidos(): Observable<MensajeContacto[]> {
    return this.http.get<MensajeContacto[]>(`${this.base}/no-leidos`);
  }

  countNoLeidos(): Observable<number> {
    return this.http.get<number>(`${this.base}/no-leidos/count`);
  }

  marcarLeido(id: number): Observable<MensajeContacto> {
    return this.http.patch<MensajeContacto>(`${this.base}/${id}/leido`, {});
  }

  marcarTodosLeidos(): Observable<void> {
    return this.http.patch<void>(`${this.base}/marcar-todos-leidos`, {});
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
  responder(id: number, cuerpo: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/responder`, { cuerpo });
  }
  findRespondidos(): Observable<MensajeContacto[]> {
    return this.http.get<MensajeContacto[]>(`${this.base}/respondidos`);
  }
}
