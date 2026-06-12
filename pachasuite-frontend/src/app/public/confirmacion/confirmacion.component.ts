import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReservaService } from '../../core/services/reserva.service';
import { ReservaResponse } from '../../core/models/models';

@Component({
  selector: 'app-confirmacion',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, RouterLink],
  templateUrl: './confirmacion.component.html',
  styleUrls: ['./confirmacion.component.scss']
})
export class ConfirmacionComponent implements OnInit {
  reserva  = signal<ReservaResponse | null>(null);
  loading  = signal(true);

  constructor(
    private route: ActivatedRoute,
    private reservaService: ReservaService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const codigo = this.route.snapshot.paramMap.get('codigo');
    if (!codigo) { this.router.navigate(['/']); return; }

    this.reservaService.findByCodigo(codigo).subscribe({
      next: r  => { this.reserva.set(r); this.loading.set(false); },
      error: () => this.router.navigate(['/'])
    });
  }
}