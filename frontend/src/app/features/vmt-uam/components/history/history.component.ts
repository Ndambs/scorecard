import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { VmtUamApiService } from '../../services/vmt-uam-api.service';
import { VmtReport } from '../../models/vmt-uam.models';

@Component({
  selector: 'app-vmt-history',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule],
  template: `
<div class="his-page">
  <div class="his-header">
    <div>
      <div class="his-eyebrow">VG VMT-UAM OPS-APPL CON</div>
      <h1 class="his-title">Report History</h1>
    </div>
  </div>

  <div *ngIf="alert" class="alert alert-{{ alert.type }}">{{ alert.text }}</div>

  <!-- Export & clear logs panel -->
  <div class="tools-card">
    <div class="tools-row">
      <div class="field">
        <label>From</label>
        <input type="date" [(ngModel)]="rangeStart" />
      </div>
      <div class="field">
        <label>To</label>
        <input type="date" [(ngModel)]="rangeEnd" />
      </div>
      <button class="btn" (click)="exportExcel()" [disabled]="exporting">
        {{ exporting ? 'Exporting…' : 'Export to Excel' }}
      </button>
      <button class="btn btn-danger" (click)="confirmClear()" [disabled]="clearing || !reports.length">
        {{ clearing ? 'Clearing…' : 'Clear logs' }}
      </button>
    </div>
    <div class="tools-hint">
      Leave both dates blank to export or clear every saved report. Clearing logs permanently deletes the matching reports.
    </div>
  </div>

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
        <button class="btn btn-sm btn-danger-outline" (click)="deleteOne(r)" [disabled]="deletingId === r.id">
          {{ deletingId === r.id ? 'Deleting…' : 'Delete' }}
        </button>
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
    .btn:disabled { opacity:.55; cursor:default }
    .btn-sm { padding:5px 10px; font-size:12px }
    .btn-danger { border-color:#E7B9B5; color:#A33B33 }
    .btn-danger:hover { background:#FBF0EF }
    .btn-danger-outline { border-color:#E7B9B5; color:#A33B33 }
    .btn-danger-outline:hover { background:#FBF0EF }
    .loading { padding:2rem; text-align:center; color:#888; font-size:13px }
    .alert { padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:1rem }
    .alert-info { background:#E6F1FB; color:#185FA5 }
    .alert-success { background:#EAF3DE; color:#3B6D11 }
    .alert-danger { background:#FBF0EF; color:#A33B33 }
    .tools-card { background:#fff; border:.5px solid #E4E2D8; border-radius:8px; padding:14px 16px; margin-bottom:1.25rem }
    .tools-row { display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap }
    .field { display:flex; flex-direction:column; gap:4px }
    .field label { font-size:11px; color:#888; }
    .field input { padding:7px 10px; border:.5px solid #E4E2D8; border-radius:6px; font-size:13px; font-family:inherit }
    .tools-hint { font-size:11.5px; color:#999; margin-top:10px }
  `]
})
export class HistoryComponent implements OnInit {
  reports: VmtReport[] = [];
  loading = true;
  alert: { type: string; text: string } | null = null;

  rangeStart = '';
  rangeEnd = '';
  exporting = false;
  clearing = false;
  deletingId: number | null = null;

  constructor(private api: VmtUamApiService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.listReports(52).subscribe({
      next: r => { this.reports = r; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  view(r: VmtReport): void { this.router.navigate(['/vmt-uam/dashboard']); }

  clone(r: VmtReport): void { this.router.navigate(['/vmt-uam/entry'], { state: { cloneId: r.id } }); }

  deleteOne(r: VmtReport): void {
    if (r.id == null) return;
    if (!confirm(`Delete the report for ${r.period_start} – ${r.period_end}? This can't be undone.`)) return;
    const id = r.id;
    this.deletingId = id;
    this.api.deleteReport(id).subscribe({
      next: () => {
        this.deletingId = null;
        this.reports = this.reports.filter(x => x.id !== id);
        this.alert = { type: 'success', text: 'Report deleted.' };
      },
      error: () => {
        this.deletingId = null;
        this.alert = { type: 'danger', text: 'Could not delete that report.' };
      },
    });
  }

  confirmClear(): void {
    const scope = this.rangeStart || this.rangeEnd
      ? `reports from ${this.rangeStart || 'the earliest record'} to ${this.rangeEnd || 'the latest record'}`
      : 'ALL saved reports';
    if (!confirm(`This will permanently delete ${scope}. Continue?`)) return;

    this.clearing = true;
    this.api.clearReports(this.rangeStart || undefined, this.rangeEnd || undefined).subscribe({
      next: (res) => {
        this.clearing = false;
        this.alert = { type: 'success', text: `Cleared ${res.deleted} report(s).` };
        this.load();
      },
      error: () => {
        this.clearing = false;
        this.alert = { type: 'danger', text: 'Could not clear logs.' };
      },
    });
  }

  exportExcel(): void {
    this.exporting = true;
    this.api.exportExcel(this.rangeStart || undefined, this.rangeEnd || undefined).subscribe({
      next: (blob) => {
        this.exporting = false;
        const label = this.rangeStart || this.rangeEnd
          ? `${this.rangeStart || 'start'}_to_${this.rangeEnd || 'end'}`
          : 'all';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VMT-UAM_Logs_${label}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.exporting = false;
        this.alert = { type: 'danger', text: 'Export failed.' };
      },
    });
  }
}
