import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HabitacionService } from '../../core/services/habitacion.service';
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
  habitaciones = signal<Habitacion[]>([]);
  loading      = signal(true);
  editHab      = signal<Habitacion | null>(null);
  saving       = signal(false);
  editError    = signal('');
  editOk       = signal(false);

  // Estados para imágenes
  uploading = signal<{ [key: number]: boolean }>({});
  deleting = signal<{ [key: number]: boolean }>({});
  selectedRoomForImages = signal<Habitacion | null>(null); // Para el modal de imágenes

  editForm = { nombre: '', precioBase: 0, estado: '' };

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

  constructor(private habitacionService: HabitacionService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.habitacionService.findAll().subscribe({
      next: list => {
        this.habitaciones.set(list);
        this.loading.set(false);
      },
      error: ()  => this.loading.set(false)
    });
  }

  // ==================== MÉTODOS PARA IMÁGENES ====================

  abrirModalImagenes(h: Habitacion): void {
    this.selectedRoomForImages.set(h);
  }

  cerrarModalImagenes(): void {
    this.selectedRoomForImages.set(null);
  }

  async subirImagen(event: Event, habitacionId: number): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validaciones
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert('La imagen no puede superar 15MB');
      return;
    }

    this.uploading.update(prev => ({ ...prev, [habitacionId]: true }));

    try {
      const result = await this.habitacionService.subirImagen(habitacionId, file).toPromise();

      // Actualizar la habitación en la lista
      this.habitaciones.update(list =>
        list.map(h => h.id === habitacionId
          ? { ...h, imagenes: result!.imagenes }
          : h
        )
      );

      // Si el modal está abierto, actualizar también la selección
      const selected = this.selectedRoomForImages();
      if (selected?.id === habitacionId) {
        this.selectedRoomForImages.set({ ...selected, imagenes: result!.imagenes });
      }

      alert(' Imagen subida correctamente');

    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert(' Error al subir la imagen');
    } finally {
      this.uploading.update(prev => ({ ...prev, [habitacionId]: false }));
      input.value = '';
    }
  }

  async eliminarImagen(habitacionId: number, imageUrl: string): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar esta imagen?')) return;

    this.deleting.update(prev => ({ ...prev, [habitacionId]: true }));

    try {
      const result = await this.habitacionService.eliminarImagen(habitacionId, imageUrl).toPromise();

      // Actualizar la habitación
      this.habitaciones.update(list =>
        list.map(h => h.id === habitacionId
          ? { ...h, imagenes: result!.imagenes }
          : h
        )
      );

      // Actualizar modal si está abierto
      const selected = this.selectedRoomForImages();
      if (selected?.id === habitacionId) {
        this.selectedRoomForImages.set({ ...selected, imagenes: result!.imagenes });
      }

      alert(' Imagen eliminada');

    } catch (error) {
      console.error('Error eliminando imagen:', error);
      alert(' Error al eliminar la imagen');
    } finally {
      this.deleting.update(prev => ({ ...prev, [habitacionId]: false }));
    }
  }

  // ==================== MÉTODOS EXISTENTES ====================

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

  openEdit(h: Habitacion): void {
    this.editHab.set(h);
    this.editForm = { nombre: h.nombre, precioBase: h.precioBase, estado: h.estado };
    this.editError.set('');
    this.editOk.set(false);
  }

  closeEdit(): void { this.editHab.set(null); }

  saveEdit(): void {
    this.editError.set('');
    this.editOk.set(false);
    if (!this.editForm.nombre.trim()) {
      this.editError.set('El nombre no puede estar vacío.');
      return;
    }
    this.saving.set(true);
    this.habitacionService.update(this.editHab()!.id, this.editForm as any).subscribe({
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

  badgeClass(estado: string): string {
    const map: Record<string, string> = {
      libre: 'badge-libre', pendiente: 'badge-pendiente',
      ocupada: 'badge-ocupada', mantenimiento: 'badge-mant'
    };
    return map[estado] || '';
  }
}
