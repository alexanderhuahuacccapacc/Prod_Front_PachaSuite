import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, SlicePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HabitacionService } from '../../core/services/habitacion.service';
import { ReservaService } from '../../core/services/reserva.service';
import { AdminSidebarComponent } from '../../shared/components/admin-sidebar/admin-sidebar.component';
import { Habitacion, ReservaResponse } from '../../core/models/models';
import { ContactoService, MensajeContacto } from '../../core/services/contacto.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, SlicePipe, DecimalPipe, RouterLink, AdminSidebarComponent, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  // ── Habitaciones & Reservas ─────────────────────────────────────
  habitaciones = signal<Habitacion[]>([]);
  reservas = signal<ReservaResponse[]>([]);
  loadingH = signal(true);
  loadingR = signal(true);
  now = new Date();
  tabActiva = 'habitaciones';
  buscarCodigo = '';
  reservaBuscada = signal<ReservaResponse | null>(null);
  buscandoRes = signal(false);
  errorBusqueda = signal('');
  modalBusqueda = signal(false);

  get totalHabs() { return this.habitaciones().length; }
  get libres() { return this.habitaciones().filter(h => h.estado === 'libre').length; }
  get pendientes() { return this.reservas().filter(r => r.estado === 'pendiente').length; }
  get confirmadas() { return this.reservas().filter(r => r.estado === 'confirmada').length; }

  // ── Mensajes de contacto ────────────────────────────────────────
  mensajes = signal<MensajeContacto[]>([]);
  loadingM = signal(false);
  noLeidos = signal(0);
  bandejaAbierta = signal(false);
  mensajeSeleccionado = signal<MensajeContacto | null>(null);
  tabBandeja = signal<'recibidos' | 'respondidos'>('recibidos');
  respondidos = signal<MensajeContacto[]>([]);

  constructor(
    private habitacionService: HabitacionService,
    private reservaService: ReservaService,
    private mensajeService: ContactoService
  ) { }

  ngOnInit(): void {
    this.habitacionService.findAll().subscribe({
      next: list => { this.habitaciones.set(list); this.loadingH.set(false); },
      error: () => this.loadingH.set(false)
    });

    this.reservaService.findAll().subscribe({
      next: (res: any) => {
        const lista = res.content ?? res;
        this.reservas.set(lista);
        this.loadingR.set(false);
      },
      error: () => this.loadingR.set(false)
    });

    this.cargarConteo();
  }

  // ── Bandeja ─────────────────────────────────────────────────────

  toggleBandeja(): void {
    if (this.bandejaAbierta()) {
      this.cerrarBandeja();
    } else {
      this.abrirBandeja();
    }
  }


  abrirBandeja(): void {
    this.bandejaAbierta.set(true);
    this.cargarTab(this.tabBandeja());
  }

  cambiarTab(tab: 'recibidos' | 'respondidos'): void {
    this.tabBandeja.set(tab);
    this.cargarTab(tab);
  }

  private cargarTab(tab: 'recibidos' | 'respondidos'): void {
    this.loadingM.set(true);
    const obs$ = tab === 'respondidos'
      ? this.mensajeService.findRespondidos()
      : this.mensajeService.findAll();

    obs$.subscribe({
      next: list => {
        const ordenados = list.sort((a, b) => {
          if (a.leido !== b.leido) return a.leido ? 1 : -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        this.mensajes.set(ordenados);
        this.loadingM.set(false);
      },
      error: () => this.loadingM.set(false)
    });
  }

  cerrarBandeja(): void {
    this.bandejaAbierta.set(false);
  }

  abrirMensaje(m: MensajeContacto): void {
    this.mensajeSeleccionado.set(m);
    // Marcar como leído si no lo estaba
    if (!m.leido) {
      this.mensajeService.marcarLeido(m.id).subscribe({
        next: updated => {
          // Actualizar la lista local
          this.mensajes.update(list =>
            list.map(item => item.id === updated.id ? updated : item)
          );
          this.cargarConteo();
        }
      });
    }
  }

  cerrarModal(): void {
    this.mensajeSeleccionado.set(null);
  }

  marcarTodos(): void {
    this.mensajeService.marcarTodosLeidos().subscribe({
      next: () => {
        this.mensajes.update(list => list.map(m => ({ ...m, leido: true })));
        this.noLeidos.set(0);
      }
    });
  }

  eliminarMensaje(id: number): void {
    this.mensajeService.eliminar(id).subscribe({
      next: () => {
        this.mensajes.update(list => list.filter(m => m.id !== id));
        this.cerrarModal();
        this.cargarConteo();
      }
    });
  }

  private cargarConteo(): void {
    this.mensajeService.countNoLeidos().subscribe({
      next: count => this.noLeidos.set(count),
      error: () => this.noLeidos.set(0)
    });
  }

  // ── Badges ──────────────────────────────────────────────────────

  badgeH(estado: string): string {
    const map: Record<string, string> = {
      libre: 'badge-libre', pendiente: 'badge-pendiente',
      ocupada: 'badge-ocupada', mantenimiento: 'badge-mant'
    };
    return map[estado] || '';
  }

  badgeR(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'badge-pendiente', confirmada: 'badge-confirmada', cancelada: 'badge-cancelada'
    };
    return map[estado] || '';
  }
  composerAbierto = signal(false);
  composerCuerpo = signal('');
  enviandoResp = signal(false);

  abrirComposer(): void {
    this.composerCuerpo.set('');
    this.composerAbierto.set(true);
  }

  cerrarComposer(): void {
    this.composerAbierto.set(false);
  }

  enviarRespuesta(): void {
    const m = this.mensajeSeleccionado();
    const cuerpo = this.composerCuerpo().trim();
    if (!m || !cuerpo) return;
    this.enviandoResp.set(true);
    this.mensajeService.responder(m.id, cuerpo).subscribe({
      next: () => {
        this.enviandoResp.set(false);
        this.cerrarComposer();
        this.cerrarModal();
        this.mensajes.update(list => list.filter(x => x.id !== m.id));
      },
      error: () => this.enviandoResp.set(false)
    });
  }
  abrirBuscador(): void {
    this.buscarCodigo = '';
    this.reservaBuscada.set(null);
    this.errorBusqueda.set('');
    this.modalBusqueda.set(true);
  }
  buscarPorCodigo(): void {
    const codigo = (this.buscarCodigo || '').trim().toUpperCase();
    if (!codigo) return;

    this.buscandoRes.set(true);
    this.errorBusqueda.set('');
    this.reservaBuscada.set(null);

    this.reservaService.findByCodigo(codigo).subscribe({
      next: (res: any) => {
        this.buscandoRes.set(false);
        this.reservaBuscada.set(res);
        this.errorBusqueda.set('');
      },
      error: () => {
        this.buscandoRes.set(false);
        this.errorBusqueda.set('No se encontró reserva con ese código.');
      }
    });
  }

  cerrarBuscador(): void {
    this.modalBusqueda.set(false);
  }

  estadoReserva(estado: string): string {
    const map: Record<string, string> = {
      pendiente: 'badge-pendiente',
      confirmada: 'badge-confirmada',
      cancelada: 'badge-cancelada',
      finalizada: 'badge-finalizada'
    };
    return map[estado] || 'badge-pendiente';
  }
}
