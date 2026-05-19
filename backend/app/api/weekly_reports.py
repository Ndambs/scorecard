from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import WeeklyReport
from app.api.auth import require_viewer, require_editor
from app.models import User
import uuid


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ReviewItem(BaseModel):
    label: str
    status: str    # "In progress" | "Complete"

class WeeklyReportCreate(BaseModel):
    report_period: str
    week_start: Optional[str] = None
    week_end:   Optional[str] = None
    # Slide 2
    key_highlights:    list[str]        = []
    focus_areas:       list[str]        = []
    kpi_performance:   list[str]        = []
    sr_closure_status: list[str]        = []
    achievements:      list[str]        = []
    # Slide 3
    srs_closure:         list[str]        = []
    vf_focus_items:      list[str]        = []
    general_focus_areas: list[str]        = []
    q1_user_review:      list[ReviewItem] = []
    q4_user_review:      list[ReviewItem] = []
    smartapp_hub_focus:  list[str]        = []
    other_items:         list[str]        = []

class WeeklyReportUpdate(BaseModel):
    report_period: Optional[str] = None
    week_start:    Optional[str] = None
    week_end:      Optional[str] = None
    key_highlights:      Optional[list[str]]        = None
    focus_areas:         Optional[list[str]]        = None
    kpi_performance:     Optional[list[str]]        = None
    sr_closure_status:   Optional[list[str]]        = None
    achievements:        Optional[list[str]]        = None
    srs_closure:         Optional[list[str]]        = None
    vf_focus_items:      Optional[list[str]]        = None
    general_focus_areas: Optional[list[str]]        = None
    q1_user_review:      Optional[list[ReviewItem]] = None
    q4_user_review:      Optional[list[ReviewItem]] = None
    smartapp_hub_focus:  Optional[list[str]]        = None
    other_items:         Optional[list[str]]        = None
    status:              Optional[str]              = None

class WeeklyReportOut(BaseModel):
    id: str
    report_period: str
    week_start:    Optional[str] = None
    week_end:      Optional[str] = None
    status: str
    key_highlights:      list = []
    focus_areas:         list = []
    kpi_performance:     list = []
    sr_closure_status:   list = []
    achievements:        list = []
    srs_closure:         list = []
    vf_focus_items:      list = []
    general_focus_areas: list = []
    q1_user_review:      list = []
    q4_user_review:      list = []
    smartapp_hub_focus:  list = []
    other_items:         list = []
    created_at:  datetime
    updated_at:  datetime
    class Config: from_attributes = True


# ─── Router ───────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/weekly-reports", tags=["weekly-reports"])


