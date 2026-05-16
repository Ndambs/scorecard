import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-left">
        <div class="login-brand">
          <div class="brand-logo">🔐</div>
          <h1>UAM Scorecard<br><span>Operations Platform</span></h1>
          <p>User Access Management · Performance · Compliance</p>
        </div>
        <div class="login-stats">
          <div class="stat-pill">📊 5 Scorecard Modules</div>
          <div class="stat-pill">🔑 Access Review Tracking</div>
          <div class="stat-pill">📈 Real-time KPI Trends</div>
          <div class="stat-pill">✅ Compliance Dashboard</div>
        </div>
      </div>

      <div class="login-right">
        <div class="login-card">
          <div class="login-header">
            <h2>Sign in</h2>
            <p>Enter your credentials to access the platform</p>
          </div>

          @if (firstRun()) {
            <div class="first-run-banner">
              <strong>🎉 First-time setup</strong><br>
              No users found. Register the first admin account below.
            </div>
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" [(ngModel)]="name" placeholder="Your name" class="form-input" />
            </div>
          }

          <div class="form-group">
            <label>Email address</label>
            <input type="email" [(ngModel)]="email" placeholder="admin@uam.local"
              class="form-input" (keyup.enter)="submit()" />
          </div>

          <div class="form-group">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" placeholder="••••••••"
              class="form-input" (keyup.enter)="submit()" />
          </div>

          @if (error()) {
            <div class="error-msg">{{ error() }}</div>
          }

          <button class="btn-login" (click)="submit()" [disabled]="loading()">
            @if (loading()) { <span>Signing in…</span> }
            @else { <span>{{ firstRun() ? 'Create Admin & Sign in' : 'Sign in' }}</span> }
          </button>

          <div class="login-hint">
            <strong>Default accounts:</strong><br>
            admin&#64;uam.local / admin123 &nbsp;|&nbsp; editor&#64;uam.local / editor123
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page { display:flex; min-height:100vh; font-family: system-ui, -apple-system, sans-serif; }
    .login-left {
      flex: 1; background: linear-gradient(135deg, #1a1f2e 0%, #2d1b1b 60%, #7f1d1d 100%);
      display:flex; flex-direction:column; justify-content:center; padding: 60px 48px;
    }
    .brand-logo { font-size: 52px; margin-bottom: 20px; }
    .login-brand h1 { color:#fff; font-size:32px; font-weight:800; line-height:1.2; margin:0 0 12px; }
    .login-brand h1 span { color: rgba(255,255,255,.55); font-weight:400; font-size:24px; }
    .login-brand p { color: rgba(255,255,255,.5); font-size:14px; margin:0 0 40px; }
    .login-stats { display:flex; flex-direction:column; gap:10px; }
    .stat-pill { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12);
      color:rgba(255,255,255,.8); padding:10px 16px; border-radius:8px; font-size:13px; font-weight:500; }
    .login-right { width:440px; display:flex; align-items:center; justify-content:center;
      padding:40px; background:#fff; }
    .login-card { width:100%; max-width:380px; }
    .login-header { margin-bottom:28px; }
    .login-header h2 { font-size:26px; font-weight:800; color:#111; margin:0 0 6px; }
    .login-header p { color:#6b7280; font-size:14px; margin:0; }
    .first-run-banner { background:#fef3c7; border:1px solid #f59e0b; border-radius:8px;
      padding:12px 14px; font-size:13px; color:#92400e; margin-bottom:16px; line-height:1.5; }
    .form-group { margin-bottom:18px; }
    .form-group label { display:block; font-size:13px; font-weight:600; color:#374151; margin-bottom:6px; }
    .form-input { width:100%; padding:10px 12px; border:1.5px solid #e5e7eb; border-radius:8px;
      font-size:14px; outline:none; box-sizing:border-box; transition:border-color .15s; }
    .form-input:focus { border-color:#dc2626; }
    .error-msg { background:#fef2f2; border:1px solid #fecaca; color:#dc2626;
      padding:10px 12px; border-radius:8px; font-size:13px; margin-bottom:14px; }
    .btn-login { width:100%; padding:12px; background:#dc2626; color:#fff; border:none;
      border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; transition:background .15s; }
    .btn-login:hover:not(:disabled) { background:#b91c1c; }
    .btn-login:disabled { opacity:.6; cursor:not-allowed; }
    .login-hint { margin-top:20px; font-size:12px; color:#9ca3af; background:#f9fafb;
      padding:12px; border-radius:8px; line-height:1.6; }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);

  email = '';  password = '';  name = '';
  loading = signal(false);
  error = signal('');
  firstRun = signal(false);

  constructor() {
    // Check if this is first run (no users)
    this.api.getScorecards().subscribe({
      error: (err) => {
        if (err.status === 401) {
          // API running but auth needed - check for first user
          this.checkFirstRun();
        }
      }
    });
  }

  checkFirstRun() {
    // Try login; if 401 with no users we'd need to register
    // The /register endpoint tells us if DB is empty
  }

  submit() {
    this.error.set('');
    if (!this.email || !this.password) {
      this.error.set('Please enter your email and password.');
      return;
    }
    this.loading.set(true);

    if (this.firstRun()) {
      this.api.register({ email: this.email, password: this.password, name: this.name, role: 'admin' })
        .subscribe({
          next: () => this.doLogin(),
          error: (e) => { this.loading.set(false); this.error.set(e.error?.detail || 'Registration failed.'); }
        });
    } else {
      this.doLogin();
    }
  }

  doLogin() {
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/dashboard']); },
      error: (e) => { this.loading.set(false); this.error.set(e.error?.detail || 'Invalid credentials.'); }
    });
  }
}
