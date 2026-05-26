import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { VmtUamApiService } from '../../services/vmt-uam-api.service';
import { GeneratedReport, VmtReport } from '../../models/vmt-uam.models';

@Component({
  selector: 'app-vmt-report',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
<div class="rpt-page">
  <div class="rpt-header">
    <div>
      <div class="rpt-eyebrow">VG VMT-UAM OPS-APPL CON</div>
      <h1 class="rpt-title">Weekly Report</h1>
    </div>
    <div style="display:flex;gap:8px" *ngIf="!generating && !loading">
      <button class="btn btn-primary" (click)="generate()">Regenerate</button>
      <button class="btn" (click)="print()">Print / Export</button>
    </div>
  </div>

  <div *ngIf="loading || generating" class="loading">{{ loading ? 'Loading…' : 'Generating report…' }}</div>
  <div *ngIf="error" class="alert-danger">{{ error }}</div>

  <div id="printable-report" *ngIf="generated && latest && !generating">
    <div class="rpt-doc-header">
      <div>
        <div class="rpt-meta">MI Weekly Report · VG VMT-UAM OPS-APPL CON</div>
        <div class="rpt-period">{{ generated.period_label }}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:flex-start">
        <span class="badge" [class]="healthCls()">{{ generated.health_label }} ({{ generated.health_score | number:'1.0-0' }}/100)</span>
        <span class="badge" [class]="slaCls()">SLA {{ latest.q_sla_rate }}%</span>
      </div>
    </div>

    <div class="kpi-strip">
      <div class="kpi-item"><div class="kpi-val">{{ latest.q_logged }}</div><div class="kpi-lbl">Logged</div></div>
      <div class="kpi-item"><div class="kpi-val">{{ latest.q_total_closed }}</div><div class="kpi-lbl">Closed</div></div>
      <div class="kpi-item"><div class="kpi-val">{{ latest.q_total_open }}</div><div class="kpi-lbl">Open</div></div>
      <div class="kpi-item"><div class="kpi-val">{{ latest.q_pending }}</div><div class="kpi-lbl">Pending</div></div>
      <div class="kpi-item"><div class="kpi-val">{{ latest.q_closed_breach }}</div><div class="kpi-lbl">Breached</div></div>
      <div class="kpi-item"><div class="kpi-val">{{ latest.resolution_efficiency | number:'1.0-0' }}%</div><div class="kpi-lbl">Resolution eff.</div></div>
    </div>

    <div class="rpt-section"><h3>Executive Summary</h3><p>{{ generated.executive_summary }}</p></div>
    <div class="rpt-section"><h3>Ticket Volume &amp; Throughput</h3><p>{{ generated.volume_analysis }}</p></div>
    <div class="rpt-section"><h3>SLA Performance</h3><p>{{ generated.sla_analysis }}</p></div>
    <div class="rpt-section"><h3>Member Activity</h3><p style="white-space:pre-line">{{ generated.member_activity }}</p></div>
    <div class="rpt-section"><h3>Open Backlog &amp; Risk</h3><p>{{ generated.backlog_risk }}</p></div>
    <div class="rpt-section">
      <h3>Recommendations</h3>
      <ol><li *ngFor="let r of generated.recommendations">{{ r }}</li></ol>
    </div>
    <div class="rpt-footer">Generated automatically · VG VMT-UAM OPS-APPL CON · Scorecard System</div>
  </div>
</div>
  `,
  styles: [`
    .rpt-page { padding:1.5rem; font-family:inherit }
    .rpt-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem }
    .rpt-eyebrow { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:4px }
    .rpt-title { font-size:1.4rem; font-weight:600; margin:0 }
    .rpt-doc-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:1rem; margin-bottom:1rem; border-bottom:.5px solid #E4E2D8 }
    .rpt-meta { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#888 }
    .rpt-period { font-size:1.1rem; font-weight:500; margin-top:2px }
    .badge { display:inline-block; padding:2px 10px; border-radius:4px; font-size:11px; font-weight:500 }
    .badge-green { background:#EAF3DE; color:#3B6D11 } .badge-amber { background:#FAEEDA; color:#854F0B } .badge-red { background:#FCEBEB; color:#A32D2D }
    .kpi-strip { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; background:#F8F7F3; border-radius:8px; padding:12px; margin-bottom:1.5rem }
    .kpi-item { text-align:center }
    .kpi-val { font-size:20px; font-weight:500 }
    .kpi-lbl { font-size:11px; color:#888; margin-top:2px }
    .rpt-section { margin-bottom:1.25rem }
    .rpt-section h3 { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:#888; padding-bottom:6px; border-bottom:.5px solid #E4E2D8; margin-bottom:8px }
    .rpt-section p { font-size:13px; line-height:1.75 }
    .rpt-section ol { font-size:13px; line-height:1.75; padding-left:1.25rem }
    .rpt-section ol li { margin-bottom:6px }
    .rpt-footer { margin-top:2rem; padding-top:1rem; border-top:.5px solid #E4E2D8; font-size:11px; color:#888; text-align:right }
    .loading { padding:2rem; text-align:center; color:#888; font-size:13px }
    .alert-danger { background:#FCEBEB; color:#A32D2D; padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:1rem }
    .btn { padding:8px 16px; border:.5px solid #E4E2D8; border-radius:8px; cursor:pointer; font-size:13px; font-family:inherit; background:#fff }
    .btn:hover { background:#F8F7F3 }
    .btn-primary { background:#185FA5; color:#fff; border-color:#185FA5 }
    .btn-primary:hover { background:#0C447C }
    @media print {
      .rpt-header button, .btn { display:none !important }
      .rpt-section { break-inside:avoid }
    }
  `]
})
export class ReportComponent implements OnInit {
  latest: VmtReport | null = null;
  generated: GeneratedReport | null = null;
  loading = false;
  generating = false;
  error = '';

  constructor(private api: VmtUamApiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.api.listReports(1).subscribe({
      next: r => { this.latest = r[0] ?? null; this.loading = false; if (this.latest) this.generate(); },
      error: () => { this.error = 'Could not load reports.'; this.loading = false; },
    });
  }

  generate(): void {
    if (!this.latest?.id) return;
    this.generating = true;
    this.api.generateReport(this.latest.id).subscribe({
      next: g => { this.generated = g; this.generating = false; },
      error: () => { this.error = 'Could not generate report.'; this.generating = false; },
    });
  }

  print(): void { window.print(); }

  healthCls(): string {
    const s = this.generated?.health_score ?? 0;
    return s >= 90 ? 'badge-green' : s >= 75 ? 'badge-amber' : 'badge-red';
  }

  slaCls(): string {
    const s = this.latest?.q_sla_rate ?? 0;
    return s >= 90 ? 'badge-green' : s >= 75 ? 'badge-amber' : 'badge-red';
  }
}
