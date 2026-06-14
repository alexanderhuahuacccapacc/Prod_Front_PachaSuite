// ── Habitación ────────────────────────────────────────────────
export interface Habitacion {
  id: number;
  numero: string;
  nombre: string;
  tipo: 'simple' | 'doble' | 'matrimonial' | 'triple' | 'cuadruple';
  capacidad: number;
  precioBase: number;
  sizeM2: number;
  camas: string;
  estado: 'libre' | 'pendiente' | 'ocupada' | 'mantenimiento';
  amenidades: Record<string, boolean>;
  imagenes: string[];
}

// ── Extra ─────────────────────────────────────────────────────
export interface Extra {
  id: number;
  codigo: string;
  nombre: string;
  icono: string;
  precioNoche: number;
}

// ── Búsqueda ──────────────────────────────────────────────────
export interface BusquedaParams {
  checkIn: string;
  checkOut: string;
  adultos: number;
  ninos: number;
}

// ── Huésped ───────────────────────────────────────────────────
export interface HuespedForm {
  nombre: string;
  apellido: string;
  tipo: 'titular' | 'acompanante';
  documentoTipo: string;
  documento: string;
  edad: number | null;
  sexo: string;
  nacionalidad: string;
  email: string;
  codigoPais: string;
  telefono: string;
  peticionEspecial: string;
}

export interface MensajeContacto {
  id: number;
  nombre: string;
  email: string;
  telefono?: string;
  asunto: string;
  mensaje: string;
  leido: boolean;
  respondido: boolean;
  createdAt: string;
}

export interface ContactForm {
  nombre: string;
  email: string;
  telefono: string;
  asunto: string;
  mensaje: string;
}

// ── Reserva Request (sin contactoVerificacion, solo email) ──
export interface ReservaRequest {
  checkIn: string;
  checkOut: string;
  adultos: number;
  ninos: number;
  habitacionId: number;
  huespedes: HuespedForm[];
  extrasCodigos: string[];
  codigoVerificacion: string;
  emailTitular: string;
}

// ── Verificación (solo EMAIL) ────────────────────────────────
export type MetodoVerificacion = 'EMAIL'; // Solo EMAIL

export interface VerificacionRequest {
  contacto: string;  // Solo email
  nombre?: string;
  captchaToken?: string; // Agregar captcha token
}

// ── Reserva Response ──────────────────────────────────────────
export interface ReservaResponse {
  id: number;
  codigo: string;
  habitacionId: number;
  habitacionNombre: string;
  habitacionNumero: string;
  habitacionTipo: string;
  checkIn: string;
  checkOut: string;
  noches: number;
  adultos: number;
  ninos: number;
  estado: string;
  pagoEstado: string;
  subtotal: number;
  impuestos: number;
  total: number;
  origen: string;
  createdAt: string;
  huespedes: HuespedResponse[];
  extras: Extra[];
  nombreCliente?: string;  // ← AGREGAR ESTO (opcional con ?)
  email?: string;
}

export interface HuespedResponse {
  nombre: string;
  apellido: string;
  tipo: string;
  email: string;
  telefono: string;
  documento: string;
  documentoTipo: string;
  edad: number;
  sexo: string;
  nacionalidad: string;
  peticionEspecial: string;
}

// ── Auth ──────────────────────────────────────────────────────
export interface LoginRequest { email: string; password: string; }
export interface JwtResponse { token: string; tipo: string; email: string; nombre: string; rol: string; }

export interface ReservaWizardState {
  busqueda: BusquedaParams | null;
  habitacion: Habitacion | null;
  extrasSeleccionados: string[];
  huespedes: HuespedForm[];
  emailTitular: string;
}
