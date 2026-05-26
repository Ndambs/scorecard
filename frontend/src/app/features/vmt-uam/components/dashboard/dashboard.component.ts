import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { VmtUamApiService } from '../../services/vmt-uam-api.service';
import { VmtReport, AnalyticsSummary, MemberStat, TEAM_MEMBERS } from '../../models/vmt-uam.models';

@Component({
  selector: 'app-vmt-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './dashboard.component.html',
  styles: [`
    .vmt-page { padding:1.5rem; font-family:inherit }
    .vmt-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem }
    .vmt-eyebrow { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:4px }
    .vmt-title { font-size:1.4rem; font-weight:600; margin:0 }
    .vmt-tag { display:inline-block; padding:2px 10px; border-radius:4px; font-size:11px; font-weight:500 }
    .tag-blue { background:#E6F1FB; color:#185FA5 }
    .tag-gray { background:#F1EFE8; color:#5F5E5A }
    .section-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:#888; margin:1.25rem 0 .75rem }
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin-bottom:1.5rem }
    .kpi { background:#F8F7F3; border-radius:8px; padding:14px 16px }
    .kpi-label { font-size:11px; color:#888; margin-bottom:6px }
    .kpi-value { font-size:24px; font-weight:500 }
    .kpi-sub { font-size:11px; color:#888; margin-top:4px }
    .good .kpi-value { color:#1D9E75 } .warn .kpi-value { color:#BA7517 } .danger .kpi-value { color:#A32D2D } .info .kpi-value { color:#185FA5 }
    .card { background:#fff; border:0.5px solid #E4E2D8; border-radius:12px; padding:1.25rem; margin-bottom:1rem }
    .card-title { font-size:13px; font-weight:500; margin-bottom:1rem }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:1rem }
    .metric-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:.5px solid #E4E2D8; gap:12px }
    .metric-row:last-child { border-bottom:none }
    .metric-label { font-size:12px; flex:1 }
    .metric-right { display:flex; align-items:center; gap:10px }
    .metric-val { font-size:12px; font-weight:500; min-width:40px; text-align:right }
    .bar-wrap { width:90px; height:5px; background:#F1EFE8; border-radius:20px; overflow:hidden }
    .bar { height:100%; border-radius:20px }
    .bar-green { background:#1D9E75 } .bar-amber { background:#EF9F27 } .bar-red { background:#E24B4A } .bar-blue { background:#378ADD }
    table { width:100%; border-collapse:collapse; font-size:13px }
    th { text-align:left; padding:8px 10px; font-size:11px; font-weight:500; color:#888; border-bottom:.5px solid #E4E2D8 }
    td { padding:8px 10px; border-bottom:.5px solid #E4E2D8; vertical-align:middle }
    tr:last-child td { border-bottom:none }
    .member-cell { display:flex; align-items:center; gap:10px }
    .avatar { width:30px; height:30px; border-radius:50%; background:#E6F1FB; color:#185FA5; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; flex-shrink:0 }
    .badge { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:500 }
    .badge-green { background:#EAF3DE; color:#3B6D11 } .badge-amber { background:#FAEEDA; color:#854F0B } .badge-red { background:#FCEBEB; color:#A32D2D } .badge-blue { background:#E6F1FB; color:#185FA5 } .badge-gray { background:#F1EFE8; color:#5F5E5A }
    .insight { border-left:3px solid #378ADD; background:#F8F7F3; border-radius:0 8px 8px 0; padding:10px 14px; margin-bottom:8px; font-size:13px; line-height:1.6 }
    .insight-success { border-left-color:#1D9E75 } .insight-warn { border-left-color:#EF9F27 } .insight-danger { border-left-color:#E24B4A }
    .alert { padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:1rem }
    .alert-danger { background:#FCEBEB; color:#A32D2D }
    .loading { padding:2rem; text-align:center; color:#888; font-size:13px }
    .text-danger { color:#A32D2D; font-weight:500 }
  `]
})
export class DashboardComponent implements OnInit {
  report: VmtReport | null = null;
  analytics: AnalyticsSummary | null = null;
  loading = true;
  error = '';
  kpis: any[] = [];
  opMetrics: any[] = [];
  memberRows: any[] = [];
  insights: any[] = [];

  constructor(private api: VmtUamApiService) {}

  ngOnInit(): void {
    this.api.listReports(1).subscribe({
      next: (r) => { this.report = r[0] ?? null; this.loading = false; if (this.report) this.build(); },
      error: () => { this.error = 'Could not load report data. Ensure the backend is running.'; this.loading = false; },
    });
    this.api.getAnalytics(12).subscribe({ next: a => this.analytics = a, error: () => {} });
  }

  private pct(n: number, d: number) { return d ? Math.round((n / d) * 100) : 0; }

