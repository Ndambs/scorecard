import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-upload-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>File Uploads</h1><p>Import KPI data from CSV or Excel files</p></div>
      </div>

      <!-- Drop Zone -->
      <div class="drop-zone" [class.dragover]="dragover"
        (dragover)="$event.preventDefault(); dragover=true"
        (dragleave)="dragover=false"
        (drop)="onDrop($event)">
        <div class="drop-icon">📁</div>
        <div class="drop-text">Drag & drop a CSV or Excel file here</div>
        <div class="drop-sub">or</div>
        <label class="btn-pick">
          Choose File
          <input type="file" accept=".csv,.xlsx,.xls" (change)="onFilePick($event)" hidden />
        </label>
        <div class="drop-formats">Supported: .csv, .xlsx, .xls</div>
      </div>

      @if (uploading()) {
        <div class="upload-status">⏳ Uploading…</div>
      }

      <!-- Preview -->
      @if (preview()) {
        <div class="preview-card">
          <div class="preview-title">📊 File Preview — {{ previewUpload()?.original_name }}</div>
          <div class="preview-meta">
            Columns: {{ preview()?.columns?.join(', ') }}
            · Rows: {{ preview()?.total_rows }}
          </div>
          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead>
                <tr>
                  @for (col of preview()?.columns; track col) {
                    <th>{{ col }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of preview()?.rows?.slice(0, 10); track $index) {
                  <tr>
                    @for (col of preview()?.columns; track col) {
                      <td>{{ row[col] }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Upload History -->
      <div class="panel">
        <div class="panel-title">📋 Recent Uploads</div>
        @if (uploads().length === 0) {
          <div class="empty-state">No files uploaded yet.</div>
        }
        @for (u of uploads(); track u.id) {
          <div class="upload-row">
            <div class="upload-icon">{{ u.file_type === 'csv' ? '📄' : '📊' }}</div>
            <div class="upload-info">
              <div class="upload-name">{{ u.original_name }}</div>
              <div class="upload-meta">
                {{ u.file_type?.toUpperCase() }} · {{ formatSize(u.file_size) }}
                · {{ u.created_at | date:'short' }}
              </div>
            </div>
            <span class="upload-status-badge" [class]="'us-' + u.status">{{ u.status }}</span>
            <button class="btn-sm" (click)="loadPreview(u)">Preview</button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .page { font-family: system-ui, -apple-system, sans-serif; padding: 28px 32px; }
    .page-header { margin-bottom:24px; }
    .page-header h1 { font-size:22px; font-weight:800; color:#111; margin:0 0 4px; }
    .page-header p  { font-size:13px; color:#6b7280; margin:0; }
    .drop-zone { border:2px dashed #d1d5db; border-radius:14px; padding:48px; text-align:center;
      background:#fafafa; transition:all .15s; margin-bottom:20px; cursor:default; }
    .drop-zone.dragover { border-color:#dc2626; background:#fef2f2; }
    .drop-icon { font-size:40px; margin-bottom:12px; }
    .drop-text { font-size:16px; font-weight:600; color:#374151; margin-bottom:6px; }
    .drop-sub  { font-size:13px; color:#9ca3af; margin-bottom:12px; }
    .btn-pick  { padding:10px 24px; background:#dc2626; color:#fff; border-radius:8px;
      cursor:pointer; font-size:14px; font-weight:600; display:inline-block; }
    .drop-formats { font-size:12px; color:#9ca3af; margin-top:12px; }
    .upload-status { background:#fef3c7; color:#92400e; padding:12px 16px; border-radius:8px;
      font-size:13px; margin-bottom:16px; }
    .preview-card { background:#fff; border-radius:12px; padding:18px; box-shadow:0 1px 4px rgba(0,0,0,.07); margin-bottom:20px; }
    .preview-title { font-size:14px; font-weight:700; color:#111; margin-bottom:6px; }
    .preview-meta { font-size:12px; color:#6b7280; margin-bottom:12px; }
    .preview-table-wrap { overflow-x:auto; }
    .preview-table { width:100%; border-collapse:collapse; font-size:12px; }
    .preview-table th { padding:8px 12px; background:#f9fafb; font-weight:700; color:#6b7280;
      text-align:left; border-bottom:1.5px solid #e5e7eb; white-space:nowrap; }
    .preview-table td { padding:7px 12px; border-bottom:1px solid #f1f5f9; color:#374151; }
    .panel { background:#fff; border-radius:12px; padding:18px; box-shadow:0 1px 4px rgba(0,0,0,.07); }
    .panel-title { font-size:13px; font-weight:700; color:#111; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #f1f5f9; }
    .empty-state { color:#9ca3af; font-size:13px; padding:20px 0; text-align:center; }
    .upload-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f8fafc; }
    .upload-row:last-child { border-bottom:none; }
    .upload-icon { font-size:22px; flex-shrink:0; }
    .upload-info { flex:1; }
    .upload-name { font-size:13.5px; font-weight:600; color:#374151; }
    .upload-meta { font-size:11.5px; color:#9ca3af; margin-top:2px; }
    .upload-status-badge { font-size:11px; font-weight:600; padding:3px 9px;
      border-radius:99px; white-space:nowrap; }
    .us-uploaded { background:#dbeafe; color:#1d4ed8; }
    .us-parsed   { background:#fef3c7; color:#92400e; }
    .us-imported { background:#dcfce7; color:#166534; }
    .us-error    { background:#fee2e2; color:#991b1b; }
    .btn-sm { padding:5px 12px; border:1.5px solid #e5e7eb; background:#fff;
      border-radius:6px; cursor:pointer; font-size:12px; font-weight:500; }
  `]
})
export class UploadManagerComponent implements OnInit {
  private api = inject(ApiService);
  uploads = signal<any[]>([]);
  uploading = signal(false);
  preview = signal<any>(null);
  previewUpload = signal<any>(null);
  dragover = false;

  ngOnInit() { this.api.getUploads().subscribe(u => this.uploads.set(u)); }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragover = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.upload(file);
  }

  onFilePick(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.upload(file);
  }

  upload(file: File) {
    this.uploading.set(true);
    this.api.uploadFile(file).subscribe({
      next: (u) => {
        this.uploading.set(false);
        this.api.getUploads().subscribe(us => this.uploads.set(us));
        this.loadPreview(u);
      },
      error: () => this.uploading.set(false)
    });
  }

  loadPreview(upload: any) {
    this.previewUpload.set(upload);
    this.api.previewUpload(upload.id).subscribe(p => this.preview.set(p));
  }

  formatSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
