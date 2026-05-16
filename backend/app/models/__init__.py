import uuid
from datetime import datetime
from sqlalchemy import (
    String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ─── USER ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id:            Mapped[str]  = mapped_column(String, primary_key=True, default=gen_uuid)
    email:         Mapped[str]  = mapped_column(String, unique=True, nullable=False)
    name:          Mapped[str]  = mapped_column(String, nullable=False)
    role:          Mapped[str]  = mapped_column(String, default="viewer")  # admin|editor|viewer
    password_hash: Mapped[str]  = mapped_column(String, nullable=False)
    is_active:     Mapped[bool] = mapped_column(Boolean, default=True)
    created_at:    Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    scorecards = relationship("Scorecard", back_populates="creator")
    audit_logs = relationship("AuditLog", back_populates="user")


# ─── SCORECARD ────────────────────────────────────────────────────────────────

class Scorecard(Base):
    __tablename__ = "scorecards"

    id:            Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    slug:          Mapped[str] = mapped_column(String, unique=True, nullable=False)
    title:         Mapped[str] = mapped_column(String, nullable=False)
    subtitle:      Mapped[str] = mapped_column(String, nullable=True)
    period:        Mapped[str] = mapped_column(String, nullable=True)
    status:        Mapped[str] = mapped_column(String, default="published")  # draft|published
    accent_color:  Mapped[str] = mapped_column(String, default="crimson")
    icon:          Mapped[str] = mapped_column(String, default="🔐")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    created_by:    Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=True)
    published_at:  Mapped[datetime] = mapped_column(DateTime, nullable=True)
    created_at:    Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:    Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator  = relationship("User", back_populates="scorecards")
    sections = relationship("Section", back_populates="scorecard", cascade="all, delete-orphan", order_by="Section.display_order")
    kpis     = relationship("KPI", back_populates="scorecard", cascade="all, delete-orphan", order_by="KPI.sort_order")
    versions = relationship("ScorecardVersion", back_populates="scorecard", cascade="all, delete-orphan")
    uploads  = relationship("Upload", back_populates="scorecard")


# ─── SECTION ──────────────────────────────────────────────────────────────────

class Section(Base):
    __tablename__ = "sections"

    id:            Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    scorecard_id:  Mapped[str] = mapped_column(ForeignKey("scorecards.id"), nullable=False)
    title:         Mapped[str] = mapped_column(String, nullable=False)
    section_type:  Mapped[str] = mapped_column(String, nullable=False)  # timeline|checklist|action_table|metric_table|insight|focus_list
    icon:          Mapped[str] = mapped_column(String, nullable=True)
    accent_color:  Mapped[str] = mapped_column(String, default="crimson")
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    config:        Mapped[dict] = mapped_column(JSON, default=dict)
    created_at:    Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    scorecard      = relationship("Scorecard", back_populates="sections")
    checklist_items = relationship("ChecklistItem", back_populates="section", cascade="all, delete-orphan", order_by="ChecklistItem.sort_order")
    action_items   = relationship("ActionItem", back_populates="section", cascade="all, delete-orphan", order_by="ActionItem.sort_order")
    metric_rows    = relationship("MetricRow", back_populates="section", cascade="all, delete-orphan", order_by="MetricRow.sort_order")
    insight_blocks = relationship("InsightBlock", back_populates="section", cascade="all, delete-orphan", order_by="InsightBlock.sort_order")
    focus_items    = relationship("FocusItem", back_populates="section", cascade="all, delete-orphan", order_by="FocusItem.sort_order")
    timeline_items = relationship("TimelineItem", back_populates="section", cascade="all, delete-orphan", order_by="TimelineItem.sort_order")


# ─── KPI ──────────────────────────────────────────────────────────────────────

class KPI(Base):
    __tablename__ = "kpis"

    id:           Mapped[str]   = mapped_column(String, primary_key=True, default=gen_uuid)
    scorecard_id: Mapped[str]   = mapped_column(ForeignKey("scorecards.id"), nullable=False)
    label:        Mapped[str]   = mapped_column(String, nullable=False)
    value:        Mapped[str]   = mapped_column(String, nullable=False)
    sub_text:     Mapped[str]   = mapped_column(String, nullable=True)
    bar_percent:  Mapped[float] = mapped_column(Float, default=0)
    color:        Mapped[str]   = mapped_column(String, default="green")   # green|amber|blue|crimson
    trend:        Mapped[str]   = mapped_column(String, default="stable")  # up|down|stable
    sort_order:   Mapped[int]   = mapped_column(Integer, default=0)
    created_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    scorecard = relationship("Scorecard", back_populates="kpis")
    history   = relationship("KPIHistory", back_populates="kpi", cascade="all, delete-orphan", order_by="KPIHistory.period")


class KPIHistory(Base):
    __tablename__ = "kpi_history"

    id:          Mapped[str]   = mapped_column(String, primary_key=True, default=gen_uuid)
    kpi_id:      Mapped[str]   = mapped_column(ForeignKey("kpis.id"), nullable=False)
    period:      Mapped[str]   = mapped_column(String, nullable=False)
    value:       Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    kpi = relationship("KPI", back_populates="history")


