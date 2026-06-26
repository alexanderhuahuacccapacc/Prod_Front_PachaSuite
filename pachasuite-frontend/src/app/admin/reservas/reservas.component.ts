import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservaService, AdminReservaRequest, EditarReservaRequest } from '../../core/services/reserva.service';
import { HabitacionService } from '../../core/services/habitacion.service';
import { ExtraService } from '../../core/services/extra.service';
import { AdminSidebarComponent } from '../../shared/components/admin-sidebar/admin-sidebar.component';
import { ReservaResponse, Habitacion, HuespedForm, Extra } from '../../core/models/models';

// ✅ FIX ZONA HORARIA: helpers que trabajan en hora LOCAL (Peru UTC-5)
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(str: string): Date {
  return new Date(str + 'T00:00:00'); // fuerza interpretación local, no UTC
}

type WizardStep = 'fechas' | 'habitacion' | 'huesped' | 'resumen';

interface NuevaReservaForm {
  checkIn: string; checkOut: string;
  adultos: number; ninos: number;
  pagoEstado: string; habitacionId: number | null;
  extrasCodigos: string[]; huespedes: HuespedForm[];
}

@Component({
  selector: 'app-reservas',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, AdminSidebarComponent],
  templateUrl: './reservas.component.html',
  styleUrls: ['./reservas.component.scss']
})
export class ReservasComponent implements OnInit {

  allReservas   = signal<ReservaResponse[]>([]);
  filtered      = signal<ReservaResponse[]>([]);
  loading       = signal(true);
  filtroEstado  = '';

  countByEstado = (e: string) => this.allReservas().filter(r => r.estado === e).length;
  ingresoTotal  = () => this.allReservas().filter(r => r.estado !== 'cancelada').reduce((s, r) => s + r.total, 0);

  detailReserva = signal<ReservaResponse | null>(null);
  confirmando   = signal<number | null>(null);

  showCancelConfirm = signal<ReservaResponse | null>(null);
  cancelando        = signal(false);
  cancelError       = signal('');

  showEditModal  = signal<ReservaResponse | null>(null);
  guardando      = signal(false);
  editError      = signal('');
  editSuccess    = signal(false);

  editForm: EditarReservaRequest = {
    checkIn: '', checkOut: '', adultos: 1, ninos: 0, extrasCodigos: [], pagoEstado: 'PENDIENTE'
  };

  // ✅ FIX 1: usar toLocalDateString en lugar de toISOString()
  today = toLocalDateString(new Date());

  pagoOpciones = [
    { val: 'PENDIENTE', label: 'Pendiente' },
    { val: 'MITAD',     label: 'Mitad pagada' },
    { val: 'COMPLETO',  label: 'Pago completo' }
  ];

  showNuevaModal   = signal(false);
  wizardStep       = signal<WizardStep>('fechas');
  creandoAdmin     = signal(false);
  adminError       = signal('');
  adminSuccess     = signal<ReservaResponse | null>(null);
  habitacionesDisp = signal<Habitacion[]>([]);
  buscandoHabs     = signal(false);
  activeHuesped    = signal(0);

  nuevaForm: NuevaReservaForm = {
    checkIn: '', checkOut: '', adultos: 1, ninos: 0,
    pagoEstado: 'PENDIENTE', habitacionId: null, extrasCodigos: [], huespedes: []
  };

  habSeleccionada = signal<Habitacion | null>(null);

  extrasDisp = computed(() => {
    const h = this.habSeleccionada();
    return h ? this.extraService.getExtrasDisponibles(h.amenidades) : [];
  });

  // ✅ FIX 2: usar parseLocalDate para evitar interpretación UTC
  noches = computed(() => {
    if (!this.nuevaForm.checkIn || !this.nuevaForm.checkOut) return 0;
    const ms = parseLocalDate(this.nuevaForm.checkOut).getTime()
      - parseLocalDate(this.nuevaForm.checkIn).getTime();
    return Math.max(0, Math.round(ms / 86400000));
  });

  subtotal = computed(() => {
    const h = this.habSeleccionada();
    if (!h || this.noches() === 0) return 0;
    const extra = this.extraService.getBycodigos(this.nuevaForm.extrasCodigos).reduce((a, e) => a + e.precioNoche, 0);
    return (h.precioBase + extra) * this.noches();
  });
  impuestos = computed(() => Math.round(this.subtotal() * 0.18 * 100) / 100);
  total     = computed(() => this.subtotal() + this.impuestos());

  habNombreResumen = computed(() => {
    const h = this.habSeleccionada();
    return h ? `${h.numero} — ${h.nombre}` : '—';
  });

  extrasNombres = computed(() => {
    const extras = this.extraService.getBycodigos(this.nuevaForm.extrasCodigos);
    return extras.length > 0 ? extras.map(e => e.nombre).join(', ') : '';
  });

