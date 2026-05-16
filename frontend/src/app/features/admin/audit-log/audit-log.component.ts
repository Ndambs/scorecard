import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>Audit Log</h1><p>Full change history for all scorecard edits</p></div>
        <div class="filter-row">
          <select [(ngModel)]="filterType" (change)="load()" class="fi-sm">
            <option value="">All types</option>
            <option value="scorecard">Scorecard</option>
            <option value="kpi">KPI</option>
            <option value="action_item">Action Item</option>
            <option value="section">Section</option>
          </select>
        </div>
      </div>

      <div class="log-table-wrap">
        <table class="log-table">
          <thead>
            <tr><th>Time</th><th>Action</th><th>Entity</th><th>Entity ID</th><th>Changes</th></tr>
          </thead>
          <tbody>
            @for (entry of logs(); track entry.id) {
              <tr>
                <td class="time-cell">{{ entry.created_at | date:'short' }}</td>
                <td><span class="action-badge" [class]="'ab-' + entry.action">{{ entry.action }}</span></td>
                <td><span class="entity-type">{{ entry.entity_type }}</span></td>
                <td class="id-cell">{{ entry.entity_id?.slice(0, 8) }}…</td>
                <td>
                  @if (entry.new_value) {
                    <div class="change-pill" (click)="toggleDetail(entry.id)">
                      {{ expanded() === entry.id ? '▲' : '▼' }} View changes
                    </div>
                    @if (expanded() === entry.id) {
                      <pre class="change-detail">{{ entry.new_value | json }}</pre>
                    }
                  }
                </td>
              </tr>
            }
            @if (logs().length === 0) {
              <tr><td colspan="5" class="empty">No audit entries found.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .page { font-family: system-ui, -apple-system, sans-serif; padding: 28px 32px; }
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
    .page-header h1 { font-size:22px; font-weight:800; color:#111; margin:0 0 4px; }
    .page-header p  { font-size:13px; color:#6b7280; margin:0; }
    .filter-row { display:flex; gap:8px; align-items:center; }
    .fi-sm { padding:7px 10px; border:1.5px solid #e5e7eb; border-radius:7px; font-size:13px; outline:none; }
    .log-table-wrap { background:#fff; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,.07); overflow:hidden; }
    .log-table { width:100%; border-collapse:collapse; }
    .log-table th { padding:11px 14px; font-size:11px; font-weight:700; color:#6b7280;
      text-transform:uppercase; letter-spacing:.5px; background:#fafafa;
      border-bottom:1.5px solid #f1f5f9; text-align:left; }
    .log-table td { padding:10px 14px; font-size:13px; color:#374151; border-bottom:1px solid #f8fafc; vertical-align:top; }
    .time-cell { color:#6b7280; font-size:12px; white-space:nowrap; }
    .action-badge { font-size:11px; font-weight:700; padding:3px 9px; border-radius:99px; }
    .ab-create  { background:#dcfce7; color:#166534; }
    .ab-update  { background:#dbeafe; color:#1d4ed8; }
    .ab-delete  { background:#fee2e2; color:#991b1b; }
    .ab-publish { background:#fef3c7; color:#92400e; }
    .entity-type { font-size:12px; background:#f3f4f6; color:#4b5563;
      padding:2px 8px; border-radius:99px; font-weight:600; }
    .id-cell { font-family: monospace; font-size:12px; color:#9ca3af; }
    .change-pill { font-size:12px; color:#2563eb; cursor:pointer; font-weight:500; }
    .change-pill:hover { text-decoration:underline; }
    .change-detail { margin-top:8px; background:#f8fafc; border:1px solid #e5e7eb;
      border-radius:6px; padding:10px; font-size:11px; color:#374151;
      overflow:auto; max-height:160px; white-space:pre-wrap; }
    .empty { text-align:center; color:#9ca3af; padding:40px; }
  `]
})
export class AuditLogComponent implements OnInit {
  private api = inject(ApiService);
  logs = signal<any[]>([]);
  filterType = '';
  expanded = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.api.getAuditLog(this.filterType || undefined).subscribe(l => this.logs.set(l));
  }

  toggleDetail(id: string) {
    this.expanded.set(this.expanded() === id ? '' : id);
  }
}
