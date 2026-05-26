"""
VG VMT-UAM OPS-APPL CON — ORM Models
Drop this file into: backend/app/models/vmt_uam.py
Then add  `from .vmt_uam import *`  to backend/app/models/__init__.py
"""

from datetime import date, datetime
from sqlalchemy import (
    Column, Integer, String, Float, Date, DateTime,
    ForeignKey, Text, Boolean
)
from sqlalchemy.orm import relationship
from ..database import Base


class VmtUamReport(Base):
    """One weekly MI report for the VG VMT-UAM OPS-APPL CON queue."""
    __tablename__ = "vmt_uam_reports"

    id             = Column(Integer, primary_key=True, index=True)
    period_start   = Column(Date, nullable=False)
    period_end     = Column(Date, nullable=False)
    notes          = Column(Text, default="")
    is_published   = Column(Boolean, default=False)
    created_by     = Column(String(120), default="system")
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Queue-level totals (from MI Calculation page)
    q_logged         = Column(Integer, default=0)
    q_open_sla       = Column(Integer, default=0)
    q_open_breach    = Column(Integer, default=0)
    q_open_blank     = Column(Integer, default=0)
    q_pending        = Column(Integer, default=0)
    q_total_open     = Column(Integer, default=0)
    q_closed_sla     = Column(Integer, default=0)
    q_closed_breach  = Column(Integer, default=0)
    q_closed_blank   = Column(Integer, default=0)
    q_total_closed   = Column(Integer, default=0)
    q_sla_rate       = Column(Float, default=0.0)   # e.g. 86.0

    # Computed analytics (persisted for trend queries)
    resolution_efficiency = Column(Float, default=0.0)   # closed_sla / total_closed
    throughput_ratio      = Column(Float, default=0.0)   # total_closed / logged
    breach_rate_closed    = Column(Float, default=0.0)   # closed_breach / total_closed
    pending_share         = Column(Float, default=0.0)   # pending / total_open
    open_breach_rate      = Column(Float, default=0.0)   # open_breach / total_open
    backlog_health_score  = Column(Float, default=0.0)   # composite 0-100

    members = relationship("VmtUamMemberStat", back_populates="report",
                           cascade="all, delete-orphan")


class VmtUamMemberStat(Base):
    """Per-agent ticket stats for a single report period."""
    __tablename__ = "vmt_uam_member_stats"

    id          = Column(Integer, primary_key=True, index=True)
    report_id   = Column(Integer, ForeignKey("vmt_uam_reports.id"), nullable=False)
    agent_id    = Column(String(40), nullable=False)   # e.g. "benson"
    agent_name  = Column(String(120), nullable=False)

    open_sla      = Column(Integer, default=0)
    open_breach   = Column(Integer, default=0)
    open_blank    = Column(Integer, default=0)
    pending       = Column(Integer, default=0)
    closed_sla    = Column(Integer, default=0)
    closed_breach = Column(Integer, default=0)
    closed_blank  = Column(Integer, default=0)

    # Derived per-agent metrics
    total_closed        = Column(Integer, default=0)
    total_open          = Column(Integer, default=0)
    agent_sla_rate      = Column(Float, default=0.0)
    productivity_score  = Column(Float, default=0.0)  # 0-100

    report = relationship("VmtUamReport", back_populates="members")
