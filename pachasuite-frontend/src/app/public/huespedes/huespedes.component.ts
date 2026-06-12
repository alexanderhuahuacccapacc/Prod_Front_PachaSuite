import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ReservaService } from '../../core/services/reserva.service';
import { ExtraService } from '../../core/services/extra.service';
import { HuespedForm } from '../../core/models/models';
import { ReCaptchaV3Service } from 'ng-recaptcha';

@Component({
  selector: 'app-huespedes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  providers: [ReCaptchaV3Service],
  templateUrl: './huespedes.component.html',
  styleUrls: ['./huespedes.component.scss']
})
export class HuespedesComponent implements OnInit {

  // ✅ Solo EMAIL, eliminado WhatsApp
  steps = [
    { num: 1, label: 'Habitación' },
    { num: 2, label: 'Huéspedes' },
    { num: 3, label: 'Verificar' },
    { num: 4, label: 'Confirmar' }
  ];

  huespedes      = signal<HuespedForm[]>([]);
  activeGuest    = signal(0);
  showModal      = signal(false);
  codigoEnviado  = signal(false);
  enviando       = signal(false);
  creando        = signal(false);
  formError      = signal('');
  codigoError    = signal('');
  digits         = signal<string[]>(['', '', '', '', '', '']);

  // Computeds
  busqueda       = computed(() => this.reservaService.wizardState().busqueda);
  habitacion     = computed(() => this.reservaService.wizardState().habitacion);
  extrasSelected = computed(() => this.reservaService.wizardState().extrasSeleccionados);
  emailTitular   = computed(() => this.reservaService.wizardState().emailTitular);
  noches         = computed(() => this.reservaService.calcularNoches());
  extrasInfo     = computed(() => this.extraService.getBycodigos(this.extrasSelected()));

  emailParaEnvio = computed(() => this.huespedes()[0]?.email || '');

  subtotal = computed(() => {
    const h = this.habitacion();
    if (!h) return 0;
    const extraSum = this.extrasInfo().reduce((a, e) => a + e.precioNoche, 0);
    return (h.precioBase + extraSum) * this.noches();
  });

  impuestos      = computed(() => Math.round(this.subtotal() * 0.18 * 100) / 100);
  total          = computed(() => this.subtotal() + this.impuestos());
  codigoCompleto = computed(() => this.digits().filter(d => d !== '').length);

  constructor(
    private reservaService: ReservaService,
    private extraService:   ExtraService,
    private router:         Router,
    private recaptcha:      ReCaptchaV3Service
  ) {}

  ngOnInit(): void {
    if (!this.habitacion()) {
      this.router.navigate(['/']);
      return;
    }
    const adultos = this.busqueda()?.adultos ?? 1;
    const forms: HuespedForm[] = Array.from({ length: adultos }, (_, i) => ({
      nombre: '', apellido: '', tipo: i === 0 ? 'titular' : 'acompanante',
      documentoTipo: 'DNI', documento: '', edad: null,
      sexo: '', nacionalidad: 'Peruana', email: '',
      codigoPais: '+51', telefono: '', peticionEspecial: ''
    }));
    this.huespedes.set(forms);
  }

  syncEmail(email: string): void {
    this.reservaService.setHuespedes(this.huespedes(), email);
  }

  getInitial(i: number): string {
    const h = this.huespedes()[i];
    return h?.nombre ? h.nombre.charAt(0).toUpperCase() : (i + 1).toString();
  }

  abrirVerificacion(): void {
    this.formError.set('');
    const h0 = this.huespedes()[0];

    if (!h0.nombre?.trim() || !h0.apellido?.trim()) {
      this.formError.set('El nombre y apellido del titular son obligatorios.');
      return;
    }
    if (!h0.email?.trim() || !h0.email.includes('@')) {
      this.formError.set('El email del titular es obligatorio y debe ser válido.');
      return;
    }

    this.recaptcha.execute('verificacion').subscribe(token => {
      this.reservaService.setHuespedes(this.huespedes(), h0.email);
      this.reservaService.setCaptchaToken(token);
      this.digits.set(['', '', '', '', '', '']);
      this.codigoError.set('');
      this.codigoEnviado.set(false);
      this.showModal.set(true);
    });
  }

  cerrarModal(): void {
    this.showModal.set(false);
  }

  // ✅ Enviar código SOLO por email
  enviarCodigo(): void {
    const h0 = this.huespedes()[0];
    const email = h0?.email?.trim();
    const nombre = `${h0.nombre} ${h0.apellido}`.trim();

    if (!email) {
      this.codigoError.set('El email es obligatorio.');
      return;
    }

    this.enviando.set(true);
    this.codigoError.set('');

    this.reservaService.enviarCodigo(email, nombre).subscribe({
      next: () => {
        this.codigoEnviado.set(true);
        this.enviando.set(false);
      },
      error: (err) => {
        this.codigoError.set(
          err?.error?.message || 'Error al enviar el código. Intenta de nuevo.'
        );
        this.enviando.set(false);
      }
    });
  }

  onDigit(event: Event, idx: number): void {
    const val = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1);
    const arr = [...this.digits()];
    arr[idx] = val;
    this.digits.set(arr);
    if (val && idx < 5) {
      document.getElementById(`digit-${idx + 1}`)?.focus();
    }
  }

  onKeydown(event: KeyboardEvent, idx: number): void {
    if (event.key === 'Backspace' && !this.digits()[idx] && idx > 0) {
      document.getElementById(`digit-${idx - 1}`)?.focus();
    }
  }

  // ✅ Confirmar reserva - solo email
  confirmarReserva(): void {
    const codigo = this.digits().join('');
    if (codigo.length !== 6) {
      this.codigoError.set('Ingresa los 6 dígitos.');
      return;
    }

    this.creando.set(true);
    this.codigoError.set('');

    const state = this.reservaService.wizardState();
    const emailTitular = state.emailTitular;

    this.reservaService.crearReserva({
      checkIn:             state.busqueda!.checkIn,
      checkOut:            state.busqueda!.checkOut,
      adultos:             state.busqueda!.adultos,
      ninos:               state.busqueda!.ninos,
      habitacionId:        state.habitacion!.id,
      huespedes:           state.huespedes,
      extrasCodigos:       state.extrasSeleccionados,
      codigoVerificacion:  codigo,
      // ❌ Ya no se usa contactoVerificacion
      emailTitular:        emailTitular
    } as any).subscribe({
      next: res => {
        this.reservaService.resetWizard();
        this.router.navigate(['/confirmacion', res.codigo]);
      },
      error: err => {
        this.codigoError.set(err?.error?.message || 'Error al crear la reserva.');
        this.creando.set(false);
      }
    });
  }
}
