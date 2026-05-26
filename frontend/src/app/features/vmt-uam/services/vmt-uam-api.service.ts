import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VmtReport, AnalyticsSummary, GeneratedReport } from '../models/vmt-uam.models';
import { environment } from '../../../../environments/environment';

export interface ParsedPdfResult {
  period_start:    string | null;
  period_end:      string | null;
  q_logged:        number;
  q_open_sla:      number;
  q_open_breach:   number;
  q_open_blank:    number;
  q_pending:       number;
  q_total_open:    number;
  q_closed_sla:    number;
  q_closed_breach: number;
  q_closed_blank:  number;
  q_total_closed:  number;
  q_sla_rate:      number;
  members: {
    agent_id: string; agent_name: string;
    open_sla: number; open_breach: number; open_blank: number; pending: number;
    closed_sla: number; closed_breach: number; closed_blank: number;
  }[];
  warnings: string[];
}

@Injectable({ providedIn: 'root' })
export class VmtUamApiService {
  private base = `${environment.apiUrl}/vmt-uam`;
  constructor(private http: HttpClient) {}

  parsePdf(file: File): Observable<ParsedPdfResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ParsedPdfResult>(`${this.base}/parse-pdf`, form);
  }

  listReports(limit = 52): Observable<VmtReport[]> {
    return this.http.get<VmtReport[]>(`${this.base}/reports`, {
      params: new HttpParams().set('limit', limit),
    });
  }

  getReport(id: number): Observable<VmtReport> {
    return this.http.get<VmtReport>(`${this.base}/reports/${id}`);
  }

  createReport(payload: VmtReport): Observable<VmtReport> {
    return this.http.post<VmtReport>(`${this.base}/reports`, payload);
  }

  updateReport(id: number, payload: Partial<VmtReport>): Observable<VmtReport> {
    return this.http.patch<VmtReport>(`${this.base}/reports/${id}`, payload);
  }

  cloneReport(sourceId: number, newStart: string, newEnd: string): Observable<VmtReport> {
    const params = new HttpParams().set('new_start', newStart).set('new_end', newEnd);
    return this.http.post<VmtReport>(`${this.base}/reports/${sourceId}/clone`, {}, { params });
  }

  publishReport(id: number): Observable<VmtReport> {
    return this.http.post<VmtReport>(`${this.base}/reports/${id}/publish`, {});
  }

  generateReport(id: number): Observable<GeneratedReport> {
    return this.http.get<GeneratedReport>(`${this.base}/reports/${id}/generate`);
  }

  getAnalytics(weeks = 12): Observable<AnalyticsSummary> {
    return this.http.get<AnalyticsSummary>(`${this.base}/analytics`, {
      params: new HttpParams().set('weeks', weeks),
    });
  }
}
