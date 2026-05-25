import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-shell" [class.has-nav]="auth.isLoggedIn">
      @if (auth.isLoggedIn) {
        <nav class="sidebar">
          <div class="sidebar-brand">
            <span class="brand-icon">🔐</span>
            <span class="brand-text">UAM Portal</span>
          </div>
          <div class="nav-section">
            <div class="nav-label">NAVIGATION</div>
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
              <span class="ni">📊</span> Dashboard
            </a>
            <a routerLink="/weekly-report" routerLinkActive="active" class="nav-item">
              <span class="ni">📅</span> Weekly Report
            </a>
            @if (auth.isEditor) {
              <a routerLink="/admin/scorecards" routerLinkActive="active" class="nav-item">
                <span class="ni">✏️</span> Edit Scorecards
              </a>
              <a routerLink="/admin/uploads" routerLinkActive="active" class="nav-item">
                <span class="ni">📁</span> File Uploads
              </a>
            }
            @if (auth.isAdmin) {
              <a routerLink="/admin/users" routerLinkActive="active" class="nav-item">
                <span class="ni">👥</span> Users
              </a>
              <a routerLink="/admin/audit" routerLinkActive="active" class="nav-item">
                <span class="ni">📋</span> Audit Log
              </a>
            }
          </div>
          <div class="sidebar-footer">
            <div class="user-chip">
              <div class="user-avatar">{{ initials }}</div>
              <div class="user-info">
                <div class="user-name">{{ auth.currentUser()?.name }}</div>
                <div class="user-role">{{ auth.currentUser()?.role }}</div>
              </div>
            </div>
            <button class="btn-logout" (click)="auth.logout()">Sign out</button>
          </div>
        </nav>
      }
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [` .app-shell{display:flex;min-height:100vh;background:#f8fafc}
    .sidebar{width:220px;min-height:100vh;background:#1a1f2e;display:flex;flex-direction:column;position:fixed;left:0;top:0;bottom:0;z-index:100;box-shadow:2px 0 8px rgba(0,0,0,.15)}
    .sidebar-brand{display:flex;align-items:center;gap:10px;padding:20px 16px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
    .brand-icon{font-size:22px}.brand-text{color:#fff;font-weight:700;font-size:15px}
    .nav-section{padding:16px 0;flex:1}.nav-label{font-size:10px;font-weight:700;color:rgba(255,255,255,.35);letter-spacing:1.2px;padding:0 16px 8px}
    .nav-item{display:flex;align-items:center;gap:10px;padding:9px 16px;color:rgba(255,255,255,.65);text-decoration:none;font-size:13.5px;font-weight:500;transition:all .15s;border-left:3px solid transparent}
    .nav-item:hover{background:rgba(255,255,255,.06);color:#fff}.nav-item.active{background:rgba(220,38,38,.12);color:#fff;border-left-color:#dc2626}
    .ni{font-size:15px}.sidebar-footer{padding:12px 16px;border-top:1px solid rgba(255,255,255,.08)}
    .user-chip{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .user-avatar{width:34px;height:34px;border-radius:50%;background:#dc2626;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}
    .user-name{color:#fff;font-size:13px;font-weight:600}.user-role{color:rgba(255,255,255,.45);font-size:11px}
    .btn-logout{width:100%;padding:7px;border:1px solid rgba(255,255,255,.15);background:transparent;color:rgba(255,255,255,.6);border-radius:6px;cursor:pointer;font-size:12px}
    .btn-logout:hover{background:rgba(255,255,255,.08);color:#fff}
    .main-content{flex:1;min-height:100vh}.has-nav .main-content{margin-left:220px} `]
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  get initials():string{const n=this.auth.currentUser()?.name||'';return n.split(' ').map((x:string)=>x[0]).join('').toUpperCase().slice(0,2)}
  ngOnInit(){this.auth.loadCurrentUser()}
}