def _default_payload():
    """Seed defaults matching the uploaded template."""
    return {
        "report_period": "11th May to 16th May 2026",
        "week_start": "2026-05-11",
        "week_end":   "2026-05-16",
        "key_highlights": [
            "Progress made on pending access requests across multiple teams.",
            "Continued support for Vodafone (VF) login, VOGA, and GitHub access issues.",
            "Q1 and Q4 user reviews actively tracked and completed where applicable.",
            "Maintained Request SLA performance above 90%.",
            "Continued support for SmartApp and Hub-related operational activities.",
        ],
        "focus_areas": [
            "Follow up and close out on the pending reviews.",
            "Improving operational efficiency and user support responsiveness.",
            "Supporting automation and documentation initiatives.",
            "Fast-tracking pending VF requests.",
            "Supporting users with VF login issues.",
        ],
        "kpi_performance": [
            "Request SLA maintained above 90%.",
            "Pending access requests actively tracked and resolved.",
            "User review completion progress monitored.",
            "Support responsiveness improved for Vodafone requests.",
        ],
        "sr_closure_status": [
            "Completion of pending access requests for different teams.",
            "Fast-tracking Q1 user review completion.",
            "Continuous follow-up on outstanding requests.",
        ],
        "achievements": [
            "Improved turnaround time on user support requests.",
            "Enhanced coordination with teams for approvals and closures.",
        ],
        "srs_closure": [
            "Complete the Pending Access requests for different teams.",
            "Fast track completion of the Q1 User reviews.",
        ],
        "vf_focus_items": [
            "Fast tracking pending requests and supporting users with VF login issues.",
            "Support users with VOGA / GitHub access issues.",
        ],
        "general_focus_areas": [
            "Follow up and close out on the pending reviews.",
            "Work with John Kamau on the UAM Automation project.",
            "Work on the movers & Leavers UAM documentation process.",
            "Maintaining Requests SLA above 90%.",
            "Complete the UAM SOP Document for Movers and leavers.",
            "Complete SmartApp Q4 and NAP Q1 Reviews.",
            "Prioritize and fast-track Vodafone (VF) requests, including resolving login/VOGA/GitHub issues.",
        ],
        "q1_user_review": [
            {"label": "G2 Audit", "status": "In progress"},
            {"label": "NAP",      "status": "In progress"},
            {"label": "HUB",      "status": "In progress"},
        ],
        "q4_user_review": [
            {"label": "NAP",      "status": "Complete"},
            {"label": "G2",       "status": "Complete"},
            {"label": "Hub",      "status": "Complete"},
            {"label": "SmartApp", "status": "In progress"},
        ],
        "smartapp_hub_focus": [
            "Support with Citrix / Hub password resets approvals upon request from users and Lebogang.",
            "Follow up on the pending Smart App User Reviews.",
        ],
        "other_items": [
            "Support with BAU and any other Assigned tasks.",
        ],
    }


@router.get("", response_model=list[WeeklyReportOut])
async def list_reports(db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    r = await db.execute(select(WeeklyReport).order_by(WeeklyReport.created_at.desc()))
    return r.scalars().all()


@router.get("/latest", response_model=WeeklyReportOut)
async def get_latest(db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    r = await db.execute(select(WeeklyReport).order_by(WeeklyReport.updated_at.desc()).limit(1))
    report = r.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "No weekly reports found")
    return report


@router.get("/{report_id}", response_model=WeeklyReportOut)
async def get_report(report_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    r = await db.execute(select(WeeklyReport).where(WeeklyReport.id == report_id))
    report = r.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    return report


@router.post("", response_model=WeeklyReportOut)
async def create_report(body: WeeklyReportCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    data = body.model_dump()
    # Serialise ReviewItem objects
    for key in ("q1_user_review", "q4_user_review"):
        data[key] = [i if isinstance(i, dict) else i.model_dump() for i in data[key]]
    report = WeeklyReport(id=str(uuid.uuid4()), created_by=user.id, **data)
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.patch("/{report_id}", response_model=WeeklyReportOut)
async def update_report(report_id: str, body: WeeklyReportUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    r = await db.execute(select(WeeklyReport).where(WeeklyReport.id == report_id))
    report = r.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    for k, v in body.model_dump(exclude_none=True).items():
        if k in ("q1_user_review", "q4_user_review") and v is not None:
            v = [i if isinstance(i, dict) else i.model_dump() for i in v]
        setattr(report, k, v)
    from datetime import datetime
    report.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(report)
    return report


@router.delete("/{report_id}")
async def delete_report(report_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    r = await db.execute(select(WeeklyReport).where(WeeklyReport.id == report_id))
    report = r.scalar_one_or_none()
    if not report:
        raise HTTPException(404, "Report not found")
    await db.delete(report)
    await db.commit()
    return {"deleted": True}


async def seed_default_weekly_report(db: AsyncSession):
    """Called on startup if no weekly reports exist."""
    from sqlalchemy import func
    count = await db.execute(select(func.count()).select_from(WeeklyReport))
    if count.scalar() > 0:
        return
    defaults = _default_payload()
    report = WeeklyReport(id=str(uuid.uuid4()), **defaults)
    db.add(report)
    await db.commit()
