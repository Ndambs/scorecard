"""
VG VMT-UAM OPS-APPL CON — Pydantic Schemas
Drop this file into: backend/app/schemas/vmt_uam.py
"""

from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Member stat schemas
# ---------------------------------------------------------------------------

class MemberStatIn(BaseModel):
    agent_id:    str = Field(..., max_length=40, examples=["benson"])
    agent_name:  str = Field(..., max_length=120, examples=["Benson Ndambiri"])
    open_sla:      int = Field(0, ge=0)
    open_breach:   int = Field(0, ge=0)
    open_blank:    int = Field(0, ge=0)
    pending:       int = Field(0, ge=0)
    closed_sla:    int = Field(0, ge=0)
    closed_breach: int = Field(0, ge=0)
    closed_blank:  int = Field(0, ge=0)


class MemberStatOut(MemberStatIn):
    id:                  int
    report_id:           int
    total_closed:        int
    total_open:          int
    agent_sla_rate:      float
    productivity_score:  float

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Report schemas
# ---------------------------------------------------------------------------

class ReportCreate(BaseModel):
    period_start:  date
    period_end:    date
    notes:         Optional[str] = ""
    created_by:    Optional[str] = "editor"

    # Queue totals
    q_logged:        int = Field(0, ge=0)
    q_open_sla:      int = Field(0, ge=0)
    q_open_breach:   int = Field(0, ge=0)
    q_open_blank:    int = Field(0, ge=0)
    q_pending:       int = Field(0, ge=0)
    q_total_open:    int = Field(0, ge=0)
    q_closed_sla:    int = Field(0, ge=0)
    q_closed_breach: int = Field(0, ge=0)
    q_closed_blank:  int = Field(0, ge=0)
    q_total_closed:  int = Field(0, ge=0)
    q_sla_rate:      float = Field(0.0, ge=0, le=100)

    members: List[MemberStatIn] = []

    @model_validator(mode="after")
    def check_dates(self):
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        return self


class ReportUpdate(BaseModel):
    notes:           Optional[str]  = None
    q_logged:        Optional[int]  = None
    q_open_sla:      Optional[int]  = None
    q_open_breach:   Optional[int]  = None
    q_open_blank:    Optional[int]  = None
    q_pending:       Optional[int]  = None
    q_total_open:    Optional[int]  = None
    q_closed_sla:    Optional[int]  = None
    q_closed_breach: Optional[int]  = None
    q_closed_blank:  Optional[int]  = None
    q_total_closed:  Optional[int]  = None
    q_sla_rate:      Optional[float]= None
    members:         Optional[List[MemberStatIn]] = None


class ReportOut(BaseModel):
    id:                   int
    period_start:         date
    period_end:           date
    notes:                str
    is_published:         bool
    created_by:           str
    created_at:           datetime
    updated_at:           datetime

    q_logged:             int
    q_open_sla:           int
    q_open_breach:        int
    q_open_blank:         int
    q_pending:            int
    q_total_open:         int
    q_closed_sla:         int
    q_closed_breach:      int
    q_closed_blank:       int
    q_total_closed:       int
    q_sla_rate:           float

    resolution_efficiency: float
    throughput_ratio:      float
    breach_rate_closed:    float
    pending_share:         float
    open_breach_rate:      float
    backlog_health_score:  float

    members: List[MemberStatOut] = []

    class Config:
        from_attributes = True


class ReportListItem(BaseModel):
    id:           int
    period_start: date
    period_end:   date
    q_logged:     int
    q_total_closed: int
    q_total_open:   int
    q_sla_rate:     float
    is_published:   bool
    created_at:     datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Analytics / trend schemas (returned by /vmt-uam/analytics)
# ---------------------------------------------------------------------------

class WeeklyTrendPoint(BaseModel):
    period_start:          date
    period_end:            date
    q_total_closed:        int
    q_total_open:          int
    q_sla_rate:            float
    resolution_efficiency: float
    throughput_ratio:      float
    backlog_health_score:  float


class AnalyticsSummary(BaseModel):
    total_reports:           int
    avg_sla_rate:            float
    avg_resolution_efficiency: float
    avg_throughput_ratio:    float
    best_sla_week:           Optional[date]
    worst_sla_week:          Optional[date]
    trend:                   List[WeeklyTrendPoint]
    sla_target_met_count:    int       # weeks where sla_rate >= 90
    sla_target_miss_count:   int


# ---------------------------------------------------------------------------
# Report text generation
# ---------------------------------------------------------------------------

class GeneratedReport(BaseModel):
    period_label:    str
    executive_summary: str
    volume_analysis:   str
    sla_analysis:      str
    member_activity:   str
    backlog_risk:      str
    recommendations:   List[str]
    health_score:      float
    health_label:      str