  wizardSteps = [
    { key: 'fechas',     num: 1, label: 'Fechas'     },
    { key: 'habitacion', num: 2, label: 'Habitación' },
    { key: 'huesped',    num: 3, label: 'Huéspedes'  },
    { key: 'resumen',    num: 4, label: 'Confirmar'  }
  ];

  constructor(
    private reservaService:    ReservaService,
    private habitacionService: HabitacionService,
    private extraService:      ExtraService
  ) {}

  ngOnInit(): void { this.load(); }


  load(): void {
    this.loading.set(true);
    this.reservaService.findAll().subscribe({
      next: (res: any) => {
        // El backend devuelve Page<>, extraer el array "content"
        const lista = res.content ?? res;
        this.allReservas.set(lista);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter(): void {
    this.filtered.set(
      this.filtroEstado ? this.allReservas().filter(r => r.estado === this.filtroEstado) : this.allReservas()
    );
  }


  openDetail(r: ReservaResponse): void { this.detailReserva.set(r); }
  closeDetail(): void { this.detailReserva.set(null); }


  confirmar(r: ReservaResponse): void {
    this.confirmando.set(r.id);
    this.reservaService.confirmar(r.id).subscribe({
      next: updated => {
        this.updateInList(updated);
        this.confirmando.set(null);
        if (this.detailReserva()?.id === updated.id) this.detailReserva.set(updated);
      },
      error: () => this.confirmando.set(null)
    });
  }

  confirmarFromDetail(): void { const r = this.detailReserva(); if (r) this.confirmar(r); }


  pedirCancelacion(r: ReservaResponse): void {
    this.cancelError.set('');
    this.showCancelConfirm.set(r);
    this.detailReserva.set(null);
  }

  cerrarCancelConfirm(): void { this.showCancelConfirm.set(null); }

  confirmarCancelacion(): void {
    const r = this.showCancelConfirm();
    if (!r) return;
    this.cancelando.set(true);
    this.cancelError.set('');

    this.reservaService.cancelar(r.id).subscribe({
      next: updated => {
        this.updateInList(updated);
        this.cancelando.set(false);
        this.showCancelConfirm.set(null);
      },
      error: err => {
        this.cancelError.set(err?.error?.message || 'Error al cancelar la reserva.');
        this.cancelando.set(false);
      }
    });
  }


  abrirEditar(r: ReservaResponse): void {
    this.editForm = {
      checkIn:       r.checkIn,
      checkOut:      r.checkOut,
      adultos:       r.adultos,
      ninos:         r.ninos,
      extrasCodigos: r.extras ? r.extras.map(e => e.codigo) : [],
      pagoEstado:    r.pagoEstado
    };
    this.editError.set('');
    this.editSuccess.set(false);
    this.showEditModal.set(r);
    this.detailReserva.set(null);
  }

  cerrarEditar(): void { this.showEditModal.set(null); }

  extrasParaEdicion(): Extra[] {
    const r = this.showEditModal();
    if (!r) return [];
    const hab = this.habitacionesDisp().find(h => h.id === r.habitacionId);
    return hab
      ? this.extraService.getExtrasDisponibles(hab.amenidades)
      : this.extraService.getAll();
  }

  isExtraEnEdicion(codigo: string): boolean {
    return this.editForm.extrasCodigos.includes(codigo);
  }

  toggleExtraEdicion(codigo: string): void {
    this.editForm.extrasCodigos = this.isExtraEnEdicion(codigo)
      ? this.editForm.extrasCodigos.filter(c => c !== codigo)
      : [...this.editForm.extrasCodigos, codigo];
  }

  guardarEdicion(): void {
    this.editError.set('');
    this.editSuccess.set(false);
    const r = this.showEditModal();
    if (!r) return;

    if (!this.editForm.checkIn || !this.editForm.checkOut) {
      this.editError.set('Las fechas son obligatorias.'); return;
    }
    if (this.editForm.checkOut <= this.editForm.checkIn) {
      this.editError.set('El check-out debe ser posterior al check-in.'); return;
    }

    this.guardando.set(true);
    this.reservaService.editar(r.id, this.editForm).subscribe({
      next: updated => {
        this.updateInList(updated);
        this.editSuccess.set(true);
        this.guardando.set(false);
        setTimeout(() => this.cerrarEditar(), 1500);
      },
      error: err => {
        this.editError.set(err?.error?.message || 'Error al guardar los cambios.');
        this.guardando.set(false);
      }
    });
  }


  abrirNuevaReserva(): void {
    // ✅ FIX 3: usar toLocalDateString para que las fechas default sean correctas en Peru
    const d1 = new Date(); d1.setDate(d1.getDate() + 1);
    const d2 = new Date(); d2.setDate(d2.getDate() + 2);
    this.nuevaForm = {
      checkIn:  toLocalDateString(d1),
      checkOut: toLocalDateString(d2),
      adultos: 1, ninos: 0, pagoEstado: 'PENDIENTE',
      habitacionId: null, extrasCodigos: [], huespedes: []
    };
    this.habSeleccionada.set(null);
    this.habitacionesDisp.set([]);
    this.adminError.set(''); this.adminSuccess.set(null);
    this.activeHuesped.set(0);
    this.wizardStep.set('fechas');
    this.showNuevaModal.set(true);
  }

  cerrarNuevaReserva(): void { this.showNuevaModal.set(false); }

  buscarHabitaciones(): void {
    this.adminError.set('');
    if (!this.nuevaForm.checkIn || !this.nuevaForm.checkOut) { this.adminError.set('Selecciona las fechas.'); return; }
    if (this.nuevaForm.checkOut <= this.nuevaForm.checkIn) { this.adminError.set('El check-out debe ser posterior.'); return; }
    this.buscandoHabs.set(true);
    this.habitacionService.buscarDisponibles({
      checkIn: this.nuevaForm.checkIn, checkOut: this.nuevaForm.checkOut,
      adultos: this.nuevaForm.adultos, ninos: this.nuevaForm.ninos
    }).subscribe({
      next: list => { this.habitacionesDisp.set(list); this.buscandoHabs.set(false); this.wizardStep.set('habitacion'); },
      error: err  => { this.adminError.set(err?.error?.message || 'Error.'); this.buscandoHabs.set(false); }
    });
  }

  seleccionarHab(h: Habitacion): void {
    this.habSeleccionada.set(h);
    this.nuevaForm.habitacionId = h.id;
    this.nuevaForm.extrasCodigos = [];
    this.adminError.set('');
  }

  isExtraSeleccionado(codigo: string): boolean { return this.nuevaForm.extrasCodigos.includes(codigo); }

  toggleExtraNueva(codigo: string): void {
    this.nuevaForm.extrasCodigos = this.isExtraSeleccionado(codigo)
      ? this.nuevaForm.extrasCodigos.filter(c => c !== codigo)
      : [...this.nuevaForm.extrasCodigos, codigo];
  }

  irAHuesped(): void {
    if (!this.nuevaForm.habitacionId) { this.adminError.set('Selecciona una habitación.'); return; }
    this.adminError.set('');
    this.nuevaForm.huespedes = Array.from({ length: this.nuevaForm.adultos }, (_, i) => ({
      nombre: '', apellido: '', tipo: i === 0 ? 'titular' : 'acompanante',
      documentoTipo: 'DNI', documento: '', edad: null,
      sexo: '', nacionalidad: 'Peruana', email: '', codigoPais: '+51', telefono: '', peticionEspecial: ''
    }));
    this.activeHuesped.set(0);
    this.wizardStep.set('huesped');
  }

  irAResumen(): void {
    this.adminError.set('');
    const t = this.nuevaForm.huespedes[0];
    if (!t?.nombre?.trim() || !t?.apellido?.trim()) {
      this.adminError.set('El nombre y apellido del titular son obligatorios.'); return;
    }
    this.wizardStep.set('resumen');
  }

  crearReservaAdmin(): void {
    this.adminError.set(''); this.creandoAdmin.set(true);
    this.reservaService.crearReservaAdmin({
      checkIn: this.nuevaForm.checkIn, checkOut: this.nuevaForm.checkOut,
      adultos: this.nuevaForm.adultos, ninos: this.nuevaForm.ninos,
      habitacionId: this.nuevaForm.habitacionId!, huespedes: this.nuevaForm.huespedes,
      extrasCodigos: this.nuevaForm.extrasCodigos, pagoEstado: this.nuevaForm.pagoEstado
    }).subscribe({
      next: res => { this.adminSuccess.set(res); this.creandoAdmin.set(false); this.load(); },
      error: err => { this.adminError.set(err?.error?.message || 'Error al crear.'); this.creandoAdmin.set(false); }
    });
  }


  private updateInList(updated: ReservaResponse): void {
    this.allReservas.update(list => list.map(x => x.id === updated.id ? updated : x));
    this.applyFilter();
  }

  getStepNum(): number {
    const map: Record<WizardStep, number> = { fechas: 1, habitacion: 2, huesped: 3, resumen: 4 };
    return map[this.wizardStep()];
  }

  tipoLabel(tipo: string): string {
    const m: Record<string, string> = {
      simple: 'Simple', doble: 'Doble', matrimonial: 'Matrimonial', triple: 'Triple', cuadruple: 'Cuádruple'
    };
    return m[tipo] || tipo;
  }

  badgeClass(estado: string): string {
    const m: Record<string, string> = {
      pendiente: 'badge-pendiente', confirmada: 'badge-confirmada', cancelada: 'badge-cancelada'
    };
    return m[estado] || '';
  }

  volverAFechas(): void     { this.wizardStep.set('fechas'); }
  volverAHabitacion(): void { this.wizardStep.set('habitacion'); }
  volverAHuesped(): void    { this.wizardStep.set('huesped'); }
  setActiveHuesped(i: number): void { this.activeHuesped.set(i); }
}
