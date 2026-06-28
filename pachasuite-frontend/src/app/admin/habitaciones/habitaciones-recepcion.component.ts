import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HabitacionService } from '../../core/services/habitacion.service';
import { AdminSidebarComponent } from '../../shared/components/admin-sidebar/admin-sidebar.component';
import { Habitacion } from '../../core/models/models';

export interface AmenidadDef { key: string; label: string; icon: string; }

@Component({
  selector: 'app-habitaciones-recepcion',
  standalone: true,
  imports: [CommonModule, AdminSidebarComponent],
  templateUrl: './habitaciones-recepcion.component.html',
  styleUrls: ['./habitaciones-admin.component.scss']
})
export class HabitacionesRecepcionComponent implements OnInit {
  habitaciones = signal<Habitacion[]>([]);
  loading      = signal(true);

  amenidadesDef: AmenidadDef[] = [
    { key: 'internet',     label: 'Internet',      icon: 'fa-wifi'     },
    { key: 'cable',        label: 'Cable/Netflix', icon: 'fa-tv'       },
    { key: 'banioPrivado', label: 'Baño privado',  icon: 'fa-bath'     },
    { key: 'buffetAndino', label: 'Buffet Andino', icon: 'fa-utensils' },
    { key: 'cochera',      label: 'Cochera',       icon: 'fa-car'      },
    { key: 'spa',          label: 'Spa',           icon: 'fa-spa'      }
  ];

  constructor(private habitacionService: HabitacionService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.habitacionService.findAll().subscribe({
      next: list => { this.habitaciones.set(list); this.loading.set(false); },
      error: ()  =>   this.loading.set(false)
    });
  }

  // Único campo editable por recepcionista: las amenidades (toggle).
  toggleAmenidad(h: Habitacion, key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const updated = { ...h.amenidades, [key]: checked };
    this.habitacionService.updateAmenidades(h.id, updated).subscribe({
      next: saved => this.habitaciones.update(list => list.map(x => x.id === saved.id ? saved : x)),
      error: ()   => { (event.target as HTMLInputElement).checked = !checked; }
    });
  }

  badgeClass(estado: string): string {
    const map: Record<string, string> = {
      libre: 'badge-libre', pendiente: 'badge-pendiente',
      ocupada: 'badge-ocupada', mantenimiento: 'badge-mant'
    };
    return map[estado] || '';
  }
}