# ─── SECTION CONTENT MODELS ───────────────────────────────────────────────────

class ChecklistItem(Base):
    __tablename__ = "checklist_items"

    id:         Mapped[str]  = mapped_column(String, primary_key=True, default=gen_uuid)
    section_id: Mapped[str]  = mapped_column(ForeignKey("sections.id"), nullable=False)
    text:       Mapped[str]  = mapped_column(Text, nullable=False)
    done:       Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int]  = mapped_column(Integer, default=0)

    section = relationship("Section", back_populates="checklist_items")


class ActionItem(Base):
    __tablename__ = "action_items"

    id:          Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    section_id:  Mapped[str] = mapped_column(String, ForeignKey("sections.id"), nullable=False)
    action_text: Mapped[str] = mapped_column(Text, nullable=False)
    owner:       Mapped[str] = mapped_column(String, nullable=True)
    owner_color: Mapped[str] = mapped_column(String, default="blue")  # blue|green|red|amber
    status:      Mapped[str] = mapped_column(String, default="in_progress")  # on_track|in_progress|at_risk|done
    sort_order:  Mapped[int] = mapped_column(Integer, default=0)
    updated_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    section = relationship("Section", back_populates="action_items")


class MetricRow(Base):
    __tablename__ = "metric_rows"

    id:          Mapped[str]   = mapped_column(String, primary_key=True, default=gen_uuid)
    section_id:  Mapped[str]   = mapped_column(ForeignKey("sections.id"), nullable=False)
    label:       Mapped[str]   = mapped_column(String, nullable=False)
    bar_percent: Mapped[float] = mapped_column(Float, default=0)
    bar_color:   Mapped[str]   = mapped_column(String, default="green")
    status:      Mapped[str]   = mapped_column(String, default="met")  # met|active|at_risk
    sort_order:  Mapped[int]   = mapped_column(Integer, default=0)

    section = relationship("Section", back_populates="metric_rows")


class InsightBlock(Base):
    __tablename__ = "insight_blocks"

    id:         Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    section_id: Mapped[str] = mapped_column(ForeignKey("sections.id"), nullable=False)
    heading:    Mapped[str] = mapped_column(String, nullable=False)
    body:       Mapped[str] = mapped_column(Text, nullable=False)
    color:      Mapped[str] = mapped_column(String, default="crimson")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    section = relationship("Section", back_populates="insight_blocks")


class FocusItem(Base):
    __tablename__ = "focus_items"

    id:         Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    section_id: Mapped[str] = mapped_column(ForeignKey("sections.id"), nullable=False)
    text:       Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    section = relationship("Section", back_populates="focus_items")


class TimelineItem(Base):
    __tablename__ = "timeline_items"

    id:         Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    section_id: Mapped[str] = mapped_column(ForeignKey("sections.id"), nullable=False)
    text:       Mapped[str] = mapped_column(Text, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    section = relationship("Section", back_populates="timeline_items")


# ─── UPLOAD ───────────────────────────────────────────────────────────────────

class Upload(Base):
    __tablename__ = "uploads"

    id:           Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    scorecard_id: Mapped[str] = mapped_column(ForeignKey("scorecards.id"), nullable=True)
    filename:     Mapped[str] = mapped_column(String, nullable=False)
    original_name:Mapped[str] = mapped_column(String, nullable=True)
    file_type:    Mapped[str] = mapped_column(String, nullable=True)
    file_size:    Mapped[int] = mapped_column(Integer, default=0)
    storage_path: Mapped[str] = mapped_column(String, nullable=True)
    status:       Mapped[str] = mapped_column(String, default="uploaded")  # uploaded|parsed|imported|error
    parsed_data:  Mapped[dict] = mapped_column(JSON, nullable=True)
    uploaded_by:  Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    scorecard = relationship("Scorecard", back_populates="uploads")


# ─── AUDIT LOG ────────────────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_log"

    id:          Mapped[str]  = mapped_column(String, primary_key=True, default=gen_uuid)
    user_id:     Mapped[str]  = mapped_column(ForeignKey("users.id"), nullable=True)
    entity_type: Mapped[str]  = mapped_column(String, nullable=False)
    entity_id:   Mapped[str]  = mapped_column(String, nullable=True)
    action:      Mapped[str]  = mapped_column(String, nullable=False)
    old_value:   Mapped[dict] = mapped_column(JSON, nullable=True)
    new_value:   Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at:  Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


# ─── VERSION HISTORY ──────────────────────────────────────────────────────────

class ScorecardVersion(Base):
    __tablename__ = "scorecard_versions"

    id:           Mapped[str]  = mapped_column(String, primary_key=True, default=gen_uuid)
    scorecard_id: Mapped[str]  = mapped_column(ForeignKey("scorecards.id"), nullable=False)
    version_num:  Mapped[int]  = mapped_column(Integer, nullable=False)
    snapshot:     Mapped[dict] = mapped_column(JSON, nullable=False)
    published_by: Mapped[str]  = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    scorecard = relationship("Scorecard", back_populates="versions")
