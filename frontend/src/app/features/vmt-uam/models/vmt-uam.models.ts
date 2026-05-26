export interface MemberStat {
  id?: number;
  report_id?: number;
  agent_id: string;
  agent_name: string;
  open_sla: number;
  open_breach: number;
  open_blank: number;
  pending: number;
  closed_sla: number;
  closed_breach: number;
  closed_blank: number;
  total_closed?: number;
  total_open?: number;
  agent_sla_rate?: number;
  productivity_score?: number;
}

export interface VmtReport {
  id?: number;
  period_start: string;
  period_end: string;
  notes: string;
  is_published?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  q_logged: number;
  q_open_sla: number;
  q_open_breach: number;
  q_open_blank: number;
  q_pending: number;
  q_total_open: number;
  q_closed_sla: number;
  q_closed_breach: number;
  q_closed_blank: number;
  q_total_closed: number;
  q_sla_rate: number;
  resolution_efficiency?: number;
  throughput_ratio?: number;
  breach_rate_closed?: number;
  pending_share?: number;
  open_breach_rate?: number;
  backlog_health_score?: number;
  members: MemberStat[];
}

export interface WeeklyTrendPoint {
  period_start: string;
  period_end: string;
  q_total_closed: number;
  q_total_open: number;
  q_sla_rate: number;
  resolution_efficiency: number;
  throughput_ratio: number;
  backlog_health_score: number;
}

export interface AnalyticsSummary {
  total_reports: number;
  avg_sla_rate: number;
  avg_resolution_efficiency: number;
  avg_throughput_ratio: number;
  best_sla_week: string | null;
  worst_sla_week: string | null;
  trend: WeeklyTrendPoint[];
  sla_target_met_count: number;
  sla_target_miss_count: number;
}

export interface GeneratedReport {
  period_label: string;
  executive_summary: string;
  volume_analysis: string;
  sla_analysis: string;
  member_activity: string;
  backlog_risk: string;
  recommendations: string[];
  health_score: number;
  health_label: string;
}

export const TEAM_MEMBERS: Pick<MemberStat, 'agent_id' | 'agent_name'>[] = [
  { agent_id: 'benson',   agent_name: 'Benson Ndambiri'  },
  { agent_id: 'malcolm',  agent_name: 'Malcolm Ondicho'  },
  { agent_id: 'lebogang', agent_name: 'Lebogang Mafane'  },
  { agent_id: 'felistus', agent_name: 'Felistus Mugi'    },
];

export function emptyMember(agent_id: string, agent_name: string): MemberStat {
  return {
    agent_id, agent_name,
    open_sla: 0, open_breach: 0, open_blank: 0, pending: 0,
    closed_sla: 0, closed_breach: 0, closed_blank: 0,
  };
}

export function emptyReport(): VmtReport {
  return {
    period_start: '', period_end: '', notes: '',
    q_logged: 0, q_open_sla: 0, q_open_breach: 0, q_open_blank: 0,
    q_pending: 0, q_total_open: 0, q_closed_sla: 0, q_closed_breach: 0,
    q_closed_blank: 0, q_total_closed: 0, q_sla_rate: 0,
    members: TEAM_MEMBERS.map(t => emptyMember(t.agent_id, t.agent_name)),
  };
}
