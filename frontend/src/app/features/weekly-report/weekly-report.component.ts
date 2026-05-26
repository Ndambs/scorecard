import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-weekly-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="wr-page">

  <!-- Header -->
  <div class="wr-hdr">
    <div class="wr-hdr-left">
      <div class="badge">Weekly Report</div>
      <h1>UAM Weekly Report{{ auth.isEditor ? ' Editor' : '' }}</h1>
      <p>{{ auth.isEditor ? 'Edit items. Use ▲ ▼ to reorder within each section.' : 'Read-only view.' }}</p>
    </div>
    <div class="wr-hdr-acts">
      @if (auth.isEditor) { <button class="btn-new" (click)="createNew()">+ New Week</button> }
      <button class="btn-dl-w" (click)="dlWeekly()" [disabled]="dlgW()">{{ dlgW()?'⏳ Generating…':'📅 Download Weekly' }}</button>
      <button class="btn-dl-m" (click)="dlMfw()" [disabled]="dlgM()">{{ dlgM()?'⏳ Generating…':'📊 Monthly (from Weeks)' }}</button>
    </div>
  </div>

  <!-- Period selector -->
  @if (reports().length > 1) {
    <div class="period-sel">
      <label>Period:</label>
      <select [(ngModel)]="selectedId" (change)="loadReport(selectedId)" class="fi">
        @for (r of reports(); track r.id) { <option [value]="r.id">{{ r.report_period }}</option> }
      </select>
    </div>
  }

  @if (saving()) { <div class="save-banner">✅ Saved</div> }
  @if (loading()) { <div class="loading">Loading report…</div> }
  @if (!loading() && !auth.isEditor) { <div class="readonly-notice">👁 Read-only — contact an editor to make changes.</div> }

  @if (!loading() && report()) {
    <div class="wr-body">

      <!-- Reporting Period -->
      <div class="wr-card full">
        <div class="wc-title">📅 Reporting Period</div>
        <div class="frow">
          <div class="fg flex2"><label>Period Label</label>
            @if (auth.isEditor) { <input [(ngModel)]="report()!.report_period" class="fi" (change)="autoSave()" placeholder="e.g. 11th May to 16th May 2026" /> }
            @else { <div class="ro">{{ report()!.report_period||'—' }}</div> }
          </div>
          <div class="fg"><label>Week Start</label>
            @if (auth.isEditor) { <input type="date" [(ngModel)]="report()!.week_start" class="fi" (change)="autoSave()" /> }
            @else { <div class="ro">{{ report()!.week_start||'—' }}</div> }
          </div>
          <div class="fg"><label>Week End</label>
            @if (auth.isEditor) { <input type="date" [(ngModel)]="report()!.week_end" class="fi" (change)="autoSave()" /> }
            @else { <div class="ro">{{ report()!.week_end||'—' }}</div> }
          </div>
        </div>
      </div>

      <!-- Slide 2 label -->
      <div class="slide-lbl">Slide 2 — Key Highlights</div>
      <div class="wr-row">
        <!-- Key Highlights -->
        <div class="wr-card">
          <div class="wc-title">🔑 Key Highlights</div>
          <div class="wc-sub">Left column bullet points</div>
          @for (item of report()!.key_highlights; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.key_highlights,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.key_highlights,ii,+1)" [disabled]="ii===report()!.key_highlights.length-1">▼</button></div>
                <span class="idot">•</span>
                <input [(ngModel)]="report()!.key_highlights[ii]" class="fi-sm flex1" (change)="autoSave()" />
                <button class="del" (click)="rm(report()!.key_highlights,ii)">✕</button>
              } @else { <span class="idot">•</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.key_highlights)">+ Add highlight</button> }
        </div>

        <!-- Focus Areas -->
        <div class="wr-card">
          <div class="wc-title">🎯 Focus Areas</div>
          <div class="wc-sub">Left column — below Key Highlights</div>
          @for (item of report()!.focus_areas; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.focus_areas,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.focus_areas,ii,+1)" [disabled]="ii===report()!.focus_areas.length-1">▼</button></div>
                <span class="idot">•</span>
                <input [(ngModel)]="report()!.focus_areas[ii]" class="fi-sm flex1" (change)="autoSave()" />
                <button class="del" (click)="rm(report()!.focus_areas,ii)">✕</button>
              } @else { <span class="idot">•</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.focus_areas)">+ Add focus area</button> }
        </div>
      </div>

      <div class="wr-row">
        <!-- KPI Performance -->
        <div class="wr-card">
          <div class="wc-title">📊 KPI Performance Overview</div>
          <div class="wc-sub">Right column</div>
          @for (item of report()!.kpi_performance; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.kpi_performance,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.kpi_performance,ii,+1)" [disabled]="ii===report()!.kpi_performance.length-1">▼</button></div>
                <span class="idot cb">☐</span>
                <input [(ngModel)]="report()!.kpi_performance[ii]" class="fi-sm flex1" (change)="autoSave()" />
                <button class="del" (click)="rm(report()!.kpi_performance,ii)">✕</button>
              } @else { <span class="idot cb">☐</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.kpi_performance)">+ Add KPI item</button> }
        </div>

        <!-- SR Closure Status -->
        <div class="wr-card">
          <div class="wc-title">🎫 SR Closure Status</div>
          <div class="wc-sub">Right column</div>
          @for (item of report()!.sr_closure_status; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.sr_closure_status,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.sr_closure_status,ii,+1)" [disabled]="ii===report()!.sr_closure_status.length-1">▼</button></div>
                <span class="idot cb">☐</span>
                <input [(ngModel)]="report()!.sr_closure_status[ii]" class="fi-sm flex1" (change)="autoSave()" />
                <button class="del" (click)="rm(report()!.sr_closure_status,ii)">✕</button>
              } @else { <span class="idot cb">☐</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.sr_closure_status)">+ Add SR item</button> }
        </div>

        <!-- Achievements -->
        <div class="wr-card">
          <div class="wc-title">🏆 Achievements</div>
          <div class="wc-sub">Right column</div>
          @for (item of report()!.achievements; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.achievements,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.achievements,ii,+1)" [disabled]="ii===report()!.achievements.length-1">▼</button></div>
                <span class="idot cb">☐</span>
                <input [(ngModel)]="report()!.achievements[ii]" class="fi-sm flex1" (change)="autoSave()" />
                <button class="del" (click)="rm(report()!.achievements,ii)">✕</button>
              } @else { <span class="idot cb">☐</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.achievements)">+ Add achievement</button> }
        </div>
      </div>

      <!-- Slide 3 label -->
      <div class="slide-lbl">Slide 3 — KPIs &amp; Summary</div>
      <div class="wr-row">
        <!-- SRs Closure -->
        <div class="wr-card">
          <div class="wc-title">🎫 SRs Closure</div>
          @for (item of report()!.srs_closure; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.srs_closure,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.srs_closure,ii,+1)" [disabled]="ii===report()!.srs_closure.length-1">▼</button></div>
                <span class="idot cb">☐</span><input [(ngModel)]="report()!.srs_closure[ii]" class="fi-sm flex1" (change)="autoSave()" /><button class="del" (click)="rm(report()!.srs_closure,ii)">✕</button>
              } @else { <span class="idot cb">☐</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.srs_closure)">+ Add</button> }
        </div>

        <!-- VF Focus -->
        <div class="wr-card">
          <div class="wc-title">📡 Focus Area – Vodafone</div>
          @for (item of report()!.vf_focus_items; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.vf_focus_items,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.vf_focus_items,ii,+1)" [disabled]="ii===report()!.vf_focus_items.length-1">▼</button></div>
                <span class="idot cb">☐</span><input [(ngModel)]="report()!.vf_focus_items[ii]" class="fi-sm flex1" (change)="autoSave()" /><button class="del" (click)="rm(report()!.vf_focus_items,ii)">✕</button>
              } @else { <span class="idot cb">☐</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.vf_focus_items)">+ Add</button> }
        </div>
      </div>

      <!-- Q1 & Q4 reviews -->
      <div class="wr-row">
        <!-- Q1 -->
        <div class="wr-card">
          <div class="wc-title">📋 Q1 User Review</div>
          @for (item of report()!.q1_user_review; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mvR(report()!.q1_user_review,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mvR(report()!.q1_user_review,ii,+1)" [disabled]="ii===report()!.q1_user_review.length-1">▼</button></div>
                <span class="idot cb">☐</span>
                <input [(ngModel)]="item.label" class="fi-sm flex1" (change)="autoSave()" placeholder="e.g. G2 Audit" />
                <select [(ngModel)]="item.status" class="fi-sm ssel" (change)="autoSave()">
                  <option>In progress</option><option>Complete</option><option>Not started</option><option>On hold</option>
                </select>
                <button class="del" (click)="rmR(report()!.q1_user_review,ii)">✕</button>
              } @else {
                <span class="idot cb">☐</span>
                <span class="ro-item">{{ item.label }} — <span class="sc" [class]="sc(item.status)">{{ item.status }}</span></span>
              }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="addR(report()!.q1_user_review)">+ Add Q1 item</button> }
        </div>

        <!-- Q4 -->
        <div class="wr-card">
          <div class="wc-title">📋 Q4 User Review</div>
          @for (item of report()!.q4_user_review; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mvR(report()!.q4_user_review,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mvR(report()!.q4_user_review,ii,+1)" [disabled]="ii===report()!.q4_user_review.length-1">▼</button></div>
                <span class="idot cb">☐</span>
                <input [(ngModel)]="item.label" class="fi-sm flex1" (change)="autoSave()" placeholder="e.g. NAP" />
                <select [(ngModel)]="item.status" class="fi-sm ssel" (change)="autoSave()">
                  <option>In progress</option><option>Complete</option><option>Not started</option><option>On hold</option>
                </select>
                <button class="del" (click)="rmR(report()!.q4_user_review,ii)">✕</button>
              } @else {
                <span class="idot cb">☐</span>
                <span class="ro-item">{{ item.label }} — <span class="sc" [class]="sc(item.status)">{{ item.status }}</span></span>
              }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="addR(report()!.q4_user_review)">+ Add Q4 item</button> }
        </div>
      </div>

      <div class="wr-row">
        <!-- SmartApp & Hub -->
        <div class="wr-card">
          <div class="wc-title">📱 SmartApp &amp; Hub Focus</div>
          @for (item of report()!.smartapp_hub_focus; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.smartapp_hub_focus,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.smartapp_hub_focus,ii,+1)" [disabled]="ii===report()!.smartapp_hub_focus.length-1">▼</button></div>
                <span class="idot cb">☐</span><input [(ngModel)]="report()!.smartapp_hub_focus[ii]" class="fi-sm flex1" (change)="autoSave()" /><button class="del" (click)="rm(report()!.smartapp_hub_focus,ii)">✕</button>
              } @else { <span class="idot cb">☐</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.smartapp_hub_focus)">+ Add</button> }
        </div>

        <!-- General Focus -->
        <div class="wr-card">
          <div class="wc-title">🎯 General Focus Areas</div>
          @for (item of report()!.general_focus_areas; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.general_focus_areas,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.general_focus_areas,ii,+1)" [disabled]="ii===report()!.general_focus_areas.length-1">▼</button></div>
                <span class="idot cb">☐</span><input [(ngModel)]="report()!.general_focus_areas[ii]" class="fi-sm flex1" (change)="autoSave()" /><button class="del" (click)="rm(report()!.general_focus_areas,ii)">✕</button>
              } @else { <span class="idot cb">☐</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.general_focus_areas)">+ Add</button> }
        </div>

        <!-- Other -->
        <div class="wr-card">
          <div class="wc-title">📌 Other</div>
          @for (item of report()!.other_items; track ii; let ii=$index) {
            <div class="irow">
              @if (auth.isEditor) {
                <div class="rbtns"><button class="rb" (click)="mv(report()!.other_items,ii,-1)" [disabled]="ii===0">▲</button><button class="rb" (click)="mv(report()!.other_items,ii,+1)" [disabled]="ii===report()!.other_items.length-1">▼</button></div>
                <span class="idot cb">☐</span><input [(ngModel)]="report()!.other_items[ii]" class="fi-sm flex1" (change)="autoSave()" /><button class="del" (click)="rm(report()!.other_items,ii)">✕</button>
              } @else { <span class="idot cb">☐</span><span class="ro-item">{{ item }}</span> }
            </div>
          }
          @if (auth.isEditor) { <button class="btn-add" (click)="add(report()!.other_items)">+ Add</button> }
        </div>
      </div>

      <!-- Bottom action bar (Publish-equivalent = Save; no separate publish for weekly) -->
      @if (auth.isEditor) {
        <div class="bottom-bar">
          <button class="btn-save-full" (click)="save()">💾 Save Report</button>
          <button class="btn-dl-w" (click)="dlWeekly()" [disabled]="dlgW()">{{ dlgW()?'⏳':'📅 Download Weekly PPTX' }}</button>
          <button class="btn-dl-m" (click)="dlMfw()" [disabled]="dlgM()">{{ dlgM()?'⏳':'📊 Monthly (from All Weeks)' }}</button>
        </div>
      }

    </div>
  }
