import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { VmtUamApiService, ParsedPdfResult } from '../../services/vmt-uam-api.service';
import { TEAM_MEMBERS, emptyReport, VmtReport } from '../../models/vmt-uam.models';

@Component({
  selector: 'app-vmt-data-entry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './data-entry.component.html',
  styles: [`
    .vmt-page { padding:1.5rem; font-family:inherit; max-width:1100px }
    .vmt-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem }
    .vmt-eyebrow { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#888; margin-bottom:4px }
    .vmt-title { font-size:1.4rem; font-weight:600; margin:0 }
    .tag { display:inline-block; padding:2px 10px; border-radius:4px; font-size:11px; font-weight:500 }
    .tag-blue { background:#E6F1FB; color:#185FA5 } .tag-gray { background:#F1EFE8; color:#5F5E5A }
    .section-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; color:#888; margin:1.25rem 0 .75rem }
    .card { background:#fff; border:.5px solid #E4E2D8; border-radius:12px; padding:1.25rem; margin-bottom:1rem }
    .card-title { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:500; margin-bottom:1rem }
    .upload-card { border:1.5px dashed #185FA5; background:#EEF5FC }
    .upload-body { display:flex; align-items:center; gap:1rem }
    .upload-icon { font-size:2rem; flex-shrink:0 }
    .upload-text-title { font-size:14px; font-weight:500; margin-bottom:2px }
    .upload-text-sub { font-size:12px; color:#888 }
    .drop-zone { margin-top:10px; border:1px dashed #B0C9E4; border-radius:8px; padding:10px; text-align:center; font-size:12px; color:#888; cursor:pointer }
    .divider { display:flex; align-items:center; gap:12px; margin:1.25rem 0; color:#888; font-size:12px }
    .divider::before, .divider::after { content:''; flex:1; height:.5px; background:#E4E2D8 }
    .form-grid { display:grid; gap:12px }
    .grid-3 { grid-template-columns:repeat(3,1fr) } .grid-4 { grid-template-columns:repeat(4,1fr) }
    .form-row { display:flex; flex-direction:column }
    .label { font-size:11px; font-weight:500; color:#888; margin-bottom:4px }
    .input { border:.5px solid #E4E2D8; border-radius:8px; padding:7px 10px; font-size:13px; font-family:inherit; background:#fff; width:100% }
    .input:focus { outline:none; border-color:#185FA5 }
    .avatar { width:24px; height:24px; border-radius:50%; background:#E6F1FB; color:#185FA5; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:600 }
    .btn-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:1.25rem }
    .btn { padding:8px 16px; border:.5px solid #E4E2D8; border-radius:8px; cursor:pointer; font-size:13px; font-family:inherit; background:#fff }
    .btn:hover { background:#F8F7F3 }
    .btn:disabled { opacity:.5; cursor:not-allowed }
    .btn-primary { background:#185FA5; color:#fff; border-color:#185FA5 }
    .btn-primary:hover { background:#0C447C }
    .btn-secondary { background:#1D9E75; color:#fff; border-color:#1D9E75 }
    .btn-ghost { background:transparent }
    .alert { padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:1rem; border:.5px solid }
    .alert-success { background:#EAF3DE; color:#3B6D11; border-color:#97C459 }
    .alert-info    { background:#E6F1FB; color:#185FA5; border-color:#85B7EB }
    .alert-warn    { background:#FAEEDA; color:#854F0B; border-color:#FAC775 }
    .alert-danger  { background:#FCEBEB; color:#A32D2D; border-color:#F5A3A3 }
  `]
})
export class DataEntryComponent implements OnInit {
  @ViewChild('pdfInput') pdfInput!: ElementRef<HTMLInputElement>;

  form!: FormGroup;
  members = TEAM_MEMBERS;
  saving = false;
  uploading = false;
  editingId: number | null = null;
  savedReports: { id: number; label: string }[] = [];
  alert: { type: string; text: string } | null = null;

  constructor(private fb: FormBuilder, private api: VmtUamApiService) {}

  ngOnInit(): void { this.buildForm(emptyReport()); this.loadList(); }

  private buildForm(r: VmtReport): void {
    this.form = this.fb.group({
      period_start: [r.period_start, Validators.required],
      period_end:   [r.period_end,   Validators.required],
      notes:        [r.notes],
      q_logged:        [r.q_logged,        [Validators.required, Validators.min(0)]],
      q_open_sla:      [r.q_open_sla,      Validators.min(0)],
      q_open_breach:   [r.q_open_breach,   Validators.min(0)],
      q_open_blank:    [r.q_open_blank,    Validators.min(0)],
      q_pending:       [r.q_pending,       Validators.min(0)],
      q_total_open:    [r.q_total_open,    Validators.min(0)],
      q_closed_sla:    [r.q_closed_sla,    Validators.min(0)],
      q_closed_breach: [r.q_closed_breach, Validators.min(0)],
      q_closed_blank:  [r.q_closed_blank,  Validators.min(0)],
      q_total_closed:  [r.q_total_closed,  Validators.min(0)],
      q_sla_rate:      [r.q_sla_rate,      [Validators.min(0), Validators.max(100)]],
      members: this.fb.array(TEAM_MEMBERS.map(t => {
        const m = r.members?.find(x => x.agent_id === t.agent_id) ?? { open_sla:0,open_breach:0,open_blank:0,pending:0,closed_sla:0,closed_breach:0,closed_blank:0 };
        return this.fb.group({
          agent_id: [t.agent_id], agent_name: [t.agent_name],
          open_sla: [m.open_sla, Validators.min(0)], open_breach: [m.open_breach, Validators.min(0)],
          open_blank: [m.open_blank, Validators.min(0)], pending: [m.pending, Validators.min(0)],
          closed_sla: [m.closed_sla, Validators.min(0)], closed_breach: [m.closed_breach, Validators.min(0)],
          closed_blank: [m.closed_blank, Validators.min(0)],
        });
      })),
    });
  }

