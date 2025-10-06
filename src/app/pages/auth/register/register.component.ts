import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  private auth = inject(AuthService);
  private router = inject(Router);

  onRegister() {
    this.auth.register(this.name, this.email, this.password).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (err) =>
        alert('Registration failed: ' + err.error?.message || err.message),
    });
  }
}
