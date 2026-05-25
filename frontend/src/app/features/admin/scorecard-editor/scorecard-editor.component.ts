import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-scorecard-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="ep">
  <div class="ehdr">
    <div><h1>Edit Scorecards</h1><p>Reorder sections and items with ▲ ▼. Add sections anywhere.</p></div>
    @if (auth.isAdmin) { <button class="btn-primary" (click)="openNewScorecard()">+ New Scorecard</button> }
  </div>

  <div class="sc-tabs">
    @for (sc of scorecards(); track sc.id) {
      <button class="sc-tab" [class.active]="sc.id === activeScorecardId()" (click)="selectScorecard(sc.id)">
        {{ sc.icon }} {{ sc.title }}
      </button>
    }
  </div>

  @if (loading()) { <div class="loading">Loading…</div> }

  @if (!loading() && activeScorecard()) {
    <div class="ebody">
      <div class="eleft">

        <!-- ── Scorecard Meta ─── -->
        <div class="panel">
          <div class="panel-title">📋 Scorecard Info</div>
          <div class="frow">
            <div class="fg flex2"><label>Title</label><input [(ngModel)]="em.title" class="fi" /></div>
            <div class="fg"><label>Icon</label><input [(ngModel)]="em.icon" class="fi" style="width:64px" /></div>
          </div>
          <div class="fg"><label>Subtitle</label><input [(ngModel)]="em.subtitle" class="fi" /></div>
          <div class="frow" style="margin-top:8px">
            <div class="fg flex2"><label>Period</label><input [(ngModel)]="em.period" class="fi" placeholder="e.g. April 2026" /></div>
            <div class="fg"><label>Color</label>
              <select [(ngModel)]="em.accent_color" class="fi">
                <option value="crimson">Crimson</option><option value="green">Green</option>
                <option value="blue">Blue</option><option value="amber">Amber</option>
              </select>
            </div>
          </div>
          <div class="btn-row" style="margin-top:10px">
            <button class="btn-save" (click)="saveMeta()">💾 Save Changes</button>
          </div>
          @if (metaSaved()) { <div class="saved-msg">✅ Saved</div> }
        </div>

        <!-- ── KPI Cards ─── -->
        <div class="panel">
          <div class="panel-title">📊 KPI Cards <span class="hint">▲ ▼ to reorder</span></div>
          @for (kpi of activeScorecard()!.kpis; track kpi.id; let ki = $index) {
            <div class="kpi-card">
              <div class="rbtns">
                <button class="rb" (click)="moveKpi(ki,-1)" [disabled]="ki===0">▲</button>
                <button class="rb" (click)="moveKpi(ki,+1)" [disabled]="ki===activeScorecard()!.kpis.length-1">▼</button>
              </div>
              <div class="kfi">
                <div class="frow">
                  <div class="fg flex2"><label>Label</label><input [(ngModel)]="kpi.label" class="fi-sm" (change)="patchKpi(kpi)" /></div>
                  <div class="fg"><label>Value</label><input [(ngModel)]="kpi.value" class="fi-sm" (change)="patchKpi(kpi)" /></div>
                </div>
                <div class="fg"><label>Sub Text</label><input [(ngModel)]="kpi.sub_text" class="fi-sm" (change)="patchKpi(kpi)" /></div>
                <div class="frow" style="margin-top:6px">
                  <div class="fg"><label>Bar %</label><input type="number" [(ngModel)]="kpi.bar_percent" min="0" max="100" class="fi-sm" style="width:60px" (change)="patchKpi(kpi)" /></div>
                  <div class="fg"><label>Color</label>
                    <select [(ngModel)]="kpi.color" class="fi-sm" (change)="patchKpi(kpi)">
                      <option value="green">Green</option><option value="amber">Amber</option>
                      <option value="blue">Blue</option><option value="crimson">Crimson</option>
                    </select>
                  </div>
                  <div class="fg"><label>Trend</label>
                    <select [(ngModel)]="kpi.trend" class="fi-sm" (change)="patchKpi(kpi)">
                      <option value="up">↑ Up</option><option value="stable">→ Stable</option><option value="down">↓ Down</option>
                    </select>
                  </div>
                </div>
                <div class="hist-row">
                  <input [(ngModel)]="kpi._hp" placeholder="Period (e.g. May 2026)" class="fi-sm" style="flex:1" />
                  <input type="number" [(ngModel)]="kpi._hv" placeholder="Value" class="fi-sm" style="width:72px" />
                  <button class="btn-xs" (click)="addHistory(kpi)">+ History</button>
                </div>
              </div>
              <button class="del-corner" (click)="deleteKpi(kpi.id)">✕</button>
            </div>
          }
          <button class="btn-dashed" (click)="showNewKpi=true">+ Add KPI Card</button>
        </div>

        <!-- ── Sections ─── -->
        <div class="panel">
          <div class="panel-title">🗂️ Sections <span class="hint">▲ ▼ to reorder · click to expand</span></div>

          @for (sec of activeScorecard()!.sections; track sec.id; let si = $index) {
            <div class="sec-card" [class.open]="expandedSection()===sec.id">
              <!-- Header row -->
              <div class="sec-hdr">
                <div class="rbtns col">
                  <button class="rb sm" (click)="moveSec(si,-1)" [disabled]="si===0">▲</button>
                  <button class="rb sm" (click)="moveSec(si,+1)" [disabled]="si===activeScorecard()!.sections.length-1">▼</button>
                </div>
                <div class="sec-hdr-lbl" (click)="toggleSec(sec.id)">
                  <span>{{ sec.icon||'📄' }}</span>
                  <span class="sec-name">{{ sec.title }}</span>
                  <span class="type-pill">{{ sec.section_type }}</span>
                </div>
                <div class="sec-hdr-acts">
                  <button class="ico-btn" (click)="saveSec(sec)" title="Save">💾</button>
                  <button class="ico-btn red" (click)="deleteSec(sec.id)" title="Delete">🗑️</button>
                  <span class="chev" (click)="toggleSec(sec.id)">{{ expandedSection()===sec.id?'▲':'▼' }}</span>
                </div>
              </div>

              <!-- Expanded body -->
              @if (expandedSection()===sec.id) {
                <div class="sec-body">
                  <!-- Always-editable meta including title -->
                  <div class="sec-meta">
                    <div class="fg flex2"><label>Section Title</label><input [(ngModel)]="sec.title" class="fi-sm" /></div>
                    <div class="fg" style="width:60px"><label>Icon</label><input [(ngModel)]="sec.icon" class="fi-sm" /></div>
                    <div class="fg"><label>Color</label>
                      <select [(ngModel)]="sec.accent_color" class="fi-sm">
                        <option value="crimson">Crimson</option><option value="green">Green</option>
                        <option value="blue">Blue</option><option value="amber">Amber</option>
                      </select>
                    </div>
                  </div>

                  <!-- TIMELINE -->
                  @if (sec.section_type==='timeline') {
                    @for (it of sec.timeline_items; track it.id; let ii=$index) {
                      <div class="irow">
                        <div class="rbtns col xs">
                          <button class="rb xs" (click)="mvTimeline(sec,ii,-1)" [disabled]="ii===0">▲</button>
                          <button class="rb xs" (click)="mvTimeline(sec,ii,+1)" [disabled]="ii===sec.timeline_items.length-1">▼</button>
                        </div>
                        <span class="idot">▸</span>
                        <input [(ngModel)]="it.text" class="fi-sm flex1" />
                        <button class="del-sm" (click)="delTimeline(sec,it.id)">✕</button>
                      </div>
                    }
                    <div class="add-row"><input [(ngModel)]="sec._nt" placeholder="New entry…" class="fi-sm flex1" (keyup.enter)="addTimeline(sec)" /><button class="btn-xs" (click)="addTimeline(sec)">+ Add</button></div>
                  }

                  <!-- CHECKLIST -->
                  @if (sec.section_type==='checklist') {
                    @for (it of sec.checklist_items; track it.id; let ii=$index) {
                      <div class="irow">
                        <div class="rbtns col xs">
                          <button class="rb xs" (click)="mvChecklist(sec,ii,-1)" [disabled]="ii===0">▲</button>
                          <button class="rb xs" (click)="mvChecklist(sec,ii,+1)" [disabled]="ii===sec.checklist_items.length-1">▼</button>
                        </div>
                        <input type="checkbox" [(ngModel)]="it.done" (change)="patchChecklist(it)" />
                        <input [(ngModel)]="it.text" class="fi-sm flex1" [class.stk]="it.done" (change)="patchChecklist(it)" />
                        <button class="del-sm" (click)="delChecklist(sec,it.id)">✕</button>
                      </div>
                    }
                    <div class="add-row"><input [(ngModel)]="sec._nt" placeholder="New item…" class="fi-sm flex1" (keyup.enter)="addChecklist(sec)" /><button class="btn-xs" (click)="addChecklist(sec)">+ Add</button></div>
                  }

                  <!-- FOCUS LIST -->
                  @if (sec.section_type==='focus_list') {
                    @for (it of sec.focus_items; track it.id; let ii=$index) {
                      <div class="irow">
                        <div class="rbtns col xs">
                          <button class="rb xs" (click)="mvFocus(sec,ii,-1)" [disabled]="ii===0">▲</button>
                          <button class="rb xs" (click)="mvFocus(sec,ii,+1)" [disabled]="ii===sec.focus_items.length-1">▼</button>
                        </div>
                        <span class="idot">▸</span>
                        <input [(ngModel)]="it.text" class="fi-sm flex1" (change)="patchFocus(it)" />
                        <button class="del-sm" (click)="delFocus(sec,it.id)">✕</button>
                      </div>
                    }
                    <div class="add-row"><input [(ngModel)]="sec._nt" placeholder="New item…" class="fi-sm flex1" (keyup.enter)="addFocus(sec)" /><button class="btn-xs" (click)="addFocus(sec)">+ Add</button></div>
                  }

                  <!-- METRIC TABLE -->
                  @if (sec.section_type==='metric_table') {
                    <div class="metric-hdr">
                      <span style="width:40px"></span><span class="flex1">Label</span>
                      <span style="width:56px;text-align:center">Bar %</span>
                      <span style="width:80px;text-align:center">Color</span>
                      <span style="width:86px;text-align:center">Status</span>
                      <span style="width:24px"></span>
                    </div>
                    @for (row of sec.metric_rows; track row.id; let ii=$index) {
                      <div class="irow">
                        <div class="rbtns col xs">
                          <button class="rb xs" (click)="mvMetric(sec,ii,-1)" [disabled]="ii===0">▲</button>
                          <button class="rb xs" (click)="mvMetric(sec,ii,+1)" [disabled]="ii===sec.metric_rows.length-1">▼</button>
                        </div>
                        <input [(ngModel)]="row.label" class="fi-sm flex1" (change)="patchMetric(row)" />
                        <input type="number" [(ngModel)]="row.bar_percent" min="0" max="100" class="fi-sm" style="width:56px" (change)="patchMetric(row)" />
                        <select [(ngModel)]="row.bar_color" class="fi-sm" style="width:80px" (change)="patchMetric(row)">
                          <option value="green">Green</option><option value="amber">Amber</option>
                          <option value="blue">Blue</option><option value="crimson">Crimson</option>
                        </select>
                        <select [(ngModel)]="row.status" class="fi-sm" style="width:86px" (change)="patchMetric(row)">
                          <option value="met">✓ Met</option><option value="active">~ Active</option><option value="at_risk">✗ At Risk</option>
                        </select>
                        <button class="del-sm" (click)="delMetric(sec,row.id)">✕</button>
                      </div>
                    }
                    <div class="add-row"><input [(ngModel)]="sec._nt" placeholder="New row label (e.g. Hub Status)…" class="fi-sm flex1" (keyup.enter)="addMetric(sec)" /><button class="btn-xs" (click)="addMetric(sec)">+ Add Row</button></div>
                  }

                  <!-- ACTION TABLE -->
                  @if (sec.section_type==='action_table') {
                    @for (it of sec.action_items; track it.id; let ii=$index) {
                      <div class="irow wrap">
                        <div class="rbtns col xs">
                          <button class="rb xs" (click)="mvAction(sec,ii,-1)" [disabled]="ii===0">▲</button>
                          <button class="rb xs" (click)="mvAction(sec,ii,+1)" [disabled]="ii===sec.action_items.length-1">▼</button>
                        </div>
                        <input [(ngModel)]="it.action_text" class="fi-sm flex1" (change)="patchAction(it)" />
                        <input [(ngModel)]="it.owner" class="fi-sm" style="width:88px" placeholder="Owner" (change)="patchAction(it)" />
                        <select [(ngModel)]="it.status" class="fi-sm" style="width:110px" (change)="patchAction(it)">
                          <option value="on_track">✓ On Track</option><option value="in_progress">~ In Progress</option>
                          <option value="at_risk">✗ At Risk</option><option value="done">✓ Done</option>
                        </select>
                        <button class="del-sm" (click)="delAction(sec,it.id)">✕</button>
                      </div>
                    }
                    <div class="add-row">
                      <input [(ngModel)]="sec._nt" placeholder="New action…" class="fi-sm flex1" (keyup.enter)="addAction(sec)" />
                      <input [(ngModel)]="sec._no" placeholder="Owner" class="fi-sm" style="width:88px" />
                      <button class="btn-xs" (click)="addAction(sec)">+ Add</button>
                    </div>
                  }

                  <!-- INSIGHT -->
                  @if (sec.section_type==='insight') {
                    @for (bl of sec.insight_blocks; track bl.id; let ii=$index) {
                      <div class="insight-blk">
                        <div class="irow">
                          <div class="rbtns col xs">
                            <button class="rb xs" (click)="mvInsight(sec,ii,-1)" [disabled]="ii===0">▲</button>
                            <button class="rb xs" (click)="mvInsight(sec,ii,+1)" [disabled]="ii===sec.insight_blocks.length-1">▼</button>
                          </div>
                          <input [(ngModel)]="bl.heading" class="fi-sm flex1" placeholder="Heading" (change)="patchInsight(bl)" />
                          <select [(ngModel)]="bl.color" class="fi-sm" style="width:86px" (change)="patchInsight(bl)">
                            <option value="crimson">Crimson</option><option value="blue">Blue</option>
                            <option value="amber">Amber</option><option value="green">Green</option>
                          </select>
                          <button class="del-sm" (click)="delInsight(sec,bl.id)">✕</button>
                        </div>
                        <textarea [(ngModel)]="bl.body" class="fi-sm ta" (change)="patchInsight(bl)"></textarea>
                      </div>
                    }
                    <button class="btn-xs" style="margin-top:6px" (click)="addInsight(sec)">+ Add Insight Block</button>
                  }

                  <!-- Section save (within section) -->
                  <div class="sec-save-row">
                    <button class="btn-save-sec" (click)="saveSec(sec)">💾 Save "{{ sec.title }}"</button>
                  </div>
                </div>
              }

              <!-- Insert section below strip -->
              <div class="insert-below" (click)="openInsert(si+1)">＋ Add section below</div>
            </div>
          }

          <button class="btn-dashed" (click)="openInsert(activeScorecard()!.sections.length)">+ Add Section at Bottom</button>
        </div>

        <!-- ── Bottom bar: Save + Publish (Publish ONLY here) ─── -->
        <div class="bottom-bar">
          <button class="btn-save-full" (click)="saveMeta()">💾 Save Scorecard Info</button>
          <button class="btn-publish-full" (click)="publishScorecard()">🚀 Publish Scorecard</button>
        </div>
        @if (pubOk()) { <div class="pub-msg">✅ Published successfully</div> }

      </div>

      <!-- ── Right: Live Preview ─── -->
      <div class="eright">
        <div class="prev-hdr">
          <span>👁 Live Preview</span>
          <span class="prev-badge" [class]="'pb-'+activeScorecard()!.status">{{ activeScorecard()!.status }}</span>
        </div>
        <div class="prev-title">{{ activeScorecard()!.title }}</div>
        <div class="prev-period">{{ activeScorecard()!.period }}</div>
        <div class="prev-kpis">
          @for (k of activeScorecard()!.kpis; track k.id) {
            <div class="pk" [class]="'pk-'+k.color">
              <div class="pk-lbl">{{ k.label }}</div>
              <div class="pk-val">{{ k.value }}</div>
              <div class="pk-bar"><div class="pk-fill" [style.width.%]="k.bar_percent"></div></div>
            </div>
          }
        </div>
        <div class="prev-secs">
          @for (s of activeScorecard()!.sections; track s.id; let si=$index) {
            <div class="ps" (click)="toggleSec(s.id)" [class.ps-active]="expandedSection()===s.id">
              <span class="ps-num">{{ si+1 }}</span>
              <div class="ps-info">
                <div class="ps-title">{{ s.icon }} {{ s.title }}</div>
                <div class="ps-type">{{ s.section_type }} · {{ itemCount(s) }} items</div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  }

  <!-- Modal: New KPI -->
  @if (showNewKpi) {
    <div class="mo" (click)="showNewKpi=false">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-title">New KPI Card</div>
        <div class="frow"><div class="fg flex2"><label>Label</label><input [(ngModel)]="nk.label" class="fi" /></div>
          <div class="fg"><label>Value</label><input [(ngModel)]="nk.value" class="fi" /></div></div>
        <div class="fg"><label>Sub Text</label><input [(ngModel)]="nk.sub_text" class="fi" /></div>
        <div class="frow" style="margin-top:8px">
          <div class="fg"><label>Bar %</label><input type="number" [(ngModel)]="nk.bar_percent" class="fi" min="0" max="100" /></div>
          <div class="fg"><label>Color</label><select [(ngModel)]="nk.color" class="fi"><option value="green">Green</option><option value="amber">Amber</option><option value="blue">Blue</option><option value="crimson">Crimson</option></select></div>
          <div class="fg"><label>Trend</label><select [(ngModel)]="nk.trend" class="fi"><option value="up">↑ Up</option><option value="stable">→ Stable</option><option value="down">↓ Down</option></select></div>
        </div>
        <div class="mbtns"><button class="btn-secondary" (click)="showNewKpi=false">Cancel</button><button class="btn-primary" (click)="createKpi()">Create</button></div>
      </div>
    </div>
  }

  <!-- Modal: New / Insert Section -->
  @if (showNewSection) {
    <div class="mo" (click)="showNewSection=false">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-title">
          {{ insertAt < (activeScorecard()?.sections?.length??0) ? 'Insert Section at Position '+(insertAt+1) : 'Add Section at Bottom' }}
        </div>
        <div class="fg"><label>Section Title</label><input [(ngModel)]="ns.title" class="fi" placeholder="e.g. Hub Status by Team" autofocus /></div>
        <div class="frow" style="margin-top:8px">
          <div class="fg flex2"><label>Type</label>
            <select [(ngModel)]="ns.section_type" class="fi">
              <option value="timeline">Timeline</option>
              <option value="checklist">Checklist</option>
              <option value="metric_table">Metric Table (bar rows)</option>
              <option value="action_table">Action Table</option>
              <option value="insight">Insights (3-column)</option>
              <option value="focus_list">Focus List</option>
            </select>
          </div>
          <div class="fg" style="width:64px"><label>Icon</label><input [(ngModel)]="ns.icon" class="fi" /></div>
          <div class="fg"><label>Color</label>
            <select [(ngModel)]="ns.accent_color" class="fi">
              <option value="crimson">Crimson</option><option value="green">Green</option>
              <option value="blue">Blue</option><option value="amber">Amber</option>
            </select>
          </div>
        </div>
        <div class="mbtns"><button class="btn-secondary" (click)="showNewSection=false">Cancel</button><button class="btn-primary" (click)="createSec()">Create Section</button></div>
      </div>
    </div>
  }
</div>`,

  styles: [`
*{box-sizing:border-box}
.ep{font-family:system-ui,-apple-system,sans-serif;padding:22px 28px;background:#f1f5f9;min-height:100vh}
.ehdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
.ehdr h1{font-size:21px;font-weight:800;color:#111;margin:0 0 3px}
.ehdr p{font-size:12.5px;color:#6b7280;margin:0}
.sc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.sc-tab{padding:7px 14px;border:1.5px solid #e5e7eb;background:#fff;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:#374151;transition:all .15s}
.sc-tab:hover{border-color:#dc2626}.sc-tab.active{background:#dc2626;color:#fff;border-color:#dc2626}
.loading{padding:40px;text-align:center;color:#6b7280}
.ebody{display:grid;grid-template-columns:1fr 270px;gap:16px;align-items:start}
.eleft{display:flex;flex-direction:column;gap:12px}
.panel{background:#fff;border-radius:12px;padding:15px 17px;box-shadow:0 1px 4px rgba(0,0,0,.07)}
.panel-title{font-size:13px;font-weight:700;color:#111;margin-bottom:11px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}
.hint{font-size:10px;font-weight:400;color:#9ca3af}
.fg{display:flex;flex-direction:column;margin-bottom:8px}
.fg label{font-size:10px;font-weight:700;color:#6b7280;margin-bottom:3px;text-transform:uppercase;letter-spacing:.4px}
.flex1{flex:1}.flex2{flex:2}
.frow{display:flex;gap:8px;flex-wrap:wrap}
.fi{width:100%;padding:7px 9px;border:1.5px solid #e5e7eb;border-radius:7px;font-size:13px;outline:none}
.fi:focus{border-color:#dc2626}
.fi-sm{padding:5px 7px;border:1.5px solid #e5e7eb;border-radius:6px;font-size:12px;outline:none}
.fi-sm:focus{border-color:#dc2626}
.ta{width:100%;min-height:68px;resize:vertical;font-family:inherit;margin-top:4px}
.btn-row{display:flex;gap:8px}
.btn-save{padding:7px 16px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600}
.btn-save:hover{background:#15803d}
.saved-msg{font-size:12px;color:#16a34a;margin-top:5px;font-weight:600}

/* Reorder */
.rbtns{display:flex;flex-direction:column;gap:1px;flex-shrink:0}
.rbtns.col{flex-direction:column}
.rb{width:22px;height:17px;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:3px;cursor:pointer;font-size:9px;line-height:1;display:flex;align-items:center;justify-content:center;padding:0}
.rb:hover:not(:disabled){background:#e5e7eb}.rb:disabled{opacity:.28;cursor:default}
.rb.sm{width:19px;height:15px;font-size:8px}
.rb.xs{width:17px;height:13px;font-size:8px}
.rbtns.xs{gap:1px}

/* KPI cards */
.kpi-card{display:flex;gap:8px;align-items:flex-start;border:1px solid #e5e7eb;border-radius:8px;padding:9px;margin-bottom:7px;position:relative;background:#fafafa}
.kfi{flex:1}
.hist-row{display:flex;gap:5px;align-items:center;margin-top:5px;padding-top:5px;border-top:1px dashed #e5e7eb}
.del-corner{position:absolute;top:5px;right:5px;background:none;border:none;color:#9ca3af;cursor:pointer;font-size:12px}
.del-corner:hover{color:#dc2626}

/* Section cards */
.sec-card{border:1px solid #e5e7eb;border-radius:10px;margin-bottom:5px;overflow:visible;background:#fff}
.sec-card.open{border-color:#dc2626;box-shadow:0 0 0 2px rgba(220,38,38,.07)}
.sec-hdr{display:flex;align-items:center;gap:7px;padding:9px 11px;background:#fafafa;border-radius:10px}
.sec-card.open .sec-hdr{border-radius:10px 10px 0 0}
.sec-hdr-lbl{flex:1;display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px;font-weight:600;color:#374151;user-select:none;min-width:0}
.sec-hdr-lbl:hover{color:#111}
.sec-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.type-pill{font-size:10px;background:#e5e7eb;color:#6b7280;padding:2px 7px;border-radius:99px;font-weight:600;white-space:nowrap;flex-shrink:0}
.sec-hdr-acts{display:flex;align-items:center;gap:3px;flex-shrink:0}
.ico-btn{background:none;border:1.5px solid #e5e7eb;border-radius:6px;padding:3px 7px;cursor:pointer;font-size:12px;line-height:1}
.ico-btn:hover{background:#f1f5f9}.ico-btn.red:hover{border-color:#fca5a5;background:#fef2f2}
.chev{cursor:pointer;font-size:10px;color:#6b7280;padding:2px 4px;user-select:none}
.sec-body{padding:11px 13px;border-top:1px solid #e5e7eb}
.sec-meta{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px;padding-bottom:9px;border-bottom:1px solid #f1f5f9}
.metric-hdr{display:flex;gap:6px;align-items:center;font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.4px;padding:2px 0 5px;border-bottom:1px solid #f1f5f9;margin-bottom:3px}

/* Items */
.irow{display:flex;align-items:center;gap:5px;padding:3px 0}
.irow.wrap{flex-wrap:wrap}
.idot{color:#dc2626;flex-shrink:0;font-size:11px}
.add-row{display:flex;gap:5px;align-items:center;margin-top:7px;padding-top:7px;border-top:1px dashed #e5e7eb}
.del-sm{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:11px;padding:0 3px;flex-shrink:0}
.del-sm:hover{color:#dc2626}
.stk{text-decoration:line-through;color:#9ca3af}
.insight-blk{border:1px solid #e5e7eb;border-radius:7px;padding:7px;margin-bottom:5px}

/* Section-level save */
.sec-save-row{margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end}
.btn-save-sec{padding:5px 13px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}
.btn-save-sec:hover{background:#15803d}

/* Insert below strip */
.insert-below{display:flex;align-items:center;justify-content:center;padding:3px 0;cursor:pointer;color:#cbd5e1;font-size:11px;font-weight:500;transition:all .15s;border-top:1px dashed transparent;border-radius:0 0 10px 10px}
.insert-below:hover{color:#dc2626;background:#fff5f5;border-top-color:#fca5a5}

/* Misc buttons */
.btn-dashed{width:100%;padding:8px;border:2px dashed #e5e7eb;background:transparent;color:#6b7280;border-radius:8px;cursor:pointer;font-size:13px;margin-top:3px}
.btn-dashed:hover{border-color:#dc2626;color:#dc2626}
.btn-xs{padding:5px 9px;background:#f1f5f9;border:1.5px solid #e5e7eb;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;white-space:nowrap}
.btn-xs:hover{background:#e5e7eb}

/* Bottom publish bar */
.bottom-bar{background:#fff;border-radius:12px;padding:13px 16px;box-shadow:0 1px 4px rgba(0,0,0,.07);display:flex;gap:10px;border:2px solid #f1f5f9}
.btn-save-full{flex:1;padding:10px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700}
.btn-save-full:hover{background:#15803d}
.btn-publish-full{flex:1;padding:10px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:700}
.btn-publish-full:hover{background:#b91c1c}
.pub-msg{text-align:center;font-size:12px;color:#16a34a;font-weight:600;margin-top:4px}

/* Preview pane */
.eright{background:#fff;border-radius:12px;padding:13px;box-shadow:0 1px 4px rgba(0,0,0,.07);position:sticky;top:18px;max-height:92vh;overflow-y:auto}
.prev-hdr{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700;color:#374151;margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid #f1f5f9}
.prev-badge{font-size:10px;padding:2px 8px;border-radius:99px;font-weight:600;text-transform:capitalize}
.pb-published{background:#dcfce7;color:#166534}.pb-draft{background:#fef3c7;color:#92400e}
.prev-title{font-size:14px;font-weight:800;color:#111;margin-bottom:2px}
.prev-period{font-size:11.5px;color:#6b7280;margin-bottom:10px}
.prev-kpis{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:10px}
.pk{border-radius:7px;padding:7px;border-left:3px solid}
.pk-green{background:#f0fdf4;border-color:#16a34a}.pk-amber{background:#fffbeb;border-color:#d97706}
.pk-blue{background:#eff6ff;border-color:#2563eb}.pk-crimson{background:#fef2f2;border-color:#dc2626}
.pk-lbl{font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;margin-bottom:2px}
.pk-val{font-size:15px;font-weight:800;color:#111}
.pk-bar{height:3px;background:#e5e7eb;border-radius:99px;margin-top:4px;overflow:hidden}
.pk-fill{height:100%;background:#dc2626;border-radius:99px}
.prev-secs{display:flex;flex-direction:column;gap:3px}
.ps{display:flex;align-items:center;gap:7px;padding:5px 7px;background:#f9fafb;border-radius:7px;cursor:pointer;border:1px solid transparent;transition:all .1s}
.ps:hover{background:#f1f5f9}.ps.ps-active{border-color:#dc2626;background:#fff5f5}
.ps-num{width:18px;height:18px;border-radius:50%;background:#dc2626;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ps-info{flex:1;min-width:0}
.ps-title{font-size:12px;font-weight:600;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ps-type{font-size:10px;color:#9ca3af}

/* Modal */
.mo{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000}
.modal{background:#fff;border-radius:14px;padding:20px;width:480px;max-width:93vw;box-shadow:0 20px 60px rgba(0,0,0,.2)}
.modal-title{font-size:16px;font-weight:800;color:#111;margin-bottom:14px}
.mbtns{display:flex;gap:9px;justify-content:flex-end;margin-top:16px}
.btn-primary{padding:8px 20px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
.btn-secondary{padding:8px 20px;background:#f1f5f9;color:#374151;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600}
  `]
})
export class ScorecardEditorComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  scorecards        = signal<any[]>([]);
  activeScorecardId = signal<string>('');
  loading           = signal(true);
  metaSaved         = signal(false);
  pubOk             = signal(false);
  expandedSection   = signal<string>('');

  showNewKpi = false; showNewSection = false; insertAt = 0;
  em: any = {};
  nk: any = { label:'', value:'', sub_text:'', bar_percent:0, color:'green', trend:'stable' };
  ns: any = { title:'', section_type:'checklist', icon:'📌', accent_color:'crimson' };

  activeScorecard() { return this.scorecards().find(s => s.id === this.activeScorecardId()) || null; }
  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.api.getScorecards().subscribe(scs => {
      this.scorecards.set(scs);
      if (scs.length && !this.activeScorecardId()) { this.activeScorecardId.set(scs[0].id); this.em = {...scs[0]}; }
      else if (scs.length) { const sc = scs.find((s:any) => s.id === this.activeScorecardId()); if (sc) this.em = {title:sc.title,subtitle:sc.subtitle,period:sc.period,accent_color:sc.accent_color,icon:sc.icon}; }
      this.loading.set(false);
    });
  }

  selectScorecard(id: string) {
    this.activeScorecardId.set(id);
    const sc = this.activeScorecard();
    if (sc) this.em = {title:sc.title,subtitle:sc.subtitle,period:sc.period,accent_color:sc.accent_color,icon:sc.icon};
    this.expandedSection.set('');
  }

  toggleSec(id: string) { this.expandedSection.set(this.expandedSection() === id ? '' : id); }
  openNewScorecard() { alert('Use the API to create a new scorecard, or ask your admin.'); }
  openInsert(idx: number) { this.insertAt = idx; this.ns = {title:'',section_type:'checklist',icon:'📌',accent_color:'crimson'}; this.showNewSection = true; }
  itemCount(s: any) { return (s.timeline_items?.length||0)+(s.checklist_items?.length||0)+(s.focus_items?.length||0)+(s.metric_rows?.length||0)+(s.action_items?.length||0)+(s.insight_blocks?.length||0); }

  // Meta
  saveMeta() {
    const sc = this.activeScorecard(); if (!sc) return;
    this.api.updateScorecard(sc.id, this.em).subscribe(() => { this.metaSaved.set(true); this.load(); setTimeout(()=>this.metaSaved.set(false),2500); });
  }
  publishScorecard() {
    const sc = this.activeScorecard(); if (!sc) return;
    if (!confirm(`Publish "${sc.title}"?`)) return;
    this.api.publishScorecard(sc.id).subscribe(() => { this.pubOk.set(true); this.load(); setTimeout(()=>this.pubOk.set(false),3000); });
  }

  // Section reorder
  moveSec(i: number, d: -1|1) {
    const sc = this.activeScorecard(); if (!sc) return;
    const arr = [...sc.sections], t = i+d;
    if (t<0||t>=arr.length) return;
    [arr[i],arr[t]] = [arr[t],arr[i]];
    arr[i].display_order=i; arr[t].display_order=t;
    this.api.updateSection(arr[i].id,{display_order:i}).subscribe();
    this.api.updateSection(arr[t].id,{display_order:t}).subscribe(() => this.load());
    sc.sections = arr;
  }

  // KPI reorder
  moveKpi(i: number, d: -1|1) {
    const sc = this.activeScorecard(); if (!sc) return;
    const arr = [...sc.kpis], t = i+d;
    if (t<0||t>=arr.length) return;
    [arr[i],arr[t]] = [arr[t],arr[i]];
    arr[i].sort_order=i; arr[t].sort_order=t;
    this.api.updateKpi(arr[i].id,{sort_order:i}).subscribe();
    this.api.updateKpi(arr[t].id,{sort_order:t}).subscribe(() => this.load());
    sc.kpis = arr;
  }

  // KPI CRUD
  patchKpi(k: any) { this.api.updateKpi(k.id,{label:k.label,value:k.value,sub_text:k.sub_text,bar_percent:k.bar_percent,color:k.color,trend:k.trend}).subscribe(); }
  deleteKpi(id: string) { if(!confirm('Delete KPI?')) return; this.api.deleteKpi(id).subscribe(()=>this.load()); }
  createKpi() { const sc=this.activeScorecard(); if(!sc) return; this.api.createKpi(sc.id,this.nk).subscribe(()=>{this.showNewKpi=false;this.nk={label:'',value:'',sub_text:'',bar_percent:0,color:'green',trend:'stable'};this.load();}); }
  addHistory(k: any) { if(!k._hp||!k._hv) return; this.api.addKpiHistory(k.id,{period:k._hp,value:+k._hv}).subscribe(()=>{k._hp='';k._hv='';}); }

  // Section CRUD
  saveSec(s: any) { this.api.updateSection(s.id,{title:s.title,icon:s.icon,accent_color:s.accent_color}).subscribe(); }
  createSec() { const sc=this.activeScorecard(); if(!sc) return; this.api.createSection(sc.id,{...this.ns,display_order:this.insertAt}).subscribe(()=>{this.showNewSection=false;this.load();}); }
  deleteSec(id: string) { if(!confirm('Delete section and all its items?')) return; this.api.deleteSection(id).subscribe(()=>this.load()); }

  // Generic item reorder helper
  private _mv(sec: any, key: string, i: number, d: -1|1, patchFn:(it:any,o:number)=>void) {
    const arr=[...sec[key]], t=i+d;
    if(t<0||t>=arr.length) return;
    [arr[i],arr[t]]=[arr[t],arr[i]];
    arr[i].sort_order=i; arr[t].sort_order=t;
    patchFn(arr[i],i); patchFn(arr[t],t);
    sec[key]=arr;
  }

  // Timeline
  mvTimeline(s:any,i:number,d:-1|1){this._mv(s,'timeline_items',i,d,()=>{}); this.load();}
  addTimeline(s:any){if(!s._nt?.trim())return;this.api.createTimelineItem(s.id,{text:s._nt,sort_order:s.timeline_items?.length||0}).subscribe(()=>{s._nt='';this.load();});}
  delTimeline(s:any,id:string){this.api.deleteTimelineItem(id).subscribe(()=>this.load());}

  // Checklist
  mvChecklist(s:any,i:number,d:-1|1){this._mv(s,'checklist_items',i,d,(it,o)=>this.api.updateChecklistItem(it.id,{sort_order:o}).subscribe());}
  addChecklist(s:any){if(!s._nt?.trim())return;this.api.createChecklistItem(s.id,{text:s._nt,done:false}).subscribe(()=>{s._nt='';this.load();});}
  patchChecklist(it:any){this.api.updateChecklistItem(it.id,{text:it.text,done:it.done}).subscribe();}
  delChecklist(s:any,id:string){this.api.deleteChecklistItem(id).subscribe(()=>this.load());}

  // Focus
  mvFocus(s:any,i:number,d:-1|1){this._mv(s,'focus_items',i,d,(it,o)=>this.api.updateFocusItem(it.id,{sort_order:o}).subscribe());}
  addFocus(s:any){if(!s._nt?.trim())return;this.api.createFocusItem(s.id,{text:s._nt}).subscribe(()=>{s._nt='';this.load();});}
  patchFocus(it:any){this.api.updateFocusItem(it.id,{text:it.text}).subscribe();}
  delFocus(s:any,id:string){this.api.deleteFocusItem(id).subscribe(()=>this.load());}

  // Metric
  mvMetric(s:any,i:number,d:-1|1){this._mv(s,'metric_rows',i,d,(it,o)=>this.api.updateMetricRow(it.id,{sort_order:o}).subscribe());}
  addMetric(s:any){if(!s._nt?.trim())return;this.api.createMetricRow(s.id,{label:s._nt,bar_percent:0,bar_color:'green',status:'active'}).subscribe(()=>{s._nt='';this.load();});}
  patchMetric(r:any){this.api.updateMetricRow(r.id,{label:r.label,bar_percent:r.bar_percent,bar_color:r.bar_color,status:r.status}).subscribe();}
  delMetric(s:any,id:string){this.api.deleteMetricRow(id).subscribe(()=>this.load());}

  // Action
  mvAction(s:any,i:number,d:-1|1){this._mv(s,'action_items',i,d,(it,o)=>this.api.updateActionItem(it.id,{sort_order:o}).subscribe());}
  addAction(s:any){if(!s._nt?.trim())return;this.api.createActionItem(s.id,{action_text:s._nt,owner:s._no||'',status:'in_progress'}).subscribe(()=>{s._nt='';s._no='';this.load();});}
  patchAction(it:any){this.api.updateActionItem(it.id,{action_text:it.action_text,owner:it.owner,status:it.status}).subscribe();}
  delAction(s:any,id:string){this.api.deleteActionItem(id).subscribe(()=>this.load());}

  // Insight
  mvInsight(s:any,i:number,d:-1|1){this._mv(s,'insight_blocks',i,d,(it,o)=>this.api.updateInsightBlock(it.id,{sort_order:o}).subscribe());}
  addInsight(s:any){this.api.createInsightBlock(s.id,{heading:'New Insight',body:'Enter text…',color:'blue'}).subscribe(()=>this.load());}
  patchInsight(b:any){this.api.updateInsightBlock(b.id,{heading:b.heading,body:b.body,color:b.color}).subscribe();}
  delInsight(s:any,id:string){this.api.deleteInsightBlock(id).subscribe(()=>this.load());}
}
