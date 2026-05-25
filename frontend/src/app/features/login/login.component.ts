import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
} from '@angular/core';
import { CommonModule }      from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router }             from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { finalize }           from 'rxjs/operators';
import { AuthService }        from '../../core/services/auth.service';

export type SecurityState = 'idle' | 'weak' | 'strong';

interface Requirement {
  label : string;
  test  : (v: string) => boolean;
  met   : boolean;
}

@Component({
  selector   : 'app-login',
  standalone : true,
  imports    : [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls  : ['./login.component.scss'],
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {

  private destroy$  = new Subject<void>();
  private animFrame = 0;

  form!        : FormGroup;
  isLoading    = false;
  showPassword = false;
  loginError   = '';
  pwFocused    = false;
  pwTouched    = false;

  requirements: Requirement[] = [
    { label: 'At least 8 characters',  test: v => v.length >= 8,          met: false },
    { label: 'One uppercase letter',   test: v => /[A-Z]/.test(v),        met: false },
    { label: 'One lowercase letter',   test: v => /[a-z]/.test(v),        met: false },
    { label: 'One number',             test: v => /[0-9]/.test(v),        met: false },
    { label: 'One special character',  test: v => /[^A-Za-z0-9]/.test(v), met: false },
  ];

  // ── Accessors ─────────────────────────────────────────────────────────────

  get email()    { return this.form.get('email')!;    }
  get password() { return this.form.get('password')!; }

  get emailOk()  { return this.email.valid   && this.email.touched; }
  get emailErr() { return this.email.invalid && this.email.touched; }

  get score()  { return this.requirements.filter(r => r.met).length; }
  get allMet() { return this.score === 5; }

  get strengthLabel(): string {
    if (!this.pwTouched || !this.password.value) return '';
    const s = this.score;
    if (s <= 2) return 'Weak';
    if (s <= 3) return 'Fair';
    if (s <= 4) return 'Good';
    return 'Strong';
  }

  get strengthClass(): string {
    const s = this.score;
    if (s <= 2) return 'weak';
    if (s <= 3) return 'fair';
    if (s <= 4) return 'good';
    return 'strong';
  }

  get securityState(): SecurityState {
    if (!this.pwTouched || !this.password.value) return 'idle';
    return this.allMet ? 'strong' : 'weak';
  }

  get canSubmit(): boolean {
    return this.email.valid && this.allMet && !this.isLoading;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  constructor(
    private fb    : FormBuilder,
    private router: Router,
    private auth  : AuthService,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email   : ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });

    this.password.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((v: string) => this.evaluatePw(v ?? ''));
  }

  ngAfterViewInit(): void {
    this.initMeshCanvas();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrame);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  onPwFocus(): void { this.pwFocused = true; this.pwTouched = true; }

  onPwBlur(): void {
    this.pwFocused = false;
    this.password.markAsTouched();
  }

  togglePw(): void { this.showPassword = !this.showPassword; }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.pwTouched = true;
    this.evaluatePw(this.password.value ?? '');
    if (!this.canSubmit) return;

    this.loginError = '';
    this.isLoading  = true;

    this.auth
      .login(this.email.value.trim().toLowerCase(), this.password.value)
      .pipe(
        finalize(() => (this.isLoading = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => {
          // ── Always clear the password field on any auth failure ──────────
          // This prevents stale passwords sitting in the field
          this.password.reset('');
          this.pwTouched    = false;
          this.showPassword = false;
          this.evaluatePw('');

          const status = err?.status;
          if (status === 401 || status === 403) {
            this.loginError = 'Invalid email or password. Please check your credentials.';
          } else if (status === 404) {
            this.loginError = 'No account found with that email. Contact your administrator.';
          } else if (status === 422) {
            this.loginError = 'Please check the format of your email address.';
          } else if (status === 429) {
            this.loginError = 'Too many attempts. Please wait a moment and try again.';
          } else if (!status || status >= 500) {
            this.loginError = 'Unable to reach the server. Please check your connection.';
          } else {
            this.loginError =
              err?.error?.detail ??
              err?.error?.message ??
              'Sign-in failed. Please try again.';
          }
        },
      });
  }

  // ── Canvas mesh ───────────────────────────────────────────────────────────

  private initMeshCanvas(): void {
    const canvas = document.getElementById('meshCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0;
    let pts: { x:number; y:number; vx:number; vy:number; r:number; hue:number }[] = [];

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      pts = Array.from({ length: 55 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.55, vy: (Math.random() - 0.5) * 0.55,
        r: Math.random() * 2.5 + 1, hue: 130 + Math.random() * 40,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(0,200,83,${(1 - d / 130) * 0.35})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
      const t = Date.now() / 1000;
      [[W * .3, H * .4, 180], [W * .7, H * .7, 120], [W * .5, H * .2, 100]].forEach(([ox, oy, or_]) => {
        const pulse = 0.05 + Math.abs(Math.sin(t * .8)) * 0.07;
        const r = or_ + Math.sin(t) * 20;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
        g.addColorStop(0, `rgba(0,200,83,${pulse})`);
        g.addColorStop(1, 'rgba(0,200,83,0)');
        ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${p.hue},65%,50%)`; ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      });
      this.animFrame = requestAnimationFrame(draw);
    };

    new ResizeObserver(resize).observe(canvas.parentElement!);
    resize(); draw();
  }

  private evaluatePw(value: string): void {
    this.requirements = this.requirements.map(r => ({
      ...r, met: value ? r.test(value) : false,
    }));
  }
}
