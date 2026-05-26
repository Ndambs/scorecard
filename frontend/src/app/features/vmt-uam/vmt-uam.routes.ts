import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DataEntryComponent } from './components/data-entry/data-entry.component';
import { ReportComponent }    from './components/report/report.component';
import { HistoryComponent }   from './components/history/history.component';

export const VMT_UAM_ROUTES: Routes = [
  { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent, title: 'VMT-UAM Dashboard' },
  { path: 'entry',     component: DataEntryComponent,  title: 'VMT-UAM Data Entry' },
  { path: 'report',    component: ReportComponent,     title: 'VMT-UAM Weekly Report' },
  { path: 'history',   component: HistoryComponent,    title: 'VMT-UAM History' },
];