</div>`,

  styles: [`
*{box-sizing:border-box}
.wr-page{font-family:system-ui,-apple-system,sans-serif;padding:24px 28px;background:#f1f5f9;min-height:100vh}
.wr-hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px}
.wr-hdr-left h1{font-size:21px;font-weight:800;color:#111;margin:3px 0}
.wr-hdr-left p{font-size:12.5px;color:#6b7280;margin:0}
.badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:1px;background:#1D8348;color:#fff;padding:3px 10px;border-radius:99px;margin-bottom:3px}
.wr-hdr-acts{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.btn-new{padding:7px 13px;background:#fff;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;color:#374151}
.btn-new:hover{border-color:#1D8348;color:#1D8348}
.btn-dl-w{padding:8px 14px;background:#1D8348;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap}
.btn-dl-w:hover:not(:disabled){background:#166534}.btn-dl-w:disabled{opacity:.6;cursor:not-allowed}
.btn-dl-m{padding:8px 14px;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap}
.btn-dl-m:hover:not(:disabled){background:#6d28d9}.btn-dl-m:disabled{opacity:.6;cursor:not-allowed}
.period-sel{display:flex;align-items:center;gap:9px;margin-bottom:14px;font-size:13px;font-weight:600;color:#374151}
.save-banner{background:#dcfce7;color:#166534;padding:7px 13px;border-radius:8px;font-size:13px;font-weight:600;margin-bottom:11px}
.loading{color:#6b7280;font-size:13px;padding:18px 0}
.readonly-notice{background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:9px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;font-weight:500}
.wr-body{display:flex;flex-direction:column;gap:12px}
.slide-lbl{font-size:11px;font-weight:700;letter-spacing:1.5px;color:#9ca3af;text-transform:uppercase;padding:10px 0 3px}
.wr-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:12px}
.wr-card{background:#fff;border-radius:12px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.wr-card.full{}
.wc-title{font-size:13px;font-weight:700;color:#111;margin-bottom:2px}
.wc-sub{font-size:11px;color:#9ca3af;margin-bottom:8px;font-style:italic}
.frow{display:flex;gap:9px;flex-wrap:wrap}
.fg{display:flex;flex-direction:column;margin-bottom:7px}
.fg label{font-size:10px;font-weight:700;color:#6b7280;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px}
.flex1{flex:1}.flex2{flex:2}
.fi{width:100%;padding:7px 9px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;outline:none}
.fi:focus{border-color:#1D8348}
.fi-sm{padding:5px 7px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:12px;outline:none}
.fi-sm:focus{border-color:#1D8348}
.ro{font-size:13.5px;color:#374151;font-weight:600;padding:5px 0}
.ro-item{font-size:13px;color:#374151;flex:1;line-height:1.4}

/* Reorder arrows */
.rbtns{display:flex;flex-direction:column;gap:1px;flex-shrink:0}
.rb{width:18px;height:14px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:2px;cursor:pointer;font-size:8px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0}
.rb:hover:not(:disabled){background:#e5e7eb}.rb:disabled{opacity:.25;cursor:default}

/* Item rows */
.irow{display:flex;align-items:center;gap:5px;margin-bottom:5px}
.idot{font-size:13px;color:#6b7280;flex-shrink:0}
.idot.cb{color:#1D8348}
.del{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:11px;padding:0 3px;flex-shrink:0}
.del:hover{color:#dc2626}
.btn-add{width:100%;padding:6px;border:2px dashed #e5e7eb;background:transparent;color:#6b7280;border-radius:7px;cursor:pointer;font-size:12px;margin-top:3px}
.btn-add:hover{border-color:#1D8348;color:#1D8348}
.ssel{min-width:105px}

/* Status chips */
.sc{font-size:11px;font-weight:600;padding:2px 7px;border-radius:99px}
.sc.complete{background:#dcfce7;color:#166534}
.sc.in-progress{background:#dbeafe;color:#1d4ed8}
.sc.not-started{background:#f3f4f6;color:#6b7280}
.sc.on-hold{background:#fef3c7;color:#92400e}

/* Bottom bar */
.bottom-bar{background:#fff;border-radius:12px;padding:13px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);display:flex;gap:9px;align-items:center;border:2px solid #f1f5f9;flex-wrap:wrap}
.btn-save-full{flex:1;min-width:140px;padding:10px;background:#1a1f2e;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700}
.btn-save-full:hover{background:#2d3748}
  `]
})
export class WeeklyReportComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  reports    = signal<any[]>([]);
  report     = signal<any>(null);
  loading    = signal(true);
  saving     = signal(false);
  dlgW       = signal(false);
  dlgM       = signal(false);
  selectedId = '';
  private saveTimer: any;

  ngOnInit() {
    this.api.getWeeklyReports().subscribe({
      next: rs => { this.reports.set(rs); if (rs.length) { this.selectedId=rs[0].id; this.report.set(this.clone(rs[0])); } this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  clone(o: any) { return JSON.parse(JSON.stringify(o)); }

  loadReport(id: string) {
    const r = this.reports().find(x => x.id === id);
    if (r) this.report.set(this.clone(r));
  }

  // ── Generic array helpers ─────────────────────────────────────────────────
  add(arr: any[]) { arr.push(''); this.autoSave(); }
  rm(arr: any[], i: number) { arr.splice(i, 1); this.autoSave(); }
  mv(arr: any[], i: number, d: -1|1) {
    const t = i + d;
    if (t < 0 || t >= arr.length) return;
    [arr[i], arr[t]] = [arr[t], arr[i]];
    this.autoSave();
  }

  // Review item helpers
  addR(arr: any[]) { arr.push({ label: '', status: 'In progress' }); this.autoSave(); }
  rmR(arr: any[], i: number) { arr.splice(i, 1); this.autoSave(); }
  mvR(arr: any[], i: number, d: -1|1) {
    const t = i + d;
    if (t < 0 || t >= arr.length) return;
    [arr[i], arr[t]] = [arr[t], arr[i]];
    this.autoSave();
  }

  autoSave() {
    if (!this.auth.isEditor) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 1400);
  }

  save() {
    if (!this.auth.isEditor) return;
    const r = this.report(); if (!r) return;
    this.api.updateWeeklyReport(r.id, r).subscribe({
      next: (updated: any) => {
        this.report.set(this.clone(updated));
        const arr = [...this.reports()], idx = arr.findIndex(x => x.id === r.id);
        if (idx >= 0) { arr[idx] = updated; this.reports.set(arr); }
        this.saving.set(true); setTimeout(() => this.saving.set(false), 2000);
      }
    });
  }

  createNew() {
    if (!this.auth.isEditor) return;
    const today = new Date(), end = new Date(today);
    end.setDate(today.getDate() + 4);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
    this.api.createWeeklyReport({
      report_period: `${fmt(today)} to ${fmt(end)}`,
      week_start: today.toISOString().slice(0,10), week_end: end.toISOString().slice(0,10),
      key_highlights:[], focus_areas:[], kpi_performance:[], sr_closure_status:[],
      achievements:[], srs_closure:[], vf_focus_items:[], general_focus_areas:[],
      q1_user_review:[], q4_user_review:[], smartapp_hub_focus:[], other_items:[]
    }).subscribe((created: any) => {
      this.reports.set([created, ...this.reports()]);
      this.selectedId = created.id;
      this.report.set(this.clone(created));
    });
  }

  sc(s: string): string {
    const m: Record<string,string> = {'Complete':'complete','In progress':'in-progress','Not started':'not-started','On hold':'on-hold'};
    return m[s] || 'not-started';
  }

  private _dl(url: string, fallback: string, flag: any) {
    flag.set(true);
    const token = localStorage.getItem('uam_token');
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(t || res.statusText); });
        const cd = res.headers.get('Content-Disposition') || '';
        const m = cd.match(/filename="?([^"]+)"?/);
        return res.blob().then(blob => ({ blob, filename: m ? m[1] : fallback }));
      })
      .then(({ blob, filename }: any) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      })
      .catch(err => alert('Download failed: ' + (err.message || err)))
      .finally(() => flag.set(false));
  }

  dlWeekly() {
    const r = this.report();
    this._dl(`${environment.apiUrl}/export/weekly-pptx${r?'?report_id='+r.id:''}`, 'UAM_Weekly_Report.pptx', this.dlgW);
  }
  dlMfw() { this._dl(`${environment.apiUrl}/export/monthly-from-weekly`, 'UAM_Monthly_Report.pptx', this.dlgM); }
}
