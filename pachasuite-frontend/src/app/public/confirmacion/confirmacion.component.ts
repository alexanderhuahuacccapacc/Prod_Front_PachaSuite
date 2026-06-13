import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReservaService } from '../../core/services/reserva.service';
import { ReservaResponse } from '../../core/models/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './confirmacion.component.html',
  styleUrls: ['./confirmacion.component.scss']
})
export class ConfirmacionComponent implements OnInit {
  reserva     = signal<ReservaResponse | null>(null);
  loading     = signal(true);
  enviandoPdf = false;
  pdfEnviado  = false;

  constructor(
    private route:          ActivatedRoute,
    private reservaService: ReservaService,
    private router:         Router,
    private http:           HttpClient
  ) {}

  ngOnInit(): void {
    const codigo = this.route.snapshot.paramMap.get('codigo');
    if (!codigo) { this.router.navigate(['/']); return; }

    this.reservaService.findByCodigo(codigo).subscribe({
      next: r  => { this.reserva.set(r); this.loading.set(false); },
      error: () => this.router.navigate(['/'])
    });
  }

  enviarPdf(): void {
    const r = this.reserva();
    if (!r) return;
    this.enviandoPdf = true;

    this.http.post(
      `${environment.apiUrl}/reservas/${r.codigo}/enviar-pdf`,
      null,
      { params: { email: r.huespedes[0].email } }
    ).subscribe({
      next: () => {
        this.pdfEnviado  = true;
        this.enviandoPdf = false;
        setTimeout(() => this.router.navigate(['/']), 2000);
      },
      error: () => this.enviandoPdf = false
    });
  }
}