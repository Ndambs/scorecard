import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'scorecards', pathMatch: 'full' },
      {
        path: 'scorecards',
        loadComponent: () => import('./features/admin/scorecard-editor/scorecard-editor.component').then(m => m.ScorecardEditorComponent)
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/user-manager/user-manager.component').then(m => m.UserManagerComponent)
      },
      {
        path: 'uploads',
        loadComponent: () => import('./features/admin/upload-manager/upload-manager.component').then(m => m.UploadManagerComponent)
      },
      {
        path: 'audit',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/audit-log/audit-log.component').then(m => m.AuditLogComponent)
      }
    ]
  },
  {
    path: 'weekly-report',
    canActivate: [authGuard],
    loadComponent: () => import('./features/weekly-report/weekly-report.component').then(m => m.WeeklyReportComponent)
  },
  { path: '**', redirectTo: '/dashboard' }
];
