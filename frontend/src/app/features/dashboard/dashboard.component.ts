import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <!-- Header -->
      <div class="dash-header">
        <div class="dash-header-inner">
          <div class="dash-title-block">
            <div class="dash-eyebrow">UAM OPERATIONS</div>
            <h1 class="dash-title">{{ activeScorecard()?.title || 'Loading…' }}</h1>
            <div class="dash-meta">
              @if (activeScorecard()?.subtitle) { <span>{{ activeScorecard()?.subtitle }}</span><span class="sep">·</span> }
              @if (activeScorecard()?.period)   { <span>{{ activeScorecard()?.period }}</span> }
            </div>
          </div>
          <div class="dash-actions">
            @if (auth.isEditor) {
              <a routerLink="/admin/scorecards" class="btn-edit">✏️ Edit Scorecard</a>
            }
          </div>
        </div>

        <!-- Tab Bar -->
        <div class="tab-bar">
          @for (sc of scorecards(); track sc.id) {
            <button class="tab-btn" [class.active]="sc.id === activeScorecardId()"
              (click)="selectTab(sc.id)">
              <span>{{ sc.icon }}</span> {{ sc.title }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading scorecard…</p>
        </div>
      }

      @if (!loading() && activeScorecard()) {
        <div class="dash-body">

          <!-- KPI Cards Row -->
          @if (activeScorecard()?.kpis?.length) {
            <div class="kpi-row">
              @for (kpi of activeScorecard()?.kpis; track kpi.id) {
                <div class="kpi-card" [class]="'kpi-' + kpi.color">
                  <div class="kpi-top-bar"></div>
                  <div class="kpi-inner">
                    <div class="kpi-label">{{ kpi.label }}</div>
                    <div class="kpi-value">
                      {{ kpi.value }}
                      @if (kpi.trend === 'up')   { <span class="trend up">▲</span> }
                      @if (kpi.trend === 'down') { <span class="trend down">▼</span> }
                    </div>
                    @if (kpi.sub_text) {
                      <div class="kpi-sub">{{ kpi.sub_text }}</div>
                    }
                    <div class="kpi-bar-track">
                      <div class="kpi-bar-fill" [style.width.%]="kpi.bar_percent"></div>
                    </div>
                    @if (kpi.history?.length > 1) {
                      <div class="kpi-sparkline">
                        <svg viewBox="0 0 80 24" preserveAspectRatio="none">
                          <polyline [attr.points]="sparklinePoints(kpi.history)"
                            fill="none" stroke="currentColor" stroke-width="1.5"
                            stroke-linecap="round" stroke-linejoin="round" opacity=".6"/>
                        </svg>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Sections -->
          @for (section of activeScorecard()?.sections; track section.id) {
            <div class="section-card" [class]="'accent-' + section.accent_color">
              <div class="section-header">
                <div class="section-title">
                  @if (section.icon) { <span>{{ section.icon }}</span> }
                  {{ section.title }}
                </div>
                <div class="section-type-badge">{{ sectionTypeLabel(section.section_type) }}</div>
              </div>
              <div class="section-body">

                <!-- TIMELINE -->
                @if (section.section_type === 'timeline') {
                  <div class="timeline">
                    @for (item of section.timeline_items; track item.id) {
                      <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-text">{{ item.text }}</div>
                      </div>
                    }
                  </div>
                }

                <!-- METRIC TABLE -->
                @if (section.section_type === 'metric_table') {
                  <div class="metric-table">
                    @for (row of section.metric_rows; track row.id) {
                      <div class="metric-row">
                        <div class="metric-label">{{ row.label }}</div>
                        <div class="metric-right">
                          <div class="metric-bar-track">
                            <div class="metric-bar-fill" [class]="'fill-' + row.bar_color"
                              [style.width.%]="row.bar_percent"></div>
                          </div>
                          <div class="metric-pct">{{ row.bar_percent }}%</div>
                          <div class="status-badge" [class]="'st-' + row.status">
                            {{ statusLabel(row.status) }}
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- CHECKLIST -->
                @if (section.section_type === 'checklist') {
                  <div class="checklist">
                    @for (item of section.checklist_items; track item.id) {
                      <div class="checklist-item" [class.done]="item.done">
                        <span class="check-icon">{{ item.done ? '✅' : '⬜' }}</span>
                        <span class="check-text">{{ item.text }}</span>
                      </div>
                    }
                  </div>
                }

                <!-- ACTION TABLE -->
                @if (section.section_type === 'action_table') {
                  <div class="action-table">
                    <div class="action-header-row">
                      <div>Action</div><div>Owner</div><div>Status</div>
                    </div>
                    @for (item of section.action_items; track item.id) {
                      <div class="action-row">
                        <div class="action-text">{{ item.action_text }}</div>
                        <div>
                          <span class="owner-chip" [class]="'oc-' + item.owner_color">
                            {{ item.owner }}
                          </span>
                        </div>
                        <div>
                          <span class="status-badge" [class]="'st-' + item.status">
                            {{ actionStatusLabel(item.status) }}
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- INSIGHT BLOCKS -->
                @if (section.section_type === 'insight') {
                  <div class="insight-grid">
                    @for (block of section.insight_blocks; track block.id) {
                      <div class="insight-block" [class]="'ib-' + block.color">
                        <div class="ib-heading">{{ block.heading }}</div>
                        <div class="ib-body">{{ block.body }}</div>
                      </div>
                    }
                  </div>
                }

                <!-- FOCUS LIST -->
                @if (section.section_type === 'focus_list') {
                  <div class="focus-list">
                    @for (item of section.focus_items; track item.id) {
                      <div class="focus-item">
                        <span class="focus-dot">▸</span>
                        <span>{{ item.text }}</span>
                      </div>
                    }
                  </div>
                }

              </div>
            </div>
          }

        </div>
      }
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .dashboard { font-family: system-ui, -apple-system, sans-serif; min-height: 100vh; background: #f1f5f9; }

    /* ─── Header ─── */
    .dash-header { background: linear-gradient(135deg, #1a1f2e 0%, #7f1d1d 100%); padding: 0; }
    .dash-header-inner { display: flex; align-items: flex-start; justify-content: space-between;
      padding: 28px 32px 0; }
    .dash-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 2px;
      color: rgba(255,255,255,.45); margin-bottom: 4px; }
    .dash-title { font-size: 26px; font-weight: 800; color: #fff; margin: 0 0 6px; }
    .dash-meta { font-size: 13px; color: rgba(255,255,255,.55); display: flex; gap: 6px; flex-wrap: wrap; }
    .sep { opacity: .4; }
    .btn-edit { padding: 8px 16px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
      color: #fff; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500;
      transition: background .15s; white-space: nowrap; }
    .btn-edit:hover { background: rgba(255,255,255,.2); }

    /* ─── Tab Bar ─── */
    .tab-bar { display: flex; gap: 2px; padding: 20px 32px 0; overflow-x: auto; }
    .tab-btn { padding: 9px 16px; background: transparent; border: none; color: rgba(255,255,255,.55);
      cursor: pointer; font-size: 13px; font-weight: 500; border-bottom: 3px solid transparent;
      transition: all .15s; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
    .tab-btn:hover { color: rgba(255,255,255,.85); }
    .tab-btn.active { color: #fff; border-bottom-color: #ef4444; }

    /* ─── Body ─── */
    .dash-body { padding: 28px 32px; display: flex; flex-direction: column; gap: 20px; }
    .loading-state { display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 80px; color: #6b7280; gap: 16px; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e5e7eb;
      border-top-color: #dc2626; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ─── KPI Row ─── */
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .kpi-card { background: #fff; border-radius: 12px; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.07); }
    .kpi-top-bar { height: 4px; }
    .kpi-green .kpi-top-bar  { background: #16a34a; }
    .kpi-amber .kpi-top-bar  { background: #d97706; }
    .kpi-blue .kpi-top-bar   { background: #2563eb; }
    .kpi-crimson .kpi-top-bar{ background: #dc2626; }
    .kpi-inner { padding: 16px 18px 14px; }
    .kpi-label { font-size: 11px; font-weight: 700; letter-spacing: .8px;
      color: #6b7280; text-transform: uppercase; margin-bottom: 6px; }
    .kpi-value { font-size: 26px; font-weight: 800; color: #111; margin-bottom: 4px; }
    .kpi-green .kpi-value  { color: #16a34a; }
    .kpi-amber .kpi-value  { color: #d97706; }
    .kpi-blue .kpi-value   { color: #2563eb; }
    .kpi-crimson .kpi-value{ color: #dc2626; }
    .trend { font-size: 13px; margin-left: 4px; }
    .trend.up { color: #16a34a; }.trend.down { color: #dc2626; }
    .kpi-sub { font-size: 11.5px; color: #6b7280; margin-bottom: 10px; }
    .kpi-bar-track { height: 5px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
    .kpi-bar-fill { height: 100%; border-radius: 99px; transition: width .4s ease; }
    .kpi-green .kpi-bar-fill  { background: #16a34a; }
    .kpi-amber .kpi-bar-fill  { background: #d97706; }
    .kpi-blue .kpi-bar-fill   { background: #2563eb; }
    .kpi-crimson .kpi-bar-fill{ background: #dc2626; }
    .kpi-sparkline { margin-top: 10px; height: 24px; color: currentColor; opacity: .5; }
    .kpi-green .kpi-sparkline  { color: #16a34a; }
    .kpi-amber .kpi-sparkline  { color: #d97706; }
    .kpi-blue .kpi-sparkline   { color: #2563eb; }
    .kpi-crimson .kpi-sparkline{ color: #dc2626; }
    .kpi-sparkline svg { width: 100%; height: 100%; }

    /* ─── Section Card ─── */
    .section-card { background: #fff; border-radius: 12px; overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,.07); }
    .section-header { display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; border-bottom: 1px solid #f1f5f9; }
    .section-title { font-size: 14px; font-weight: 700; color: #111;
      display: flex; align-items: center; gap: 8px; }
    .accent-crimson .section-header { border-left: 4px solid #dc2626; }
    .accent-green .section-header   { border-left: 4px solid #16a34a; }
    .accent-blue .section-header    { border-left: 4px solid #2563eb; }
    .accent-amber .section-header   { border-left: 4px solid #d97706; }
    .section-type-badge { font-size: 10px; font-weight: 600; color: #9ca3af;
      background: #f9fafb; border: 1px solid #e5e7eb;
      padding: 3px 8px; border-radius: 99px; letter-spacing: .5px; text-transform: uppercase; }
    .section-body { padding: 16px 20px; }

    /* ─── Timeline ─── */
    .timeline { display: flex; flex-direction: column; gap: 0; }
    .timeline-item { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0;
      border-bottom: 1px solid #f8fafc; }
    .timeline-item:last-child { border-bottom: none; }
    .timeline-dot { width: 8px; height: 8px; border-radius: 50%; background: #dc2626;
      flex-shrink: 0; margin-top: 5px; }
    .timeline-text { font-size: 13.5px; color: #374151; line-height: 1.5; }

    /* ─── Metric Table ─── */
    .metric-table { display: flex; flex-direction: column; gap: 10px; }
    .metric-row { display: flex; align-items: center; gap: 12px; padding: 8px 0;
      border-bottom: 1px solid #f8fafc; }
    .metric-row:last-child { border-bottom: none; }
    .metric-label { flex: 1; font-size: 13px; color: #374151; font-weight: 500; }
    .metric-right { display: flex; align-items: center; gap: 10px; }
    .metric-bar-track { width: 140px; height: 6px; background: #f1f5f9; border-radius: 99px; overflow: hidden; }
    .metric-bar-fill { height: 100%; border-radius: 99px; }
    .fill-green  { background: #16a34a; }.fill-amber { background: #d97706; }
    .fill-blue   { background: #2563eb; }.fill-crimson{ background: #dc2626; }
    .metric-pct { font-size: 12px; font-weight: 700; color: #374151; min-width: 36px; text-align: right; }

    /* ─── Status Badges ─── */
    .status-badge { font-size: 11px; font-weight: 600; padding: 3px 9px;
      border-radius: 99px; white-space: nowrap; }
    .st-met       { background: #dcfce7; color: #166534; }
    .st-active    { background: #dbeafe; color: #1d4ed8; }
    .st-at_risk   { background: #fee2e2; color: #991b1b; }
    .st-on_track  { background: #dcfce7; color: #166534; }
    .st-in_progress{ background: #dbeafe; color: #1d4ed8; }
    .st-done      { background: #d1fae5; color: #065f46; }

    /* ─── Checklist ─── */
    .checklist { display: flex; flex-direction: column; gap: 6px; }
    .checklist-item { display: flex; align-items: flex-start; gap: 10px;
      padding: 7px 0; border-bottom: 1px solid #f8fafc; }
    .checklist-item:last-child { border-bottom: none; }
    .check-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
    .check-text { font-size: 13.5px; color: #374151; line-height: 1.4; }
    .checklist-item.done .check-text { color: #6b7280; text-decoration: line-through; }

    /* ─── Action Table ─── */
    .action-table { font-size: 13px; }
    .action-header-row { display: grid; grid-template-columns: 1fr 120px 110px;
      gap: 12px; padding: 6px 0 10px; font-weight: 700; font-size: 11px;
      color: #9ca3af; letter-spacing: .5px; text-transform: uppercase;
      border-bottom: 1px solid #e5e7eb; }
    .action-row { display: grid; grid-template-columns: 1fr 120px 110px;
      gap: 12px; padding: 10px 0; border-bottom: 1px solid #f8fafc;
      align-items: center; }
    .action-row:last-child { border-bottom: none; }
    .action-text { color: #374151; line-height: 1.4; }
    .owner-chip { font-size: 11px; font-weight: 600; padding: 3px 9px;
      border-radius: 99px; white-space: nowrap; display: inline-block; }
    .oc-blue  { background: #dbeafe; color: #1d4ed8; }
    .oc-green { background: #dcfce7; color: #166534; }
    .oc-amber { background: #fef3c7; color: #92400e; }
    .oc-red   { background: #fee2e2; color: #991b1b; }

    /* ─── Insight Blocks ─── */
    .insight-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
    .insight-block { padding: 16px; border-radius: 10px; border-left: 4px solid; }
    .ib-crimson { background: #fef2f2; border-color: #dc2626; }
    .ib-blue    { background: #eff6ff; border-color: #2563eb; }
    .ib-amber   { background: #fffbeb; border-color: #d97706; }
    .ib-green   { background: #f0fdf4; border-color: #16a34a; }
    .ib-heading { font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .8px; margin-bottom: 8px; }
    .ib-crimson .ib-heading { color: #dc2626; }
    .ib-blue .ib-heading    { color: #2563eb; }
    .ib-amber .ib-heading   { color: #d97706; }
    .ib-green .ib-heading   { color: #16a34a; }
    .ib-body { font-size: 13px; color: #374151; line-height: 1.6; }

    /* ─── Focus List ─── */
    .focus-list { display: flex; flex-direction: column; gap: 4px; }
    .focus-item { display: flex; align-items: flex-start; gap: 8px;
      padding: 7px 0; border-bottom: 1px solid #f8fafc; font-size: 13.5px; color: #374151; }
    .focus-item:last-child { border-bottom: none; }
    .focus-dot { color: #d97706; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  scorecards = signal<any[]>([]);
  activeScorecardId = signal<string>('');
  loading = signal(true);

  activeScorecard() {
    return this.scorecards().find(s => s.id === this.activeScorecardId()) || null;
  }

  ngOnInit() {
    this.api.getScorecards().subscribe({
      next: (scs) => {
        this.scorecards.set(scs);
        if (scs.length) this.activeScorecardId.set(scs[0].id);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  selectTab(id: string) { this.activeScorecardId.set(id); }

  sparklinePoints(history: any[]): string {
    if (!history || history.length < 2) return '';
    const vals = history.map((h: any) => +h.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const range = max - min || 1;
    return history.map((h: any, i: number) => {
      const x = (i / (history.length - 1)) * 80;
      const y = 22 - ((+h.value - min) / range) * 20;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  sectionTypeLabel(type: string): string {
    const map: Record<string, string> = {
      timeline: 'Timeline', metric_table: 'Metrics', checklist: 'Checklist',
      action_table: 'Action Items', insight: 'Insights', focus_list: 'Focus Areas'
    };
    return map[type] || type;
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = { met: '✓ Met', active: '~ Active', at_risk: '✗ At Risk' };
    return map[s] || s;
  }

  actionStatusLabel(s: string): string {
    const map: Record<string, string> = {
      on_track: '✓ On Track', in_progress: '~ In Progress',
      at_risk: '✗ At Risk', done: '✓ Done'
    };
    return map[s] || s;
  }
}
