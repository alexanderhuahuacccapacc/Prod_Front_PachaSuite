import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email    = '';
  password = '';
  error    = signal('');
  loading  = signal(false);
  showPwd  = signal(false);

  constructor(private authService: AuthService, private router: Router) {
    if (this.authService.isLoggedIn() && this.authService.isAdmin()) {
      this.router.navigate(['/admin/dashboard']);
    } else if (this.authService.isLoggedIn() && this.authService.isRecepcionista()) {
      this.router.navigate(['/recepcion/dashboard']);
    }
  }

  // ← Método en lugar de arrow function en template
  togglePwd(): void {
    this.showPwd.set(!this.showPwd());
  }

  login(): void {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('Completa todos los campos.');
      return;
    }
    this.loading.set(true);
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin/dashboard']);
        } else if (this.authService.isRecepcionista()) {
          this.router.navigate(['/recepcion/dashboard']);
        } else {
          this.error.set('Tu cuenta no tiene un rol válido para acceder.');
          this.loading.set(false);
        }
      },
      error: err => {
        this.error.set(err?.error?.message || 'Email o contraseña incorrectos.');
        this.loading.set(false);
      }
    });
  }
}
