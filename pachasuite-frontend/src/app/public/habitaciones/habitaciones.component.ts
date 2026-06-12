import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HabitacionService } from '../../core/services/habitacion.service';
import { ReservaService } from '../../core/services/reserva.service';
import { ExtraService } from '../../core/services/extra.service';
import { RoomCarouselComponent } from '../../shared/components/room-carousel/room-carousel.component';
import { Habitacion, Extra } from '../../core/models/models';

@Component({
  selector: 'app-habitaciones',
  standalone: true,
  imports: [CommonModule, RouterLink, RoomCarouselComponent],
  templateUrl: './habitaciones.component.html',
  styleUrls: ['./habitaciones.component.scss']
})
export class HabitacionesComponent implements OnInit {

  habitaciones   = signal<Habitacion[]>([]);
  loading        = signal(true);
  errorMsg       = signal('');
  selectedId     = signal<number | null>(null);
  selectedExtras = signal<string[]>([]);

  busqueda = computed(() => this.reservaService.wizardState().busqueda);
  noches   = computed(() => this.reservaService.calcularNoches());

  steps = [
    { num: 1, label: 'Habitación' },
    { num: 2, label: 'Huéspedes'  },
    { num: 3, label: 'Verificar'  },
    { num: 4, label: 'Confirmar'  }
  ];

  constructor(
    private habitacionService: HabitacionService,
    private reservaService:    ReservaService,
    private extraService:      ExtraService,
    private router:            Router
  ) {}

  ngOnInit(): void {
    const b = this.busqueda();
    if (!b) { this.router.navigate(['/']); return; }
    this.cargar(b);
  }

  cargar(b: any): void {
    this.loading.set(true);
    this.habitacionService.buscarDisponibles(b).subscribe({
      next: list => { this.habitaciones.set(list); this.loading.set(false); },
      error: err  => {
        this.errorMsg.set(err?.error?.message || 'Error al buscar habitaciones.');
        this.loading.set(false);
      }
    });
  }

  expandir(h: Habitacion): void {
    this.selectedId.set(h.id);
    this.selectedExtras.set([]);
  }

  getExtras(h: Habitacion): Extra[] {
    return this.extraService.getExtrasDisponibles(h.amenidades);
  }

  toggleExtra(codigo: string): void {
    this.selectedExtras.update(arr =>
      arr.includes(codigo) ? arr.filter(c => c !== codigo) : [...arr, codigo]);
  }

  isExtraSelected(codigo: string): boolean {
    return this.selectedExtras().includes(codigo);
  }

  calcPrecio(h: Habitacion): number {
    let extra = 0;
    if (this.selectedId() === h.id) {
      this.extraService.getBycodigos(this.selectedExtras())
        .forEach(e => extra += e.precioNoche);
    }
    return h.precioBase + extra;
  }

  seleccionar(h: Habitacion): void {
    this.reservaService.setHabitacion(h, this.selectedExtras());
    this.router.navigate(['/huespedes']);
  }

  goBack(): void { this.router.navigate(['/']); }

  tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      simple: 'Simple', doble: 'Doble', matrimonial: 'Matrimonial',
      triple: 'Triple', cuadruple: 'Cuádruple'
    };
    return map[tipo] || tipo;
  }

  /**
   * Retorna las imágenes reales de la habitación.
   * Si la habitación no tiene imágenes definidas, usa una imagen de Unsplash como fallback.
   */
  getImagenes(h: Habitacion): string[] {
    if (h.imagenes && h.imagenes.length > 0) {
      return h.imagenes;
    }
    // Fallback por tipo de habitación
    const fallbacks: Record<string, string[]> = {
      simple:      ['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'],
      doble:       ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80'],
      matrimonial: ['https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&q=80'],
      triple:      ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80'],
      cuadruple:   ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80']
    };
    return fallbacks[h.tipo] || fallbacks['simple'];
  }
}