  private build(): void {
    const r = this.report!;
    const tc = r.q_total_closed || 1;

    this.kpis = [
      { label: 'Logged tickets',   value: r.q_logged,         sub: 'This period',     cls: 'info' },
      { label: 'Total open',       value: r.q_total_open,     sub: 'Active backlog',  cls: r.q_total_open > 10 ? 'warn' : '' },
      { label: 'Pending',          value: r.q_pending,        sub: 'Awaiting action', cls: r.q_pending > 5 ? 'warn' : '' },
      { label: 'Total closed',     value: r.q_total_closed,   sub: 'Resolved',        cls: 'good' },
      { label: 'Closed in SLA',    value: r.q_closed_sla,     sub: 'On-time',         cls: 'good' },
      { label: 'SLA breached',     value: r.q_closed_breach,  sub: 'Late closures',   cls: r.q_closed_breach > 0 ? 'danger' : 'good' },
      { label: 'SLA clear-up',     value: r.q_sla_rate + '%', sub: 'Target ≥ 90%',    cls: r.q_sla_rate >= 90 ? 'good' : r.q_sla_rate >= 75 ? 'warn' : 'danger' },
      { label: 'Open SLA breached',value: r.q_open_breach,    sub: 'Overdue open',    cls: r.q_open_breach > 0 ? 'danger' : 'good' },
    ];

    const resEff    = Math.round(r.resolution_efficiency  ?? this.pct(r.q_closed_sla, tc));
    const throughput = Math.round(r.throughput_ratio      ?? this.pct(r.q_total_closed, r.q_logged || 1));
    const breachRate = Math.round(r.breach_rate_closed    ?? this.pct(r.q_closed_breach, tc));
    const pendShare  = Math.round(r.pending_share         ?? this.pct(r.q_pending, r.q_total_open || 1));
    const openBR     = Math.round(r.open_breach_rate      ?? this.pct(r.q_open_breach, r.q_total_open || 1));

    this.opMetrics = [
      { label: 'Resolution efficiency',        value: resEff + '%',     bar: resEff,                    cls: resEff >= 85 ? 'bar-green' : 'bar-amber' },
      { label: 'SLA breach rate (closed)',      value: breachRate + '%', bar: breachRate,                cls: breachRate <= 10 ? 'bar-green' : breachRate <= 20 ? 'bar-amber' : 'bar-red' },
      { label: 'Throughput vs logged',          value: throughput + '%', bar: Math.min(throughput, 100), cls: 'bar-blue' },
      { label: 'Pending share of open backlog', value: pendShare + '%',  bar: pendShare,                 cls: pendShare > 60 ? 'bar-amber' : 'bar-green' },
      { label: 'Open SLA breach rate',          value: openBR + '%',     bar: openBR,                    cls: openBR === 0 ? 'bar-green' : 'bar-red' },
    ];

    this.memberRows = TEAM_MEMBERS.map(t => {
      const m = r.members.find(x => x.agent_id === t.agent_id) ?? {
        agent_id: t.agent_id, agent_name: t.agent_name,
        open_sla: 0, open_breach: 0, open_blank: 0, pending: 0,
        closed_sla: 0, closed_breach: 0, closed_blank: 0,
        total_closed: 0, total_open: 0, agent_sla_rate: 0,
      };
      const totalClosed = (m.closed_sla ?? 0) + (m.closed_breach ?? 0);
      const hasActivity = totalClosed > 0 || (m.open_sla ?? 0) > 0 || (m.pending ?? 0) > 0;
      const sla = m.agent_sla_rate ?? 0;
      let badge = 'No tickets'; let badgeCls = 'badge-gray';
      if (hasActivity) {
        if ((m.open_breach ?? 0) > 0) { badge = 'Breach open'; badgeCls = 'badge-red'; }
        else if (sla >= 90) { badge = 'On track'; badgeCls = 'badge-green'; }
        else if (sla >= 75) { badge = 'Monitor';  badgeCls = 'badge-amber'; }
        else                { badge = 'Active';   badgeCls = 'badge-blue'; }
      }
      return { ...m, totalClosed, badge, badgeCls };
    });

    this.insights = [];
    const r2 = r;
    if (r2.q_sla_rate >= 90) this.insights.push({ cls: 'insight-success', text: `Queue achieved ${r2.q_sla_rate}% SLA clear-up — above the 90% operational target.` });
    else this.insights.push({ cls: r2.q_sla_rate >= 75 ? 'insight-warn' : 'insight-danger', text: `SLA clear-up rate of ${r2.q_sla_rate}% is below the 90% target. Review the ${r2.q_closed_breach} breached closure(s).` });
    if (r2.q_total_closed > r2.q_logged) this.insights.push({ cls: 'insight-success', text: `Throughput of ${r2.q_total_closed} closures vs ${r2.q_logged} logged — actively clearing backlog (${throughput}% ratio).` });
    if (r2.q_open_breach === 0) this.insights.push({ cls: 'insight-success', text: 'Zero open SLA breaches — all active tickets are within service target.' });
    else this.insights.push({ cls: 'insight-danger', text: `${r2.q_open_breach} open ticket(s) have breached SLA. Immediate escalation required.` });
    const inactive = TEAM_MEMBERS.filter(t => !r2.members.find(m => m.agent_id === t.agent_id && ((m.closed_sla ?? 0) + (m.closed_breach ?? 0) + (m.open_sla ?? 0) + (m.pending ?? 0)) > 0));
    if (inactive.length) this.insights.push({ cls: '', text: `${inactive.map(t => t.agent_name).join(', ')} had no ticket activity this period. Confirm availability.` });
  }
}
