import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // Auth
  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.base}/auth/login`, { email, password });
  }
  me(): Observable<any> {
    return this.http.get(`${this.base}/auth/me`);
  }
  register(data: any): Observable<any> {
    return this.http.post(`${this.base}/auth/register`, data);
  }

  // Scorecards
  getScorecards(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/scorecards`);
  }
  getScorecard(id: string): Observable<any> {
    return this.http.get<any>(`${this.base}/scorecards/${id}`);
  }
  createScorecard(data: any): Observable<any> {
    return this.http.post(`${this.base}/scorecards`, data);
  }
  updateScorecard(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/scorecards/${id}`, data);
  }
  deleteScorecard(id: string): Observable<any> {
    return this.http.delete(`${this.base}/scorecards/${id}`);
  }
  publishScorecard(id: string): Observable<any> {
    return this.http.post(`${this.base}/scorecards/${id}/publish`, {});
  }
  getScorecardVersions(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/scorecards/${id}/versions`);
  }

  // Sections
  createSection(scorecardId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/scorecards/${scorecardId}/sections`, data);
  }
  updateSection(sectionId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/sections/${sectionId}`, data);
  }
  deleteSection(sectionId: string): Observable<any> {
    return this.http.delete(`${this.base}/sections/${sectionId}`);
  }

  // KPIs
  createKpi(scorecardId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/scorecards/${scorecardId}/kpis`, data);
  }
  updateKpi(kpiId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/kpis/${kpiId}`, data);
  }
  deleteKpi(kpiId: string): Observable<any> {
    return this.http.delete(`${this.base}/kpis/${kpiId}`);
  }
  getKpiStats(kpiId: string): Observable<any> {
    return this.http.get(`${this.base}/kpis/${kpiId}/stats`);
  }
  addKpiHistory(kpiId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/kpis/${kpiId}/history`, data);
  }

  // Checklist
  createChecklistItem(sectionId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/sections/${sectionId}/checklist-items`, data);
  }
  updateChecklistItem(itemId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/sections/checklist-items/${itemId}`, data);
  }
  deleteChecklistItem(itemId: string): Observable<any> {
    return this.http.delete(`${this.base}/sections/checklist-items/${itemId}`);
  }

  // Action Items
  createActionItem(sectionId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/sections/${sectionId}/action-items`, data);
  }
  updateActionItem(itemId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/sections/action-items/${itemId}`, data);
  }
  deleteActionItem(itemId: string): Observable<any> {
    return this.http.delete(`${this.base}/sections/action-items/${itemId}`);
  }

  // Metric Rows
  createMetricRow(sectionId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/sections/${sectionId}/metric-rows`, data);
  }
  updateMetricRow(rowId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/sections/metric-rows/${rowId}`, data);
  }
  deleteMetricRow(rowId: string): Observable<any> {
    return this.http.delete(`${this.base}/sections/metric-rows/${rowId}`);
  }

  // Insight Blocks
  createInsightBlock(sectionId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/sections/${sectionId}/insight-blocks`, data);
  }
  updateInsightBlock(blockId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/sections/insight-blocks/${blockId}`, data);
  }
  deleteInsightBlock(blockId: string): Observable<any> {
    return this.http.delete(`${this.base}/sections/insight-blocks/${blockId}`);
  }

  // Focus Items
  createFocusItem(sectionId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/sections/${sectionId}/focus-items`, data);
  }
  updateFocusItem(itemId: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/sections/focus-items/${itemId}`, data);
  }
  deleteFocusItem(itemId: string): Observable<any> {
    return this.http.delete(`${this.base}/sections/focus-items/${itemId}`);
  }

  // Timeline Items
  createTimelineItem(sectionId: string, data: any): Observable<any> {
    return this.http.post(`${this.base}/sections/${sectionId}/timeline-items`, data);
  }
  deleteTimelineItem(itemId: string): Observable<any> {
    return this.http.delete(`${this.base}/sections/timeline-items/${itemId}`);
  }

  // Users
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/users`);
  }
  createUser(data: any): Observable<any> {
    return this.http.post(`${this.base}/users`, data);
  }
  updateUser(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.base}/users/${id}`, data);
  }
  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.base}/users/${id}`);
  }

  // Uploads
  uploadFile(file: File, scorecardId?: string): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    if (scorecardId) form.append('scorecard_id', scorecardId);
    return this.http.post(`${this.base}/uploads`, form);
  }
  getUploads(scorecardId?: string): Observable<any[]> {
    const params = scorecardId ? `?scorecard_id=${scorecardId}` : '';
    return this.http.get<any[]>(`${this.base}/uploads${params}`);
  }
  previewUpload(id: string): Observable<any> {
    return this.http.get(`${this.base}/uploads/${id}/preview`);
  }

  // Audit
  getAuditLog(entityType?: string): Observable<any[]> {
    const params = entityType ? `?entity_type=${entityType}` : '';
    return this.http.get<any[]>(`${this.base}/audit${params}`);
  }
}
