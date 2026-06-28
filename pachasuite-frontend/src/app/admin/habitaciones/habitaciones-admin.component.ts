import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HabitacionService, HabitacionCreateBody } from '../../core/services/habitacion.service';
import { AdminSidebarComponent } from '../../shared/components/admin-sidebar/admin-sidebar.component';
import { Habitacion } from '../../core/models/models';

export interface AmenidadDef { key: string; label: string; icon: string; }

@Component({
  selector: 'app-habitaciones-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminSidebarComponent],
  templateUrl: './habitaciones-admin.component.html',
  styleUrls: ['./habitaciones-admin.component.scss']
})
export class HabitacionesAdminComponent implements OnInit {
  habitaciones       = signal<Habitacion[]>([]);
  loading            = signal(true);
  saving             = signal(false);

  // ── Modal editar ──
  editHab            = signal<Habitacion | null>(null);
  editError          = signal('');
  editOk             = signal(false);
  editForm: { nombre: string; precioBase: number; estado: 'libre' | 'pendiente' | 'ocupada' | 'mantenimiento'; camas: string; sizeM2: number } = {
    nombre: '', precioBase: 0, estado: 'libre', camas: '', sizeM2: 0
  };

  // ── Modal crear ──
  showCreate         = signal(false);
  createError        = signal('');
  createOk           = signal(false);
  createForm: HabitacionCreateBody = {
    numero: '', nombre: '', tipo: 'simple',
    capacidad: 1, precioBase: 0, camas: '', sizeM2: 0
  };

  // ── Modal imágenes ──
  selectedRoomForImages = signal<Habitacion | null>(null);
  uploading          = signal<{ [key: number]: boolean }>({});
  deleting           = signal<{ [key: number]: boolean }>({});

  // ── Eliminar ──
  deletingRoom       = signal<{ [key: number]: boolean }>({});

  amenidadesDef: AmenidadDef[] = [
    { key: 'internet',     label: 'Internet',      icon: 'fa-wifi'     },
    { key: 'cable',        label: 'Cable/Netflix', icon: 'fa-tv'       },
    { key: 'banioPrivado', label: 'Baño privado',  icon: 'fa-bath'     },
    { key: 'buffetAndino', label: 'Buffet Andino', icon: 'fa-utensils' },
    { key: 'cochera',      label: 'Cochera',       icon: 'fa-car'      },
    { key: 'spa',          label: 'Spa',           icon: 'fa-spa'      }
  ];

  estados = [
    { val: 'libre',         label: 'Libre'         },
    { val: 'pendiente',     label: 'Pendiente'     },
    { val: 'ocupada',       label: 'Ocupada'       },
    { val: 'mantenimiento', label: 'Mantenimiento' }
  ];

  tipos = [
    { val: 'simple',      label: 'Simple'      },
    { val: 'doble',       label: 'Doble'       },
    { val: 'matrimonial', label: 'Matrimonial' },
    { val: 'triple',      label: 'Triple'      },
    { val: 'cuadruple',   label: 'Cuádruple'   }
  ];

  constructor(private habitacionService: HabitacionService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.habitacionService.findAll().subscribe({
      next: list => { this.habitaciones.set(list); this.loading.set(false); },
      error: ()  =>   this.loading.set(false)
    });
  }

  // ═══════════════════════════════════════
  // CREAR
  // ═══════════════════════════════════════

  openCreate(): void {
    this.createForm = { numero: '', nombre: '', tipo: 'simple', capacidad: 1, precioBase: 0, camas: '', sizeM2: 0 };
    this.createError.set('');
    this.createOk.set(false);
    this.showCreate.set(true);
  }

  closeCreate(): void { this.showCreate.set(false); }

  saveCreate(): void {
    this.createError.set('');
    if (!this.createForm.numero.trim()) { this.createError.set('El número es obligatorio.'); return; }
    if (!this.createForm.nombre.trim()) { this.createError.set('El nombre es obligatorio.'); return; }
    if (!this.createForm.precioBase || this.createForm.precioBase <= 0) {
      this.createError.set('El precio debe ser mayor a 0.'); return;
    }

    this.saving.set(true);
    this.habitacionService.create(this.createForm).subscribe({
      next: created => {
        this.habitaciones.update(list => [...list, created]);
        this.createOk.set(true);
        this.saving.set(false);
        setTimeout(() => this.closeCreate(), 1200);
      },
      error: err => {
        this.createError.set(err?.error?.message || 'Error al crear la habitación.');
        this.saving.set(false);
      }
    });
  }

  // ═══════════════════════════════════════
  // EDITAR
  // ═══════════════════════════════════════

