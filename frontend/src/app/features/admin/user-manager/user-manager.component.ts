import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>User Management</h1><p>Manage platform users and roles</p></div>
        <button class="btn-primary" (click)="showCreate = true">+ Add User</button>
      </div>

      <div class="user-table-wrap">
        <table class="user-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr [class.me-row]="u.id === auth.currentUser()?.id">
                <td><div class="user-cell">
                  <div class="avatar" [class]="'av-' + u.role">{{ initials(u.name) }}</div>
                  <span>{{ u.name }}</span>
                  @if (u.id === auth.currentUser()?.id) { <span class="you-badge">You</span> }
                </div></td>
                <td class="email-cell">{{ u.email }}</td>
                <td><span class="role-badge" [class]="'rb-' + u.role">{{ u.role }}</span></td>
                <td><span class="status-badge" [class]="u.is_active ? 'st-active' : 'st-inactive'">
                  {{ u.is_active ? 'Active' : 'Inactive' }}</span></td>
                <td class="date-cell">{{ u.created_at | date:'mediumDate' }}</td>
                <td>
                  @if (u.id !== auth.currentUser()?.id) {
                    <div class="action-btns">
                      <button class="btn-sm" (click)="editUser(u)">Edit</button>
                      <button class="btn-sm btn-danger" (click)="deleteUser(u.id)">Delete</button>
                    </div>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (showCreate || editingUser) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal-title">{{ editingUser ? 'Edit User' : 'New User' }}</div>
            <div class="form-group"><label>Name</label>
              <input [(ngModel)]="form.name" class="fi" placeholder="Full name" /></div>
            <div class="form-group"><label>Email</label>
              <input [(ngModel)]="form.email" class="fi" placeholder="email@company.com" [disabled]="!!editingUser" /></div>
            <div class="form-group"><label>Role</label>
              <select [(ngModel)]="form.role" class="fi">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select></div>
            @if (!editingUser) {
              <div class="form-group"><label>Password</label>
                <input type="password" [(ngModel)]="form.password" class="fi" placeholder="••••••••" /></div>
            } @else {
              <div class="form-group"><label>New Password (leave blank to keep current)</label>
                <input type="password" [(ngModel)]="form.password" class="fi" placeholder="••••••••" /></div>
              <div class="form-group"><label>Status</label>
                <select [(ngModel)]="form.is_active" class="fi">
                  <option [ngValue]="true">Active</option>
                  <option [ngValue]="false">Inactive</option>
                </select></div>
            }
            @if (formError()) { <div class="error-msg">{{ formError() }}</div> }
            <div class="modal-btns">
              <button class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button class="btn-primary" (click)="submitForm()">{{ editingUser ? 'Save' : 'Create' }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; }
    .page { font-family: system-ui, -apple-system, sans-serif; padding: 28px 32px; }
    .page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; }
    .page-header h1 { font-size:22px; font-weight:800; color:#111; margin:0 0 4px; }
    .page-header p { font-size:13px; color:#6b7280; margin:0; }
    .user-table-wrap { background:#fff; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,.07); overflow:hidden; }
    .user-table { width:100%; border-collapse:collapse; }
    .user-table th { padding:12px 16px; font-size:11px; font-weight:700; color:#6b7280;
      text-transform:uppercase; letter-spacing:.5px; border-bottom:1.5px solid #f1f5f9;
      background:#fafafa; text-align:left; }
    .user-table td { padding:12px 16px; font-size:13.5px; color:#374151; border-bottom:1px solid #f8fafc; }
    .me-row td { background:#fffbeb; }
    .user-cell { display:flex; align-items:center; gap:10px; }
    .avatar { width:32px; height:32px; border-radius:50%; display:flex; align-items:center;
      justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }
    .av-admin { background:#dc2626; }.av-editor { background:#2563eb; }.av-viewer { background:#6b7280; }
    .you-badge { font-size:10px; background:#fef3c7; color:#92400e; padding:2px 7px; border-radius:99px; }
    .email-cell { color:#6b7280; font-size:13px; }
    .date-cell { color:#9ca3af; font-size:12px; }
    .role-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:99px; }
    .rb-admin  { background:#fee2e2; color:#991b1b; }
    .rb-editor { background:#dbeafe; color:#1d4ed8; }
    .rb-viewer { background:#f3f4f6; color:#4b5563; }
    .status-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:99px; }
    .st-active   { background:#dcfce7; color:#166534; }
    .st-inactive { background:#f3f4f6; color:#6b7280; }
    .action-btns { display:flex; gap:6px; }
    .btn-sm { padding:5px 12px; border:1.5px solid #e5e7eb; background:#fff;
      border-radius:6px; cursor:pointer; font-size:12px; font-weight:500; }
    .btn-sm:hover { border-color:#374151; }
    .btn-danger { border-color:#fee2e2; color:#dc2626; }
    .btn-danger:hover { background:#fef2f2; }
    .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5);
      display:flex; align-items:center; justify-content:center; z-index:1000; }
    .modal { background:#fff; border-radius:14px; padding:24px; width:420px;
      max-width:90vw; box-shadow:0 20px 60px rgba(0,0,0,.2); }
    .modal-title { font-size:17px; font-weight:800; color:#111; margin-bottom:18px; }
    .form-group { margin-bottom:14px; }
    .form-group label { display:block; font-size:11.5px; font-weight:600; color:#6b7280;
      margin-bottom:4px; text-transform:uppercase; letter-spacing:.4px; }
    .fi { width:100%; padding:8px 10px; border:1.5px solid #e5e7eb; border-radius:7px;
      font-size:13px; outline:none; }
    .fi:focus { border-color:#dc2626; }
    .error-msg { background:#fef2f2; border:1px solid #fecaca; color:#dc2626;
      padding:10px 12px; border-radius:8px; font-size:13px; margin-bottom:14px; }
    .modal-btns { display:flex; gap:10px; justify-content:flex-end; margin-top:20px; }
    .btn-primary { padding:9px 20px; background:#dc2626; color:#fff; border:none;
      border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
    .btn-secondary { padding:9px 20px; background:#f1f5f9; color:#374151; border:none;
      border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
  `]
})
export class UserManagerComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  users = signal<any[]>([]);
  showCreate = false;
  editingUser: any = null;
  form: any = { name: '', email: '', role: 'viewer', password: '', is_active: true };
  formError = signal('');

  ngOnInit() { this.api.getUsers().subscribe(u => this.users.set(u)); }

  initials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }

  editUser(u: any) {
    this.editingUser = u;
    this.form = { name: u.name, email: u.email, role: u.role, password: '', is_active: u.is_active };
  }

  closeModal() { this.showCreate = false; this.editingUser = null; this.form = { name:'', email:'', role:'viewer', password:'', is_active:true }; this.formError.set(''); }

  submitForm() {
    this.formError.set('');
    if (!this.form.name || (!this.editingUser && !this.form.email)) {
      this.formError.set('Name and email are required.');
      return;
    }
    const payload: any = { name: this.form.name, role: this.form.role };
    if (this.form.password) payload.password = this.form.password;
    if (this.editingUser) {
      payload.is_active = this.form.is_active;
      this.api.updateUser(this.editingUser.id, payload).subscribe({
        next: () => { this.closeModal(); this.api.getUsers().subscribe(u => this.users.set(u)); },
        error: (e) => this.formError.set(e.error?.detail || 'Update failed.')
      });
    } else {
      payload.email = this.form.email;
      this.api.createUser(payload).subscribe({
        next: () => { this.closeModal(); this.api.getUsers().subscribe(u => this.users.set(u)); },
        error: (e) => this.formError.set(e.error?.detail || 'Create failed.')
      });
    }
  }

  deleteUser(id: string) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    this.api.deleteUser(id).subscribe(() => this.api.getUsers().subscribe(u => this.users.set(u)));
  }
}
