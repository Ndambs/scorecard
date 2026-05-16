import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  currentUser = signal<any>(null);
  token = signal<string | null>(localStorage.getItem('uam_token'));

  get isLoggedIn(): boolean { return !!this.token(); }
  get isAdmin(): boolean { return this.currentUser()?.role === 'admin'; }
  get isEditor(): boolean { return ['admin', 'editor'].includes(this.currentUser()?.role); }

  login(email: string, password: string) {
    return this.api.login(email, password).pipe(
      tap((res: any) => {
        localStorage.setItem('uam_token', res.access_token);
        this.token.set(res.access_token);
        this.currentUser.set(res.user);
      })
    );
  }

  logout() {
    localStorage.removeItem('uam_token');
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  loadCurrentUser() {
    if (!this.token()) return;
    this.api.me().subscribe({
      next: (user) => this.currentUser.set(user),
      error: () => this.logout()
    });
  }
}