  openEdit(h: Habitacion): void {
    this.editHab.set(h);
    this.editForm = {
      nombre:     h.nombre,
      precioBase: h.precioBase,
      estado:     h.estado as 'libre' | 'pendiente' | 'ocupada' | 'mantenimiento',
      camas:      h.camas  ?? '',
      sizeM2:     h.sizeM2 ?? 0
    };
    this.editError.set('');
    this.editOk.set(false);
  }

  closeEdit(): void { this.editHab.set(null); }

  saveEdit(): void {
    this.editError.set('');
    this.editOk.set(false);
    if (!this.editForm.nombre.trim()) { this.editError.set('El nombre no puede estar vacío.'); return; }

    this.saving.set(true);
    this.habitacionService.update(this.editHab()!.id, this.editForm).subscribe({
      next: saved => {
        this.habitaciones.update(list => list.map(x => x.id === saved.id ? saved : x));
        this.editOk.set(true);
        this.saving.set(false);
        setTimeout(() => this.closeEdit(), 1200);
      },
      error: err => {
        this.editError.set(err?.error?.message || 'Error al guardar.');
        this.saving.set(false);
      }
    });
  }

  // ═══════════════════════════════════════
  // ELIMINAR
  // ═══════════════════════════════════════

  eliminarHabitacion(h: Habitacion): void {
    if (!confirm(`¿Eliminar "${h.nombre}" (Nº ${h.numero})? Esta acción no se puede deshacer.`)) return;

    this.deletingRoom.update(prev => ({ ...prev, [h.id]: true }));
    this.habitacionService.delete(h.id).subscribe({
      next: () => {
        this.habitaciones.update(list => list.filter(x => x.id !== h.id));
        this.deletingRoom.update(prev => ({ ...prev, [h.id]: false }));
      },
      error: err => {
        alert(err?.error?.message || 'Error al eliminar la habitación.');
        this.deletingRoom.update(prev => ({ ...prev, [h.id]: false }));
      }
    });
  }

  // ═══════════════════════════════════════
  // IMÁGENES
  // ═══════════════════════════════════════

  abrirModalImagenes(h: Habitacion): void { this.selectedRoomForImages.set(h); }
  cerrarModalImagenes(): void            { this.selectedRoomForImages.set(null); }

  async subirImagen(event: Event, habitacionId: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Solo se permiten imágenes'); return; }
    if (file.size > 15 * 1024 * 1024)   { alert('La imagen no puede superar 15MB'); return; }

    this.uploading.update(prev => ({ ...prev, [habitacionId]: true }));
    try {
      const result = await this.habitacionService.subirImagen(habitacionId, file).toPromise();
      this.habitaciones.update(list =>
        list.map(h => h.id === habitacionId ? { ...h, imagenes: result!.imagenes } : h)
      );
      const selected = this.selectedRoomForImages();
      if (selected?.id === habitacionId) {
        this.selectedRoomForImages.set({ ...selected, imagenes: result!.imagenes });
      }
    } catch { alert('Error al subir la imagen'); }
    finally {
      this.uploading.update(prev => ({ ...prev, [habitacionId]: false }));
      input.value = '';
    }
  }

  async eliminarImagen(habitacionId: number, imageUrl: string): Promise<void> {
    if (!confirm('¿Eliminar esta imagen?')) return;
    this.deleting.update(prev => ({ ...prev, [habitacionId]: true }));
    try {
      const result = await this.habitacionService.eliminarImagen(habitacionId, imageUrl).toPromise();
      this.habitaciones.update(list =>
        list.map(h => h.id === habitacionId ? { ...h, imagenes: result!.imagenes } : h)
      );
      const selected = this.selectedRoomForImages();
      if (selected?.id === habitacionId) {
        this.selectedRoomForImages.set({ ...selected, imagenes: result!.imagenes });
      }
    } catch { alert('Error al eliminar la imagen'); }
    finally { this.deleting.update(prev => ({ ...prev, [habitacionId]: false })); }
  }

  // ═══════════════════════════════════════
  // AMENIDADES / ESTADO
  // ═══════════════════════════════════════

  toggleAmenidad(h: Habitacion, key: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const updated = { ...h.amenidades, [key]: checked };
    this.habitacionService.updateAmenidades(h.id, updated).subscribe({
      next: saved => this.habitaciones.update(list => list.map(x => x.id === saved.id ? saved : x)),
      error: ()   => { (event.target as HTMLInputElement).checked = !checked; }
    });
  }

  cambiarEstado(h: Habitacion, estado: string): void {
    this.habitacionService.update(h.id, { nombre: h.nombre, precioBase: h.precioBase, estado } as any).subscribe({
      next: saved => this.habitaciones.update(list => list.map(x => x.id === saved.id ? saved : x))
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
