from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Any
from datetime import datetime


# ─── AUTH ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime
    class Config: from_attributes = True

class UserCreate(BaseModel):
    email: str
    name: str
    role: str = "viewer"
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# ─── KPI HISTORY ──────────────────────────────────────────────────────────────

class KPIHistoryOut(BaseModel):
    id: str
    period: str
    value: float
    recorded_at: datetime
    class Config: from_attributes = True

class KPIHistoryCreate(BaseModel):
    period: str
    value: float


# ─── KPI ──────────────────────────────────────────────────────────────────────

class KPIOut(BaseModel):
    id: str
    scorecard_id: str
    label: str
    value: str
    sub_text: Optional[str] = None
    bar_percent: float = 0
    color: str = "green"
    trend: str = "stable"
    sort_order: int = 0
    created_at: datetime
    updated_at: datetime
    history: list[KPIHistoryOut] = []
    class Config: from_attributes = True

class KPICreate(BaseModel):
    label: str
    value: str
    sub_text: Optional[str] = None
    bar_percent: float = Field(0, ge=0, le=100)
    color: str = "green"
    trend: str = "stable"
    sort_order: int = 0

class KPIUpdate(BaseModel):
    label: Optional[str] = None
    value: Optional[str] = None
    sub_text: Optional[str] = None
    bar_percent: Optional[float] = Field(None, ge=0, le=100)
    color: Optional[str] = None
    trend: Optional[str] = None
    sort_order: Optional[int] = None


# ─── SECTION ITEMS ────────────────────────────────────────────────────────────

class ChecklistItemOut(BaseModel):
    id: str
    text: str
    done: bool
    sort_order: int
    class Config: from_attributes = True

class ChecklistItemCreate(BaseModel):
    text: str
    done: bool = False
    sort_order: int = 0

class ChecklistItemUpdate(BaseModel):
    text: Optional[str] = None
    done: Optional[bool] = None
    sort_order: Optional[int] = None


class ActionItemOut(BaseModel):
    id: str
    action_text: str
    owner: Optional[str] = None
    owner_color: str = "blue"
    status: str = "in_progress"
    sort_order: int = 0
    updated_at: datetime
    class Config: from_attributes = True

class ActionItemCreate(BaseModel):
    action_text: str
    owner: Optional[str] = None
    owner_color: str = "blue"
    status: str = "in_progress"
    sort_order: int = 0

class ActionItemUpdate(BaseModel):
    action_text: Optional[str] = None
    owner: Optional[str] = None
    owner_color: Optional[str] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None


class MetricRowOut(BaseModel):
    id: str
    label: str
    bar_percent: float
    bar_color: str
    status: str
    sort_order: int
    class Config: from_attributes = True

class MetricRowCreate(BaseModel):
    label: str
    bar_percent: float = Field(0, ge=0, le=100)
    bar_color: str = "green"
    status: str = "met"
    sort_order: int = 0

class MetricRowUpdate(BaseModel):
    label: Optional[str] = None
    bar_percent: Optional[float] = Field(None, ge=0, le=100)
    bar_color: Optional[str] = None
    status: Optional[str] = None
    sort_order: Optional[int] = None


class InsightBlockOut(BaseModel):
    id: str
    heading: str
    body: str
    color: str
    sort_order: int
    class Config: from_attributes = True

class InsightBlockCreate(BaseModel):
    heading: str
    body: str
    color: str = "crimson"
    sort_order: int = 0

class InsightBlockUpdate(BaseModel):
    heading: Optional[str] = None
    body: Optional[str] = None
    color: Optional[str] = None


class FocusItemOut(BaseModel):
    id: str
    text: str
    sort_order: int
    class Config: from_attributes = True

class FocusItemCreate(BaseModel):
    text: str
    sort_order: int = 0

class FocusItemUpdate(BaseModel):
    text: Optional[str] = None
    sort_order: Optional[int] = None


class TimelineItemOut(BaseModel):
    id: str
    text: str
    sort_order: int
    class Config: from_attributes = True

class TimelineItemCreate(BaseModel):
    text: str
    sort_order: int = 0


# ─── SECTION ──────────────────────────────────────────────────────────────────

class SectionOut(BaseModel):
    id: str
    scorecard_id: str
    title: str
    section_type: str
    icon: Optional[str] = None
    accent_color: str
    display_order: int
    config: dict = {}
    checklist_items: list[ChecklistItemOut] = []
    action_items: list[ActionItemOut] = []
    metric_rows: list[MetricRowOut] = []
    insight_blocks: list[InsightBlockOut] = []
    focus_items: list[FocusItemOut] = []
    timeline_items: list[TimelineItemOut] = []
    class Config: from_attributes = True

class SectionCreate(BaseModel):
    title: str
    section_type: str
    icon: Optional[str] = None
    accent_color: str = "crimson"
    display_order: int = 0
    config: dict = {}

class SectionUpdate(BaseModel):
    title: Optional[str] = None
    section_type: Optional[str] = None
    icon: Optional[str] = None
    accent_color: Optional[str] = None
    display_order: Optional[int] = None
    config: Optional[dict] = None


# ─── SCORECARD ────────────────────────────────────────────────────────────────

class ScorecardOut(BaseModel):
    id: str
    slug: str
    title: str
    subtitle: Optional[str] = None
    period: Optional[str] = None
    status: str
    accent_color: str
    icon: str
    display_order: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    kpis: list[KPIOut] = []
    sections: list[SectionOut] = []
    class Config: from_attributes = True

class ScorecardCreate(BaseModel):
    slug: str
    title: str
    subtitle: Optional[str] = None
    period: Optional[str] = None
    accent_color: str = "crimson"
    icon: str = "📊"
    display_order: int = 0

class ScorecardUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    period: Optional[str] = None
    accent_color: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    status: Optional[str] = None


# ─── UPLOAD ───────────────────────────────────────────────────────────────────

class UploadOut(BaseModel):
    id: str
    scorecard_id: Optional[str] = None
    filename: str
    original_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: int = 0
    status: str
    created_at: datetime
    class Config: from_attributes = True


# ─── AUDIT LOG ────────────────────────────────────────────────────────────────

class AuditLogOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    entity_type: str
    entity_id: Optional[str] = None
    action: str
    old_value: Optional[Any] = None
    new_value: Optional[Any] = None
    created_at: datetime
    class Config: from_attributes = True


# ─── VERSION ──────────────────────────────────────────────────────────────────

class VersionOut(BaseModel):
    id: str
    scorecard_id: str
    version_num: int
    published_by: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True
