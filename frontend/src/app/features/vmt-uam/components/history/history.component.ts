import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { VmtUamApiService } from '../../services/vmt-uam-api.service';
import { VmtReport } from '../../models/vmt-uam.models';

@Component({
  selector: 'app-vmt-history',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
<div class="his-page">
  <div class="his-header">
    <div>
      <div class="his-eyebrow">VG VMT-UAM OPS-APPL CON</div>
      <h1 class="his-title">Report History</h1>
    </div>
  </div>

  <div *ngIf="alert" class="alert alert-{{ alert.type }}">{{ alert.text }}</div>
  <div *ngIf="loading" class="loading">Loading history…</div>
  <div *ngIf="!loading && !reports.length" class="alert alert-info">No reports saved yet. Go to Data Entry to submit the first report.</div>

  <div class="his-list" *ngIf="!loading && reports.length">
    <div class="his-item" *ngFor="let r of reports">
      <div class="his-info">
        <div class="his-item-title">
          VG VMT-UAM — {{ r.period_start | date:'dd MMM yyyy' }} to {{ r.period_end | date:'dd MMM yyyy' }}
          <span class="badge badge-green" *ngIf="r.is_published">Published</span>
          <span class="badge badge-gray" *ngIf="!r.is_published">Draft</span>
        </div>
        <div class="his-meta">
          {{ r.q_total_closed }} closed · {{ r.q_sla_rate }}% SLA · {{ r.q_total_open }} open · {{ r.created_at | date:'dd MMM yyyy, HH:mm' }}
        </div>
      </div>
      <div class="his-actions">
        <button class="btn btn-sm" (click)="view(r)">View</button>
        <button class="btn btn-sm" (click)="clone(r)">Copy as new</button>
      </div>
    </div>
  </div>
</div>
  `,
  styles: [`
    .his-page { padding:1.5rem; font-family:inherit }
    .his-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem }
    .his-eyebrow { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:4px }
    .his-title { font-size:1.4rem; font-weight:600; margin:0 }
    .his-list { display:flex; flex-direction:column; gap:8px }
    .his-item { display:flex; align-items:center; justify-content:space-between; background:#fff; border:.5px solid #E4E2D8; border-radius:8px; padding:12px 16px; gap:12px }
    .his-info { flex:1 }
    .his-item-title { font-size:13px; font-weight:500; display:flex; align-items:center; gap:8px }
    .his-meta { font-size:12px; color:#888; margin-top:2px }
    .his-actions { display:flex; gap:6px; flex-shrink:0 }
    .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500 }
    .badge-green { background:#EAF3DE; color:#3B6D11 } .badge-gray { background:#F1EFE8; color:#5F5E5A }
    .btn { padding:8px 16px; border:.5px solid #E4E2D8; border-radius:8px; cursor:pointer; font-size:13px; font-family:inherit; background:#fff }
    .btn:hover { background:#F8F7F3 }
    .btn-sm { padding:5px 10px; font-size:12px }
    .loading { padding:2rem; text-align:center; color:#888; font-size:13px }
    .alert { padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:1rem }
    .alert-info { background:#E6F1FB; color:#185FA5 }
    .alert-success { background:#EAF3DE; color:#3B6D11 }
  `]
})
export class HistoryComponent implements OnInit {
  reports: VmtReport[] = [];
  loading = true;
  alert: { type: string; text: string } | null = null;

  constructor(private api: VmtUamApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.listReports(52).subscribe({
      next: r => { this.reports = r; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  view(r: VmtReport): void { this.router.navigate(['/vmt-uam/dashboard']); }

  clone(r: VmtReport): void { this.router.navigate(['/vmt-uam/entry'], { state: { cloneId: r.id } }); }
}
