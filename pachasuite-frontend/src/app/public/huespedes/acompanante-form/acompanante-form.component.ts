import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcompananteForm } from '../../../core/models/models'; // ← nuevo import

@Component({
  selector: 'app-acompanante-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './acompanante-form.component.html',
  styleUrls: ['./acompanante-form.component.scss']
})
export class AcompananteFormComponent {

  @Input() acompanante!: AcompananteForm;  // ← AcompananteForm
  @Input() index!: number;
  @Input() expanded = false;

  @Output() toggle = new EventEmitter<void>();
  @Output() acompananteChange = new EventEmitter<AcompananteForm>(); // ← AcompananteForm

  getInitial(): string {
    return this.acompanante?.nombre
      ? this.acompanante.nombre.charAt(0).toUpperCase()
      : this.index.toString();
  }

  update(field: keyof AcompananteForm, value: any): void {
    this.acompanante = { ...this.acompanante, [field]: value };
    this.acompananteChange.emit(this.acompanante);
  }
}
