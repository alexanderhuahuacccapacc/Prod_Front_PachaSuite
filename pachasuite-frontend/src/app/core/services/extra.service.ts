import { Injectable } from '@angular/core';
import { Extra } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ExtraService {

  // Lista hardcodeada (coincide con el seed del backend)
  private extras: Extra[] = [
    { id: 1, codigo: 'buffet',  nombre: 'Buffet Andino',  icono: 'fa-utensils', precioNoche: 15 },
    { id: 2, codigo: 'cochera', nombre: 'Cochera',        icono: 'fa-car',      precioNoche: 10 },
    { id: 3, codigo: 'cable',   nombre: 'Cable/Netflix',  icono: 'fa-tv',       precioNoche: 8  },
    { id: 4, codigo: 'spa',     nombre: 'Spa',            icono: 'fa-spa',      precioNoche: 20 },
  ];

  /** Retorna solo extras que NO están incluidos en las amenidades de la habitación */
  getExtrasDisponibles(amenidades: Record<string, boolean>): Extra[] {
    return this.extras.filter(e => {
      if (e.codigo === 'buffet'  && amenidades['buffetAndino']) return false;
      if (e.codigo === 'cochera' && amenidades['cochera'])      return false;
      if (e.codigo === 'cable'   && amenidades['cable'])        return false;
      if (e.codigo === 'spa'     && amenidades['spa'])          return false;
      return true;
    });
  }

  getAll(): Extra[] { return this.extras; }

  getBycodigos(codigos: string[]): Extra[] {
    return this.extras.filter(e => codigos.includes(e.codigo));
  }
}