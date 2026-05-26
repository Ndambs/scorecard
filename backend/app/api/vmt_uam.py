"""
backend/app/api/vmt_uam.py  —  COMPLETE FILE (replace existing)
Adds POST /api/vmt-uam/parse-pdf on top of the existing 8 endpoints.
"""

from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..schemas.vmt_uam import (
    ReportCreate, ReportUpdate, ReportOut, ReportListItem,
    AnalyticsSummary, GeneratedReport,
)
from ..services import vmt_uam_service as svc
from ..services.pdf_parser import parse_mi_report

router = APIRouter(prefix="/api/vmt-uam", tags=["VMT-UAM"])


# ── Parse PDF ─────────────────────────────────────────────────────────────────
@router.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    """
    Upload the MI Weekly Report PDF.
    Returns pre-filled VMT-UAM data ready to review and save.
    No external services — parsing runs entirely on this server.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF exceeds 20 MB limit.")

    try:
        parsed = parse_mi_report(content)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF parsing failed: {exc}")

    return {
        "period_start":    parsed.period_start.isoformat() if parsed.period_start else None,
        "period_end":      parsed.period_end.isoformat()   if parsed.period_end   else None,
        "q_logged":        parsed.q_logged,
        "q_open_sla":      parsed.q_open_sla,
        "q_open_breach":   parsed.q_open_breach,
        "q_open_blank":    parsed.q_open_blank,
        "q_pending":       parsed.q_pending,
        "q_total_open":    parsed.q_total_open,
        "q_closed_sla":    parsed.q_closed_sla,
        "q_closed_breach": parsed.q_closed_breach,
        "q_closed_blank":  parsed.q_closed_blank,
        "q_total_closed":  parsed.q_total_closed,
        "q_sla_rate":      parsed.q_sla_rate,
        "members": [
            {
                "agent_id":     m.agent_id,
                "agent_name":   m.agent_name,
                "open_sla":     m.open_sla,
                "open_breach":  m.open_breach,
                "open_blank":   m.open_blank,
                "pending":      m.pending,
                "closed_sla":   m.closed_sla,
                "closed_breach":m.closed_breach,
                "closed_blank": m.closed_blank,
            }
            for m in parsed.members
        ],
        "warnings": parsed.warnings,
    }


# ── List ──────────────────────────────────────────────────────────────────────
@router.get("/reports", response_model=List[ReportListItem])
async def list_reports(
    limit: int = Query(52, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await svc.list_reports(db, limit=limit)


# ── Create ────────────────────────────────────────────────────────────────────
@router.post("/reports", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    db: AsyncSession = Depends(get_db),
):
    return await svc.create_report(db, payload)


# ── Read ──────────────────────────────────────────────────────────────────────
@router.get("/reports/{report_id}", response_model=ReportOut)
async def get_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    rep = await svc.get_report(db, report_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    return rep


# ── Update ────────────────────────────────────────────────────────────────────
@router.patch("/reports/{report_id}", response_model=ReportOut)
async def update_report(
    report_id: int,
    payload: ReportUpdate,
    db: AsyncSession = Depends(get_db),
):
    rep = await svc.update_report(db, report_id, payload)
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    return rep


# ── Clone ─────────────────────────────────────────────────────────────────────
@router.post("/reports/{report_id}/clone", response_model=ReportOut, status_code=201)
async def clone_report(
    report_id: int,
    new_start: date = Query(...),
    new_end:   date = Query(...),
    db: AsyncSession = Depends(get_db),
):
    rep = await svc.clone_report(db, report_id, new_start, new_end)
    if not rep:
        raise HTTPException(status_code=404, detail="Source report not found")
    return rep


# ── Publish ───────────────────────────────────────────────────────────────────
@router.post("/reports/{report_id}/publish", response_model=ReportOut)
async def publish_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    rep = await svc.publish_report(db, report_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    return rep


# ── Generate report text ──────────────────────────────────────────────────────
@router.get("/reports/{report_id}/generate", response_model=GeneratedReport)
async def generate_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
):
    rep = await svc.get_report(db, report_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Report not found")
    return svc.generate_report_text(rep)


# ── Analytics ─────────────────────────────────────────────────────────────────
@router.get("/analytics", response_model=AnalyticsSummary)
async def get_analytics(
    weeks: int = Query(12, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
):
    return await svc.get_analytics(db, limit=weeks)
