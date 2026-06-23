import { Component, OnInit, OnDestroy, HostListener, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ReservaService } from '../../core/services/reserva.service';
import { HabitacionService } from '../../core/services/habitacion.service';
import { ContactoService } from '../../core/services/contacto.service';
import { ContactForm, BusquedaParams } from '../../core/models/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  scrolled = signal(false);
  error    = signal('');
  today    = new Date().toISOString().split('T')[0];

  form = { checkIn: '', checkOut: '', adultos: 2, ninos: 0 };

  menuOpen = false;
  captchaChecked = false;
  contactSuccess  = signal(false);
  contactError    = signal('');
  enviandoContacto = signal(false);
  lightboxImg     = signal<any>(null);

  contactForm: ContactForm = {
    nombre: '', email: '', telefono: '', asunto: '', mensaje: ''
  };

  features = [
    { icon: 'fa-wifi',     title: 'Wi-Fi Gratis',   desc: 'Conexión de alta velocidad en todas las suites' },
    { icon: 'fa-utensils', title: 'Buffet Andino',  desc: 'Desayuno con productos típicos del altiplano'   },
    { icon: 'fa-spa',      title: 'Spa & Wellness', desc: 'Relájate con tratamientos andinos tradicionales' },
    { icon: 'fa-car',      title: 'Cochera Segura', desc: 'Estacionamiento cubierto disponible 24/7'        }
  ];

  services = [
    { icon: 'fa-spa',                title: 'Spa Andino',        desc: 'Tratamientos ancestrales con productos naturales' },
    { icon: 'fa-mountain',           title: 'City Tours',        desc: 'Excursiones al lago Titicaca y Sillustani'        },
    { icon: 'fa-truck-fast',         title: 'Traslados',         desc: 'Recogida y transporte al aeropuerto'              },
    { icon: 'fa-champagne-glasses',  title: 'Room Service',      desc: 'Servicio a la habitación 24h'                     },
    { icon: 'fa-wifi',               title: 'WiFi Alta Velocidad', desc: 'Conexión estable en todo el hotel'              },
    { icon: 'fa-clock',              title: 'Check-in 24/7',     desc: 'Recepción abierta todas las horas'                }
  ];

  galleryImages = [
    { src: 'assets/images/gallery/habitacion1.jpg', alt: 'Suite Deluxe'     },
    { src: 'assets/images/gallery/habitacion2.jpg', alt: 'Vista a la ciudad' },
    { src: 'assets/images/gallery/habitacion3.jpg', alt: 'Lobby principal'  },
    { src: 'assets/images/gallery/comedor.jpg',     alt: 'Restaurante'      },
    { src: 'assets/images/gallery/spa.jpg',         alt: 'Área de spa'      },
    { src: 'assets/images/gallery/terraza.jpg',     alt: 'Terraza mirador'  }
  ];

  habitaciones: any[] = [];

  // ── Carrusel habitaciones ────────────────────────────────────
  currentSlide = signal(0);
  @ViewChild('carouselRef') carouselRef!: ElementRef;

  // ── Carrusel servicios 3D ────────────────────────────────────
  currentServiceIndex = signal(0);
  private serviceInterval: any;
  servicePaused = false;

  constructor(
    private reservaService:  ReservaService,
    private contactoService: ContactoService,
    private router:          Router,
    private habitacionService: HabitacionService
  ) {}

  ngOnInit(): void {
    const d1 = new Date(); d1.setDate(d1.getDate() + 1);
    const d2 = new Date(); d2.setDate(d2.getDate() + 2);
    this.form.checkIn  = d1.toISOString().split('T')[0];
    this.form.checkOut = d2.toISOString().split('T')[0];
    this.cargarHabitacionesDestacadas();
    this.startServiceCarousel();
  }

  ngOnDestroy(): void {
    this.stopServiceCarousel();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 40);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  closeMenu(): void {
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  buscar(): void {
    this.error.set('');
    if (!this.captchaChecked) {
      this.error.set('Por favor, confirma que no eres un robot');
      return;
    }
    if (!this.form.checkIn || !this.form.checkOut) {
      this.error.set('Selecciona las fechas de check-in y check-out.');
      return;
    }
    if (this.form.checkOut <= this.form.checkIn) {
      this.error.set('El check-out debe ser posterior al check-in.');
      return;
    }
    this.reservaService.setBusqueda({
      checkIn: this.form.checkIn, checkOut: this.form.checkOut,
      adultos: +this.form.adultos, ninos: +this.form.ninos
    });
    this.router.navigate(['/habitaciones']);
  }

  reservarHabitacion(hab: any): void {
    this.reservaService.setHabitacionSeleccionada(hab);
    this.reservaService.setBusqueda({
      checkIn: this.form.checkIn, checkOut: this.form.checkOut,
      adultos: +this.form.adultos, ninos: +this.form.ninos
    });
    this.router.navigate(['/reservar', hab.id]);
  }

  cargarHabitacionesDestacadas(): void {
    this.habitacionService.listarTodas().subscribe({
      next:  data => { this.habitaciones = data; },
      error: ()   => { this.habitaciones = this.getHabitacionesBackup(); }
    });
  }

  getHabitacionesBackup(): any[] {
    return [
      { id:1, nombre:'Suite Imperial',      tipo:'suite',         sizeM2:45, camas:'1 King',        capacidad:2, precioBase:450, imagenes:['assets/images/rooms/imperial.jpg'],     amenidades:{internet:true,cable:true,minibar:true,jacuzzi:true}  },
      { id:2, nombre:'Habitación Deluxe',   tipo:'deluxe',        sizeM2:35, camas:'1 Queen',       capacidad:2, precioBase:320, imagenes:['assets/images/rooms/deluxe.jpg'],       amenidades:{internet:true,cable:true,minibar:true,jacuzzi:false} },
      { id:3, nombre:'Habitación Familiar', tipo:'familiar',      sizeM2:50, camas:'2 Queen',       capacidad:4, precioBase:520, imagenes:['assets/images/rooms/familiar.jpg'],     amenidades:{internet:true,cable:true,minibar:true,jacuzzi:false} },
      { id:4, nombre:'Suite Presidencial',  tipo:'presidencial',  sizeM2:70, camas:'1 King+1 Queen',capacidad:4, precioBase:750, imagenes:['assets/images/rooms/presidencial.jpg'], amenidades:{internet:true,cable:true,minibar:true,jacuzzi:true}  },
      { id:5, nombre:'Habitación Twin',     tipo:'twin',          sizeM2:30, camas:'2 Single',      capacidad:2, precioBase:250, imagenes:['assets/images/rooms/twin.jpg'],         amenidades:{internet:true,cable:true,minibar:false,jacuzzi:false}},
      { id:6, nombre:'Suite Junior',        tipo:'junior',        sizeM2:40, camas:'1 King',        capacidad:2, precioBase:380, imagenes:['assets/images/rooms/junior.jpg'],       amenidades:{internet:true,cable:true,minibar:true,jacuzzi:false} }
    ];
  }

  openLightbox(img: any): void {
    this.lightboxImg.set(img);
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxImg.set(null);
    document.body.style.overflow = '';
  }

  enviarContacto(): void {
    this.contactError.set('');
    this.contactSuccess.set(false);
    if (!this.contactForm.nombre || !this.contactForm.email || !this.contactForm.mensaje) {
      this.contactError.set('Completa los campos obligatorios: nombre, email y mensaje.');
      setTimeout(() => this.contactError.set(''), 3000);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.contactForm.email)) {
      this.contactError.set('Ingresa un correo electrónico válido.');
      setTimeout(() => this.contactError.set(''), 3000);
      return;
    }
    this.enviandoContacto.set(true);
    this.contactoService.enviar(this.contactForm).subscribe({
      next: () => {
        this.contactSuccess.set(true);
        this.enviandoContacto.set(false);
        this.contactForm = { nombre:'', email:'', telefono:'', asunto:'', mensaje:'' };
        setTimeout(() => this.contactSuccess.set(false), 5000);
      },
      error: () => {
        this.contactError.set('No se pudo enviar el mensaje. Inténtalo de nuevo.');
        this.enviandoContacto.set(false);
        setTimeout(() => this.contactError.set(''), 3000);
      }
    });
  }

  // ── Carrusel habitaciones ────────────────────────────────────
  prevSlide(): void {
    const prev = (this.currentSlide() - 1 + this.habitaciones.length) % this.habitaciones.length;
    this.goToSlide(prev);
  }

  nextSlide(): void {
    const next = (this.currentSlide() + 1) % this.habitaciones.length;
    this.goToSlide(next);
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    const carousel = this.carouselRef?.nativeElement;
    if (!carousel) return;
    const card = carousel.querySelector('.room-card') as HTMLElement;
    if (!card) return;
    carousel.scrollTo({ left: index * (card.offsetWidth + 24), behavior: 'smooth' });
  }

  // ── Carrusel servicios 3D ────────────────────────────────────

  /** Offset circular de la card i respecto a la activa (-2 … +2) */
  getServiceOffset(index: number): number {
    const total = this.services.length;
    let diff = index - this.currentServiceIndex();
    if (diff >  total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  }

  /** Valor absoluto del offset (para usarlo en el template sin Math.abs) */
  absOffset(index: number): number {
    return Math.abs(this.getServiceOffset(index));
  }

  /** Transform CSS 3D según el offset */
  getCardTransform(offset: number): string {
    if (Math.abs(offset) > 2) {
      return 'translateX(0px) translateZ(-500px) rotateY(0deg) scale(0.5)';
    }
    const x       = offset * 260;
    const z       = Math.abs(offset) * -180;
    const rotateY = offset * -35;
    const scale   = 1 - Math.abs(offset) * 0.15;
    return `translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`;
  }

  prevService(): void {
    const total = this.services.length;
    this.currentServiceIndex.set((this.currentServiceIndex() - 1 + total) % total);
  }

  nextService(): void {
    this.currentServiceIndex.set((this.currentServiceIndex() + 1) % this.services.length);
  }

  goToService(index: number): void {
    this.currentServiceIndex.set(index);
  }

  startServiceCarousel(): void {
    this.serviceInterval = setInterval(() => {
      if (!this.servicePaused) this.nextService();
    }, 4000);
  }

  stopServiceCarousel(): void {
    if (this.serviceInterval) clearInterval(this.serviceInterval);
  }
}