  get membersArray(): FormArray { return this.form.get('members') as FormArray; }
  memberGroup(i: number): FormGroup { return this.membersArray.at(i) as FormGroup; }

  triggerPdf(): void { this.pdfInput.nativeElement.click(); }

  onPdfSelected(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) { (e.target as HTMLInputElement).value = ''; this.uploadPdf(f); }
  }

  uploadPdf(file: File): void {
    this.uploading = true;
    this.showAlert('info', `Reading ${file.name}…`);
    this.api.parsePdf(file).subscribe({
      next: r => { this.uploading = false; this.applyParsed(r); },
      error: err => {
        this.uploading = false;
        const detail = err.error?.detail
          ?? err.error?.message
          ?? (typeof err.error === 'string' ? err.error : null)
          ?? `HTTP ${err.status} – check that the backend is running on port 8000`;
        this.showAlert('danger', `PDF parsing failed: ${detail}`);
      },
    });
  }

  private applyParsed(r: ParsedPdfResult): void {
    this.form.patchValue({
      period_start: r.period_start ?? '', period_end: r.period_end ?? '',
      q_logged: r.q_logged, q_open_sla: r.q_open_sla, q_open_breach: r.q_open_breach,
      q_open_blank: r.q_open_blank, q_pending: r.q_pending, q_total_open: r.q_total_open,
      q_closed_sla: r.q_closed_sla, q_closed_breach: r.q_closed_breach,
      q_closed_blank: r.q_closed_blank, q_total_closed: r.q_total_closed, q_sla_rate: r.q_sla_rate,
    });
    TEAM_MEMBERS.forEach((t, i) => {
      const p = r.members.find(m => m.agent_id === t.agent_id);
      if (p) this.membersArray.at(i).patchValue(p);
    });
    this.showAlert(r.warnings.length ? 'warn' : 'success',
      `PDF parsed. All fields filled.${r.warnings.length ? ' Warnings: ' + r.warnings.join('; ') : ''} Review and save.`);
  }

  private loadList(): void {
    this.api.listReports(20).subscribe({ next: r => { this.savedReports = r.map(x => ({ id: x.id!, label: `${x.period_start} → ${x.period_end}` })); } });
  }

  saveReport(): void {
    if (this.form.invalid) { this.showAlert('warn', 'Fill in period dates and logged tickets.'); return; }
    this.saving = true;
    const payload = this.form.value as VmtReport;
    const req = this.editingId ? this.api.updateReport(this.editingId, payload) : this.api.createReport(payload);
    req.subscribe({
      next: s => { this.saving = false; this.editingId = s.id!; this.showAlert('success', `Saved (ID ${s.id}).`); this.loadList(); },
      error: () => { this.saving = false; this.showAlert('danger', 'Save failed. Check API is running.'); },
    });
  }

  saveAs(): void { this.editingId = null; this.saveReport(); }

  copyPrevious(): void {
    if (!this.savedReports.length) { this.showAlert('warn', 'No previous reports. Upload a PDF or enter manually.'); return; }
    this.api.getReport(this.savedReports[0].id).subscribe({
      next: r => {
        this.editingId = null;
        this.buildForm({ ...r, period_start: '', period_end: '', notes: `Copied from ${r.period_start} – ${r.period_end}`,
          q_logged: 0, q_closed_sla: 0, q_closed_breach: 0, q_closed_blank: 0, q_total_closed: 0, q_sla_rate: 0,
          members: r.members.map(m => ({ ...m, closed_sla: 0, closed_breach: 0, closed_blank: 0 })) });
        this.showAlert('info', `Copied from ${r.period_start}. Update dates then save.`);
      },
    });
  }

  clearForm(): void { this.editingId = null; this.buildForm(emptyReport()); this.showAlert('info', 'Form cleared.'); }

  publishReport(): void {
    if (!this.editingId) { this.showAlert('warn', 'Save first before publishing.'); return; }
    this.api.publishReport(this.editingId).subscribe({ next: () => this.showAlert('success', 'Report published.') });
  }

  private showAlert(type: string, text: string): void {
    this.alert = { type, text };
    setTimeout(() => this.alert = null, 6000);
  }
}
