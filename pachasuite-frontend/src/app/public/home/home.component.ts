import { Component, OnInit, OnDestroy, HostListener, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ReservaService } from '../../core/services/reserva.service';
import { HabitacionService } from '../../core/services/habitacion.service';
import {ContactoService} from '../../core/services/contacto.service';
import {ContactForm, BusquedaParams} from '../../core/models/models';

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

  // Propiedades del menú móvil
  menuOpen = false;

  // Propiedades que faltaban
  captchaChecked = false;
  contactSuccess = signal(false);
  contactError = signal('');
  enviandoContacto = signal(false);
  lightboxImg = signal<any>(null);

  // Formulario de contacto
  contactForm: ContactForm = {
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: ''
  };

  features = [
    { icon:'fa-wifi',        title:'Wi-Fi Gratis',        desc:'Conexión de alta velocidad en todas las suites' },
    { icon:'fa-utensils',    title:'Buffet Andino',       desc:'Desayuno con productos típicos del altiplano'   },
    { icon:'fa-spa',         title:'Spa & Wellness',      desc:'Relájate con tratamientos andinos tradicionales'},
    { icon:'fa-car',         title:'Cochera Segura',      desc:'Estacionamiento cubierto disponible 24/7'       }
  ];

  // Servicios para el carrusel
  services = [
    { icon: 'fa-spa', title: 'Spa Andino', desc: 'Tratamientos ancestrales con productos naturales' },
    { icon: 'fa-mountain', title: 'City Tours', desc: 'Excursiones al lago Titicaca y Sillustani' },
    { icon: 'fa-truck-fast', title: 'Traslados', desc: 'Recogida y transporte al aeropuerto' },
    { icon: 'fa-champagne-glasses', title: 'Room Service', desc: 'Servicio a la habitación 24h' },
    { icon: 'fa-wifi', title: 'WiFi Alta Velocidad', desc: 'Conexión estable en todo el hotel' },
    { icon: 'fa-clock', title: 'Check-in 24/7', desc: 'Recepción abierta todas las horas' }
  ];

  // Imágenes de galería
  galleryImages = [
    { src: 'assets/images/gallery/habitacion1.jpg', alt: 'Suite Deluxe' },
    { src: 'assets/images/gallery/habitacion2.jpg', alt: 'Vista a la ciudad' },
    { src: 'assets/images/gallery/habitacion3.jpg', alt: 'Lobby principal' },
    { src: 'assets/images/gallery/comedor.jpg', alt: 'Restaurante' },
    { src: 'assets/images/gallery/spa.jpg', alt: 'Área de spa' },
    { src: 'assets/images/gallery/terraza.jpg', alt: 'Terraza mirador' }
  ];

  // Habitaciones
  habitaciones: any[] = [];
  currentSlide = signal(0);
  @ViewChild('carouselRef') carouselRef!: ElementRef;

  // Propiedades para el carrusel de servicios
  currentServiceIndex = signal(0);
  get currentService() {
    return this.currentServiceIndex;
  }
  private serviceInterval: any;
  servicePaused = false;

  constructor(
    private reservaService: ReservaService,
    private contactoService: ContactoService,
    private router: Router,
    private habitacionService: HabitacionService
  ) {}

  ngOnInit(): void {
    const d1 = new Date(); d1.setDate(d1.getDate() + 1);
    const d2 = new Date(); d2.setDate(d2.getDate() + 2);
    this.form.checkIn  = d1.toISOString().split('T')[0];
    this.form.checkOut = d2.toISOString().split('T')[0];

    // Cargar habitaciones desde el servicio
    this.cargarHabitaciones();
    this.startServiceCarousel();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 40);
  }

  // Métodos para el menú móvil
  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }

  closeMenu(): void {
    this.menuOpen = false;
    document.body.style.overflow = '';
  }

  // Búsqueda de habitaciones
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
      checkIn:  this.form.checkIn,
      checkOut: this.form.checkOut,
      adultos:  +this.form.adultos,
      ninos:    +this.form.ninos
    });
    this.router.navigate(['/habitaciones']);
  }

  // Reservar habitación específica
  reservarHabitacion(hab: any): void {
    // Guardar la habitación seleccionada en el servicio
    this.reservaService.setHabitacionSeleccionada(hab);
    this.reservaService.setBusqueda({
      checkIn:  this.form.checkIn,
      checkOut: this.form.checkOut,
      adultos:  +this.form.adultos,
      ninos:    +this.form.ninos
    });
    this.router.navigate(['/reservar', hab.id]);
  }

  // Cargar habitaciones desde el servicio
  cargarHabitaciones(): void {
    if (!this.form.checkIn || !this.form.checkOut) return;

    const params: BusquedaParams = {
      checkIn:  this.form.checkIn,
      checkOut: this.form.checkOut,
      adultos:  +this.form.adultos,
      ninos:    +this.form.ninos
    };

    this.habitacionService.buscarDisponibles(params).subscribe({
      next: (data) => {
        this.habitaciones = data;
      },
      error: (err) => {
        console.error('Error cargando habitaciones:', err);
        this.habitaciones = this.getHabitacionesBackup();
      }
    });
  }

  // Datos de respaldo por si falla el API
  getHabitacionesBackup(): any[] {
    return [
      {
        id: 1,
        nombre: 'Suite Imperial',
        tipo: 'suite',
        sizeM2: 45,
        camas: '1 King',
        capacidad: 2,
        precioBase: 450,
        imagenes: ['assets/images/rooms/imperial.jpg'],
        amenidades: { internet: true, cable: true, minibar: true, jacuzzi: true }
      },
      {
        id: 2,
        nombre: 'Habitación Deluxe',
        tipo: 'deluxe',
        sizeM2: 35,
        camas: '1 Queen',
        capacidad: 2,
        precioBase: 320,
        imagenes: ['assets/images/rooms/deluxe.jpg'],
        amenidades: { internet: true, cable: true, minibar: true, jacuzzi: false }
      },
      {
        id: 3,
        nombre: 'Habitación Familiar',
        tipo: 'familiar',
        sizeM2: 50,
        camas: '2 Queen',
        capacidad: 4,
        precioBase: 520,
        imagenes: ['assets/images/rooms/familiar.jpg'],
        amenidades: { internet: true, cable: true, minibar: true, jacuzzi: false }
      },
      {
        id: 4,
        nombre: 'Suite Presidencial',
        tipo: 'presidencial',
        sizeM2: 70,
        camas: '1 King + 1 Queen',
        capacidad: 4,
        precioBase: 750,
        imagenes: ['assets/images/rooms/presidencial.jpg'],
        amenidades: { internet: true, cable: true, minibar: true, jacuzzi: true }
      },
      {
        id: 5,
        nombre: 'Habitación Twin',
        tipo: 'twin',
        sizeM2: 30,
        camas: '2 Single',
        capacidad: 2,
        precioBase: 250,
        imagenes: ['assets/images/rooms/twin.jpg'],
        amenidades: { internet: true, cable: true, minibar: false, jacuzzi: false }
      },
      {
        id: 6,
        nombre: 'Suite Junior',
        tipo: 'junior',
        sizeM2: 40,
        camas: '1 King',
        capacidad: 2,
        precioBase: 380,
        imagenes: ['assets/images/rooms/junior.jpg'],
        amenidades: { internet: true, cable: true, minibar: true, jacuzzi: false }
      }
    ];
  }

  // Lightbox de galería
  openLightbox(img: any): void {
    this.lightboxImg.set(img);
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.lightboxImg.set(null);
    document.body.style.overflow = '';
  }

  // Enviar formulario de contacto
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
        this.contactForm = { nombre: '', email: '', telefono: '', asunto: '', mensaje: '' };
        setTimeout(() => this.contactSuccess.set(false), 5000);
      },
      error: () => {
        this.contactError.set('No se pudo enviar el mensaje. Inténtalo de nuevo.');
        this.enviandoContacto.set(false);
        setTimeout(() => this.contactError.set(''), 3000);
      }
    });
  }

  // Métodos del carrusel de habitaciones
  prevSlide(): void {
    const total = this.habitaciones.length;
    const prev = (this.currentSlide() - 1 + total) % total;
    this.goToSlide(prev);
  }

  nextSlide(): void {
    const total = this.habitaciones.length;
    const next = (this.currentSlide() + 1) % total;
    this.goToSlide(next);
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    const carousel = this.carouselRef?.nativeElement;
    if (!carousel) return;
    const card = carousel.querySelector('.room-card') as HTMLElement;
    if (!card) return;
    const cardWidth = card.offsetWidth + 24; // 24 = gap
    carousel.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
  }

  // ============================================================
  // MÉTODOS DEL CARRUSEL DE SERVICIOS (NUEVOS)
  // ============================================================

  // Obtener el offset circular de una tarjeta respecto a la activa
  getServiceOffset(index: number): number {
    const total = this.services.length;
    const current = this.currentServiceIndex();
    let diff = index - current;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  }

  // Calcular la transformación 3D para cada tarjeta según su offset
  getCardTransform(offset: number): string {
    const absOffset = Math.abs(offset);
    const sign = Math.sign(offset) || 1;

    // Si está muy lejos, ocultar
    if (absOffset > 2) {
      return 'transform: scale(0.5); opacity: 0; pointer-events: none;';
    }

    // Rotación en Y
    const rotateY = -sign * (15 + absOffset * 20);

    // Traslación en Z (profundidad)
    const translateZ = -60 - absOffset * 100;

    // Traslación en X (separación lateral)
    const translateX = sign * (80 + absOffset * 60);

    // Escala
    const scale = 1 - absOffset * 0.15;

    // Opacidad
    const opacity = 1 - absOffset * 0.25;

    return `transform: translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale}); opacity: ${opacity};`;
  }

  // Navegación del carrusel de servicios
  prevService(): void {
    const total = this.services.length;
    this.currentServiceIndex.set((this.currentServiceIndex() - 1 + total) % total);
  }

  nextService(): void {
    const total = this.services.length;
    this.currentServiceIndex.set((this.currentServiceIndex() + 1) % total);
  }

  goToService(index: number): void {
    this.currentServiceIndex.set(index);
  }

  // Iniciar carrusel automático
  startServiceCarousel(): void {
    this.serviceInterval = setInterval(() => {
      if (!this.servicePaused) {
        this.nextService();
      }
    }, 4000);
  }

  // Detener carrusel automático
  stopServiceCarousel(): void {
    if (this.serviceInterval) {
      clearInterval(this.serviceInterval);
    }
  }

  ngOnDestroy(): void {
    this.stopServiceCarousel();
  }
}
