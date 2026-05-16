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
    <div class="editor-page">
      <div class="editor-header">
        <div>
          <h1>Edit Scorecards</h1>
          <p>Update KPIs, sections, and content for all scorecard modules</p>
        </div>
        @if (auth.isAdmin) {
          <button class="btn-primary" (click)="showCreateScorecard = true">+ New Scorecard</button>
        }
      </div>

      <!-- Scorecard Tabs -->
      <div class="sc-tabs">
        @for (sc of scorecards(); track sc.id) {
          <button class="sc-tab" [class.active]="sc.id === activeScorecardId()"
            (click)="selectScorecard(sc.id)">
            {{ sc.icon }} {{ sc.title }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading">Loading…</div>
      }

      @if (!loading() && activeScorecard()) {
        <div class="editor-body">

          <!-- Left Panel: Scorecard Meta -->
          <div class="editor-left">

            <!-- Scorecard Meta -->
            <div class="panel">
              <div class="panel-title">📋 Scorecard Info</div>
              <div class="form-group">
                <label>Title</label>
                <input type="text" [(ngModel)]="editMeta.title" class="fi" />
              </div>
              <div class="form-group">
                <label>Subtitle</label>
                <input type="text" [(ngModel)]="editMeta.subtitle" class="fi" />
              </div>
              <div class="form-group">
                <label>Period</label>
                <input type="text" [(ngModel)]="editMeta.period" placeholder="e.g. April 2026" class="fi" />
              </div>
              <div class="form-group">
                <label>Accent Color</label>
                <select [(ngModel)]="editMeta.accent_color" class="fi">
                  <option value="crimson">Crimson</option>
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                  <option value="amber">Amber</option>
                </select>
              </div>
              <div class="form-group">
                <label>Icon (emoji)</label>
                <input type="text" [(ngModel)]="editMeta.icon" class="fi" style="width:80px" />
              </div>
              <div class="btn-row">
                <button class="btn-save" (click)="saveMeta()">Save Changes</button>
                <button class="btn-publish" (click)="publishScorecard()">🚀 Publish</button>
              </div>
              @if (metaSaved()) { <div class="saved-msg">✅ Saved successfully</div> }
            </div>

            <!-- KPI Cards -->
            <div class="panel">
              <div class="panel-title">📊 KPI Cards</div>
              @for (kpi of activeScorecard()?.kpis; track kpi.id) {
                <div class="kpi-edit-card">
                  <div class="kpi-edit-label">{{ kpi.label }}</div>
                  <div class="kpi-edit-fields">
                    <div class="form-group">
                      <label>Label</label>
                      <input type="text" [(ngModel)]="kpi.label" class="fi-sm"
                        (change)="updateKpi(kpi)" />
                    </div>
                    <div class="form-group">
                      <label>Value</label>
                      <input type="text" [(ngModel)]="kpi.value" class="fi-sm"
                        (change)="updateKpi(kpi)" />
                    </div>
                    <div class="form-group">
                      <label>Sub Text</label>
                      <input type="text" [(ngModel)]="kpi.sub_text" class="fi-sm"
                        (change)="updateKpi(kpi)" />
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>Bar %</label>
                        <input type="number" [(ngModel)]="kpi.bar_percent" min="0" max="100" class="fi-sm"
                          (change)="updateKpi(kpi)" />
                      </div>
                      <div class="form-group">
                        <label>Color</label>
                        <select [(ngModel)]="kpi.color" class="fi-sm" (change)="updateKpi(kpi)">
                          <option value="green">Green</option>
                          <option value="amber">Amber</option>
                          <option value="blue">Blue</option>
                          <option value="crimson">Crimson</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label>Trend</label>
                        <select [(ngModel)]="kpi.trend" class="fi-sm" (change)="updateKpi(kpi)">
                          <option value="up">↑ Up</option>
                          <option value="stable">→ Stable</option>
                          <option value="down">↓ Down</option>
                        </select>
                      </div>
                    </div>
                    <!-- Add history entry -->
                    <div class="history-add">
                      <input type="text" [(ngModel)]="kpi._histPeriod" placeholder="Period (e.g. May 2026)"
                        class="fi-sm" style="flex:1" />
                      <input type="number" [(ngModel)]="kpi._histValue" placeholder="Value"
                        class="fi-sm" style="width:80px" />
                      <button class="btn-xs" (click)="addHistory(kpi)">+ History</button>
                    </div>
                  </div>
                  <button class="btn-del" (click)="deleteKpi(kpi.id)" title="Delete KPI">✕</button>
                </div>
              }
              <button class="btn-add-block" (click)="showNewKpi = true">+ Add KPI Card</button>
            </div>

            <!-- Sections -->
            <div class="panel">
              <div class="panel-title">🗂️ Sections</div>
              @for (section of activeScorecard()?.sections; track section.id) {
                <div class="section-edit-card" [class.expanded]="expandedSection() === section.id">
                  <div class="section-edit-header" (click)="toggleSection(section.id)">
                    <span>{{ section.icon }} {{ section.title }}</span>
                    <div class="sec-header-right">
                      <span class="sec-type-badge">{{ section.section_type }}</span>
                      <span>{{ expandedSection() === section.id ? '▲' : '▼' }}</span>
                    </div>
                  </div>

                  @if (expandedSection() === section.id) {
                    <div class="section-edit-body">
                      <!-- Section meta -->
                      <div class="form-row">
                        <div class="form-group">
                          <label>Title</label>
                          <input [(ngModel)]="section.title" class="fi-sm"
                            (change)="updateSection(section)" />
                        </div>
                        <div class="form-group">
                          <label>Icon</label>
                          <input [(ngModel)]="section.icon" class="fi-sm" style="width:60px"
                            (change)="updateSection(section)" />
                        </div>
                        <div class="form-group">
                          <label>Color</label>
                          <select [(ngModel)]="section.accent_color" class="fi-sm"
                            (change)="updateSection(section)">
                            <option value="crimson">Crimson</option>
                            <option value="green">Green</option>
                            <option value="blue">Blue</option>
                            <option value="amber">Amber</option>
                          </select>
                        </div>
                      </div>

                      <!-- TIMELINE items -->
                      @if (section.section_type === 'timeline') {
                        <div class="item-list">
                          @for (item of section.timeline_items; track item.id) {
                            <div class="item-row">
                              <span class="item-dot">▸</span>
                              <span class="item-text">{{ item.text }}</span>
                              <button class="btn-del-sm" (click)="deleteTimelineItem(section, item.id)">✕</button>
                            </div>
                          }
                          <div class="add-item-row">
                            <input type="text" [(ngModel)]="section._newText" placeholder="New timeline entry…"
                              class="fi-sm" style="flex:1" />
                            <button class="btn-xs" (click)="addTimelineItem(section)">+ Add</button>
                          </div>
                        </div>
                      }

                      <!-- CHECKLIST items -->
                      @if (section.section_type === 'checklist') {
                        <div class="item-list">
                          @for (item of section.checklist_items; track item.id) {
                            <div class="item-row">
                              <input type="checkbox" [(ngModel)]="item.done"
                                (change)="updateChecklistItem(item)" />
                              <span class="item-text" [class.striked]="item.done">{{ item.text }}</span>
                              <button class="btn-del-sm" (click)="deleteChecklistItem(section, item.id)">✕</button>
                            </div>
                          }
                          <div class="add-item-row">
                            <input type="text" [(ngModel)]="section._newText" placeholder="New checklist item…"
                              class="fi-sm" style="flex:1" />
                            <button class="btn-xs" (click)="addChecklistItem(section)">+ Add</button>
                          </div>
                        </div>
                      }

                      <!-- FOCUS LIST items -->
                      @if (section.section_type === 'focus_list') {
                        <div class="item-list">
                          @for (item of section.focus_items; track item.id) {
                            <div class="item-row">
                              <span class="item-dot">▸</span>
                              <span class="item-text">{{ item.text }}</span>
                              <button class="btn-del-sm" (click)="deleteFocusItem(section, item.id)">✕</button>
                            </div>
                          }
                          <div class="add-item-row">
                            <input type="text" [(ngModel)]="section._newText" placeholder="New focus item…"
                              class="fi-sm" style="flex:1" />
                            <button class="btn-xs" (click)="addFocusItem(section)">+ Add</button>
                          </div>
                        </div>
                      }

                      <!-- METRIC TABLE rows -->
                      @if (section.section_type === 'metric_table') {
                        <div class="item-list">
                          @for (row of section.metric_rows; track row.id) {
                            <div class="item-row-metric">
                              <input [(ngModel)]="row.label" class="fi-sm" style="flex:1"
                                (change)="updateMetricRow(row)" />
                              <input type="number" [(ngModel)]="row.bar_percent" min="0" max="100"
                                class="fi-sm" style="width:60px" (change)="updateMetricRow(row)" />
                              <select [(ngModel)]="row.bar_color" class="fi-sm"
                                (change)="updateMetricRow(row)">
                                <option value="green">Green</option>
                                <option value="amber">Amber</option>
                                <option value="blue">Blue</option>
                                <option value="crimson">Crimson</option>
                              </select>
                              <select [(ngModel)]="row.status" class="fi-sm"
                                (change)="updateMetricRow(row)">
                                <option value="met">Met</option>
                                <option value="active">Active</option>
                                <option value="at_risk">At Risk</option>
                              </select>
                              <button class="btn-del-sm" (click)="deleteMetricRow(section, row.id)">✕</button>
                            </div>
                          }
                          <div class="add-item-row">
                            <input type="text" [(ngModel)]="section._newText" placeholder="New metric label…"
                              class="fi-sm" style="flex:1" />
                            <button class="btn-xs" (click)="addMetricRow(section)">+ Add</button>
                          </div>
                        </div>
                      }

                      <!-- ACTION TABLE items -->
                      @if (section.section_type === 'action_table') {
                        <div class="item-list">
                          @for (item of section.action_items; track item.id) {
                            <div class="item-row-action">
                              <input [(ngModel)]="item.action_text" class="fi-sm" style="flex:1"
                                (change)="updateActionItem(item)" />
                              <input [(ngModel)]="item.owner" class="fi-sm" style="width:100px"
                                placeholder="Owner" (change)="updateActionItem(item)" />
                              <select [(ngModel)]="item.status" class="fi-sm"
                                (change)="updateActionItem(item)">
                                <option value="on_track">On Track</option>
                                <option value="in_progress">In Progress</option>
                                <option value="at_risk">At Risk</option>
                                <option value="done">Done</option>
                              </select>
                              <button class="btn-del-sm" (click)="deleteActionItem(section, item.id)">✕</button>
                            </div>
                          }
                          <div class="add-item-row">
                            <input type="text" [(ngModel)]="section._newText" placeholder="New action…"
                              class="fi-sm" style="flex:1" />
                            <input type="text" [(ngModel)]="section._newOwner" placeholder="Owner"
                              class="fi-sm" style="width:100px" />
                            <button class="btn-xs" (click)="addActionItem(section)">+ Add</button>
                          </div>
                        </div>
                      }

                      <!-- INSIGHT BLOCKS -->
                      @if (section.section_type === 'insight') {
                        <div class="item-list">
                          @for (block of section.insight_blocks; track block.id) {
                            <div class="insight-edit-block">
                              <input [(ngModel)]="block.heading" class="fi-sm" placeholder="Heading"
                                (change)="updateInsightBlock(block)" />
                              <textarea [(ngModel)]="block.body" class="fi-sm ta"
                                (change)="updateInsightBlock(block)"></textarea>
                              <div style="display:flex;gap:8px;align-items:center">
                                <select [(ngModel)]="block.color" class="fi-sm"
                                  (change)="updateInsightBlock(block)">
                                  <option value="crimson">Crimson</option>
                                  <option value="blue">Blue</option>
                                  <option value="amber">Amber</option>
                                  <option value="green">Green</option>
                                </select>
                                <button class="btn-del-sm" (click)="deleteInsightBlock(section, block.id)">✕ Remove</button>
                              </div>
                            </div>
                          }
                          <button class="btn-xs" (click)="addInsightBlock(section)">+ Add Insight Block</button>
                        </div>
                      }

                    </div>
                  }
                  <button class="btn-del-sec" (click)="deleteSection(section.id)"
                    title="Delete section">🗑️</button>
                </div>
              }

              <button class="btn-add-block" (click)="showNewSection = true">+ Add Section</button>
            </div>
          </div>

          <!-- Live Preview Pane -->
          <div class="editor-right">
            <div class="preview-header">
              <span>👁 Live Preview</span>
              <span class="preview-badge">{{ activeScorecard()?.status }}</span>
            </div>
            <div class="preview-meta">
              <div class="preview-title">{{ activeScorecard()?.title }}</div>
              <div class="preview-period">{{ activeScorecard()?.period }}</div>
            </div>
            <div class="preview-kpis">
              @for (kpi of activeScorecard()?.kpis; track kpi.id) {
                <div class="prev-kpi" [class]="'pk-' + kpi.color">
                  <div class="pk-label">{{ kpi.label }}</div>
                  <div class="pk-value">{{ kpi.value }}</div>
                  <div class="pk-bar-track">
                    <div class="pk-bar-fill" [style.width.%]="kpi.bar_percent"></div>
                  </div>
                </div>
              }
            </div>
            <div class="preview-sections">
              @for (section of activeScorecard()?.sections; track section.id) {
                <div class="prev-section">
                  <div class="prev-sec-title">{{ section.icon }} {{ section.title }}</div>
                  <div class="prev-sec-type">{{ section.section_type }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal: New KPI -->
      @if (showNewKpi) {
        <div class="modal-overlay" (click)="showNewKpi = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-title">New KPI Card</div>
            <div class="form-group"><label>Label</label>
              <input [(ngModel)]="newKpi.label" class="fi" placeholder="e.g. Request SLA" /></div>
            <div class="form-group"><label>Value</label>
              <input [(ngModel)]="newKpi.value" class="fi" placeholder="e.g. 90%+" /></div>
            <div class="form-group"><label>Sub Text</label>
              <input [(ngModel)]="newKpi.sub_text" class="fi" /></div>
            <div class="form-row">
              <div class="form-group"><label>Bar %</label>
                <input type="number" [(ngModel)]="newKpi.bar_percent" class="fi" min="0" max="100" /></div>
              <div class="form-group"><label>Color</label>
                <select [(ngModel)]="newKpi.color" class="fi">
                  <option value="green">Green</option><option value="amber">Amber</option>
                  <option value="blue">Blue</option><option value="crimson">Crimson</option>
                </select></div>
            </div>
            <div class="modal-btns">
              <button class="btn-secondary" (click)="showNewKpi = false">Cancel</button>
              <button class="btn-primary" (click)="createKpi()">Create KPI</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal: New Section -->
      @if (showNewSection) {
        <div class="modal-overlay" (click)="showNewSection = false">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-title">New Section</div>
            <div class="form-group"><label>Title</label>
              <input [(ngModel)]="newSection.title" class="fi" /></div>
            <div class="form-group"><label>Type</label>
              <select [(ngModel)]="newSection.section_type" class="fi">
                <option value="timeline">Timeline</option>
                <option value="checklist">Checklist</option>
                <option value="metric_table">Metric Table</option>
                <option value="action_table">Action Table</option>
                <option value="insight">Insights</option>
                <option value="focus_list">Focus List</option>
              </select></div>
            <div class="form-row">
              <div class="form-group"><label>Icon</label>
                <input [(ngModel)]="newSection.icon" class="fi" style="width:80px" /></div>
              <div class="form-group"><label>Color</label>
                <select [(ngModel)]="newSection.accent_color" class="fi">
                  <option value="crimson">Crimson</option><option value="green">Green</option>
                  <option value="blue">Blue</option><option value="amber">Amber</option>
                </select></div>
            </div>
            <div class="modal-btns">
              <button class="btn-secondary" (click)="showNewSection = false">Cancel</button>
              <button class="btn-primary" (click)="createSection()">Create Section</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .editor-page { font-family: system-ui, -apple-system, sans-serif; padding: 28px 32px; }
    .editor-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; }
    .editor-header h1 { font-size:22px; font-weight:800; color:#111; margin:0 0 4px; }
    .editor-header p { font-size:13px; color:#6b7280; margin:0; }
    .sc-tabs { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:20px; }
    .sc-tab { padding:8px 14px; border:1.5px solid #e5e7eb; background:#fff; border-radius:8px;
      cursor:pointer; font-size:13px; font-weight:500; color:#374151; transition:all .15s; }
    .sc-tab:hover { border-color:#dc2626; }
    .sc-tab.active { background:#dc2626; color:#fff; border-color:#dc2626; }
    .loading { padding:40px; text-align:center; color:#6b7280; }
    .editor-body { display:grid; grid-template-columns:1fr 280px; gap:20px; align-items:start; }
    .editor-left { display:flex; flex-direction:column; gap:16px; }

    /* Panel */
    .panel { background:#fff; border-radius:12px; padding:18px; box-shadow:0 1px 4px rgba(0,0,0,.07); }
    .panel-title { font-size:13px; font-weight:700; color:#111; margin-bottom:14px;
      padding-bottom:10px; border-bottom:1px solid #f1f5f9; }
    .form-group { margin-bottom:12px; }
    .form-group label { display:block; font-size:11.5px; font-weight:600; color:#6b7280;
      margin-bottom:4px; text-transform:uppercase; letter-spacing:.4px; }
    .fi { width:100%; padding:8px 10px; border:1.5px solid #e5e7eb; border-radius:7px;
      font-size:13px; outline:none; }
    .fi:focus { border-color:#dc2626; }
    .fi-sm { padding:6px 8px; border:1.5px solid #e5e7eb; border-radius:6px; font-size:12.5px; outline:none; }
    .fi-sm:focus { border-color:#dc2626; }
    .form-row { display:flex; gap:10px; }
    .btn-row { display:flex; gap:8px; margin-top:4px; }
    .btn-save { padding:8px 16px; background:#16a34a; color:#fff; border:none; border-radius:7px;
      cursor:pointer; font-size:13px; font-weight:600; }
    .btn-publish { padding:8px 16px; background:#2563eb; color:#fff; border:none; border-radius:7px;
      cursor:pointer; font-size:13px; font-weight:600; }
    .saved-msg { font-size:12px; color:#16a34a; margin-top:8px; font-weight:600; }

    /* KPI Edit */
    .kpi-edit-card { border:1px solid #e5e7eb; border-radius:8px; padding:12px;
      margin-bottom:10px; position:relative; }
    .kpi-edit-label { font-size:12px; font-weight:700; color:#6b7280;
      margin-bottom:10px; text-transform:uppercase; }
    .btn-del { position:absolute; top:8px; right:8px; background:none; border:none;
      color:#9ca3af; cursor:pointer; font-size:13px; }
    .btn-del:hover { color:#dc2626; }
    .history-add { display:flex; gap:6px; align-items:center; margin-top:8px;
      padding-top:8px; border-top:1px dashed #e5e7eb; }

    /* Section Edit */
    .section-edit-card { border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px;
      overflow:hidden; position:relative; }
    .section-edit-header { display:flex; align-items:center; justify-content:space-between;
      padding:10px 12px; cursor:pointer; font-size:13px; font-weight:600; color:#374151;
      background:#fafafa; user-select:none; }
    .section-edit-header:hover { background:#f3f4f6; }
    .sec-header-right { display:flex; align-items:center; gap:8px; }
    .sec-type-badge { font-size:10px; background:#e5e7eb; color:#6b7280; padding:2px 7px;
      border-radius:99px; font-weight:600; }
    .section-edit-body { padding:12px; border-top:1px solid #e5e7eb; }
    .btn-del-sec { position:absolute; top:8px; right:32px; background:none; border:none;
      cursor:pointer; font-size:14px; opacity:.4; }
    .btn-del-sec:hover { opacity:1; }

    /* Item lists */
    .item-list { display:flex; flex-direction:column; gap:6px; margin-top:10px; }
    .item-row { display:flex; align-items:flex-start; gap:8px; padding:5px 0;
      border-bottom:1px solid #f8fafc; }
    .item-dot { color:#dc2626; flex-shrink:0; }
    .item-text { font-size:12.5px; color:#374151; flex:1; }
    .striked { text-decoration:line-through; color:#9ca3af; }
    .btn-del-sm { background:none; border:none; color:#9ca3af; cursor:pointer; font-size:11px;
      padding:0 4px; flex-shrink:0; }
    .btn-del-sm:hover { color:#dc2626; }
    .add-item-row { display:flex; gap:6px; align-items:center; margin-top:8px; }
    .btn-xs { padding:5px 10px; background:#f1f5f9; border:1.5px solid #e5e7eb;
      border-radius:6px; font-size:12px; cursor:pointer; font-weight:600; white-space:nowrap; }
    .btn-xs:hover { background:#e5e7eb; }
    .item-row-metric { display:flex; gap:6px; align-items:center; padding:5px 0; border-bottom:1px solid #f8fafc; }
    .item-row-action { display:flex; gap:6px; align-items:center; padding:5px 0; border-bottom:1px solid #f8fafc; }
    .insight-edit-block { border:1px solid #e5e7eb; border-radius:7px; padding:10px; margin-bottom:8px; display:flex; flex-direction:column; gap:6px; }
    .ta { width:100%; min-height:80px; resize:vertical; font-family:inherit; }
    .btn-add-block { width:100%; padding:9px; border:2px dashed #e5e7eb; background:transparent;
      color:#6b7280; border-radius:8px; cursor:pointer; font-size:13px; margin-top:4px; }
    .btn-add-block:hover { border-color:#dc2626; color:#dc2626; }

    /* Preview Panel */
    .editor-right { background:#fff; border-radius:12px; padding:16px;
      box-shadow:0 1px 4px rgba(0,0,0,.07); position:sticky; top:20px; }
    .preview-header { display:flex; align-items:center; justify-content:space-between;
      font-size:13px; font-weight:700; color:#374151; margin-bottom:14px;
      padding-bottom:10px; border-bottom:1px solid #f1f5f9; }
    .preview-badge { font-size:11px; padding:3px 9px; border-radius:99px;
      background:#dcfce7; color:#166534; font-weight:600; text-transform:capitalize; }
    .preview-title { font-size:16px; font-weight:800; color:#111; margin-bottom:2px; }
    .preview-period { font-size:12px; color:#6b7280; margin-bottom:14px; }
    .preview-kpis { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; }
    .prev-kpi { border-radius:8px; padding:10px; border-left:3px solid; }
    .pk-green  { background:#f0fdf4; border-color:#16a34a; }
    .pk-amber  { background:#fffbeb; border-color:#d97706; }
    .pk-blue   { background:#eff6ff; border-color:#2563eb; }
    .pk-crimson{ background:#fef2f2; border-color:#dc2626; }
    .pk-label  { font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; margin-bottom:4px; }
    .pk-value  { font-size:18px; font-weight:800; color:#111; }
    .pk-bar-track { height:3px; background:#e5e7eb; border-radius:99px; margin-top:6px; overflow:hidden; }
    .pk-bar-fill { height:100%; background:#dc2626; border-radius:99px; }
    .preview-sections { display:flex; flex-direction:column; gap:4px; }
    .prev-section { display:flex; align-items:center; justify-content:space-between;
      padding:7px 10px; background:#f9fafb; border-radius:7px; }
    .prev-sec-title { font-size:12.5px; font-weight:600; color:#374151; }
    .prev-sec-type { font-size:10px; color:#9ca3af; }

    /* Modal */
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5);
      display:flex; align-items:center; justify-content:center; z-index:1000; }
    .modal { background:#fff; border-radius:14px; padding:24px; width:440px;
      max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,.2); }
    .modal-title { font-size:17px; font-weight:800; color:#111; margin-bottom:18px; }
    .modal-btns { display:flex; gap:10px; justify-content:flex-end; margin-top:20px; }
    .btn-primary { padding:9px 20px; background:#dc2626; color:#fff; border:none;
      border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
    .btn-secondary { padding:9px 20px; background:#f1f5f9; color:#374151; border:none;
      border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
  `]
})
export class ScorecardEditorComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  scorecards = signal<any[]>([]);
  activeScorecardId = signal<string>('');
  loading = signal(true);
  metaSaved = signal(false);
  expandedSection = signal<string>('');
  showNewKpi = false;
  showNewSection = false;
  showCreateScorecard = false;

  editMeta: any = {};
  newKpi: any = { label: '', value: '', sub_text: '', bar_percent: 0, color: 'green', trend: 'stable' };
  newSection: any = { title: '', section_type: 'timeline', icon: '📌', accent_color: 'crimson' };

  activeScorecard() {
    return this.scorecards().find(s => s.id === this.activeScorecardId()) || null;
  }

  ngOnInit() { this.loadScorecards(); }

  loadScorecards() {
    this.loading.set(true);
    this.api.getScorecards().subscribe(scs => {
      this.scorecards.set(scs);
      if (scs.length && !this.activeScorecardId()) {
        this.activeScorecardId.set(scs[0].id);
        this.editMeta = { ...scs[0] };
      }
      this.loading.set(false);
    });
  }

  selectScorecard(id: string) {
    this.activeScorecardId.set(id);
    const sc = this.activeScorecard();
    if (sc) this.editMeta = { title: sc.title, subtitle: sc.subtitle, period: sc.period, accent_color: sc.accent_color, icon: sc.icon };
    this.expandedSection.set('');
  }

  toggleSection(id: string) {
    this.expandedSection.set(this.expandedSection() === id ? '' : id);
  }

  saveMeta() {
    const sc = this.activeScorecard();
    if (!sc) return;
    this.api.updateScorecard(sc.id, this.editMeta).subscribe(() => {
      this.metaSaved.set(true);
      this.loadScorecards();
      setTimeout(() => this.metaSaved.set(false), 2500);
    });
  }

  publishScorecard() {
    const sc = this.activeScorecard();
    if (!sc) return;
    this.api.publishScorecard(sc.id).subscribe(() => this.loadScorecards());
  }

  // KPIs
  updateKpi(kpi: any) {
    this.api.updateKpi(kpi.id, {
      label: kpi.label, value: kpi.value, sub_text: kpi.sub_text,
      bar_percent: kpi.bar_percent, color: kpi.color, trend: kpi.trend
    }).subscribe();
  }

  deleteKpi(kpiId: string) {
    if (!confirm('Delete this KPI?')) return;
    this.api.deleteKpi(kpiId).subscribe(() => this.loadScorecards());
  }

  createKpi() {
    const sc = this.activeScorecard();
    if (!sc) return;
    this.api.createKpi(sc.id, this.newKpi).subscribe(() => {
      this.showNewKpi = false;
      this.newKpi = { label: '', value: '', sub_text: '', bar_percent: 0, color: 'green', trend: 'stable' };
      this.loadScorecards();
    });
  }

  addHistory(kpi: any) {
    if (!kpi._histPeriod || !kpi._histValue) return;
    this.api.addKpiHistory(kpi.id, { period: kpi._histPeriod, value: +kpi._histValue }).subscribe(() => {
      kpi._histPeriod = ''; kpi._histValue = '';
      this.loadScorecards();
    });
  }

  // Sections
  createSection() {
    const sc = this.activeScorecard();
    if (!sc) return;
    this.api.createSection(sc.id, this.newSection).subscribe(() => {
      this.showNewSection = false;
      this.newSection = { title: '', section_type: 'timeline', icon: '📌', accent_color: 'crimson' };
      this.loadScorecards();
    });
  }

  updateSection(section: any) {
    this.api.updateSection(section.id, { title: section.title, icon: section.icon, accent_color: section.accent_color }).subscribe();
  }

  deleteSection(sectionId: string) {
    if (!confirm('Delete this section?')) return;
    this.api.deleteSection(sectionId).subscribe(() => this.loadScorecards());
  }

  // Timeline
  addTimelineItem(section: any) {
    if (!section._newText) return;
    this.api.createTimelineItem(section.id, { text: section._newText, sort_order: section.timeline_items?.length || 0 })
      .subscribe(() => { section._newText = ''; this.loadScorecards(); });
  }
  deleteTimelineItem(section: any, id: string) {
    this.api.deleteTimelineItem(id).subscribe(() => this.loadScorecards());
  }

  // Checklist
  addChecklistItem(section: any) {
    if (!section._newText) return;
    this.api.createChecklistItem(section.id, { text: section._newText, done: false })
      .subscribe(() => { section._newText = ''; this.loadScorecards(); });
  }
  updateChecklistItem(item: any) {
    this.api.updateChecklistItem(item.id, { done: item.done }).subscribe();
  }
  deleteChecklistItem(section: any, id: string) {
    this.api.deleteChecklistItem(id).subscribe(() => this.loadScorecards());
  }

  // Focus Items
  addFocusItem(section: any) {
    if (!section._newText) return;
    this.api.createFocusItem(section.id, { text: section._newText })
      .subscribe(() => { section._newText = ''; this.loadScorecards(); });
  }
  deleteFocusItem(section: any, id: string) {
    this.api.deleteFocusItem(id).subscribe(() => this.loadScorecards());
  }

  // Metric Rows
  addMetricRow(section: any) {
    if (!section._newText) return;
    this.api.createMetricRow(section.id, { label: section._newText, bar_percent: 0, bar_color: 'green', status: 'active' })
      .subscribe(() => { section._newText = ''; this.loadScorecards(); });
  }
  updateMetricRow(row: any) {
    this.api.updateMetricRow(row.id, { label: row.label, bar_percent: row.bar_percent, bar_color: row.bar_color, status: row.status }).subscribe();
  }
  deleteMetricRow(section: any, id: string) {
    this.api.deleteMetricRow(id).subscribe(() => this.loadScorecards());
  }

  // Action Items
  addActionItem(section: any) {
    if (!section._newText) return;
    this.api.createActionItem(section.id, { action_text: section._newText, owner: section._newOwner || '', status: 'in_progress' })
      .subscribe(() => { section._newText = ''; section._newOwner = ''; this.loadScorecards(); });
  }
  updateActionItem(item: any) {
    this.api.updateActionItem(item.id, { action_text: item.action_text, owner: item.owner, status: item.status }).subscribe();
  }
  deleteActionItem(section: any, id: string) {
    this.api.deleteActionItem(id).subscribe(() => this.loadScorecards());
  }

  // Insight Blocks
  addInsightBlock(section: any) {
    this.api.createInsightBlock(section.id, { heading: 'New Insight', body: 'Enter insight text…', color: 'blue' })
      .subscribe(() => this.loadScorecards());
  }
  updateInsightBlock(block: any) {
    this.api.updateInsightBlock(block.id, { heading: block.heading, body: block.body, color: block.color }).subscribe();
  }
  deleteInsightBlock(section: any, id: string) {
    this.api.deleteInsightBlock(id).subscribe(() => this.loadScorecards());
  }
}
