"""
ADD THIS BLOCK to the bottom of:
backend/app/api/vmt_uam.py

It adds one new endpoint:
  POST /api/vmt-uam/parse-pdf
"""

# Add this import at the top of vmt_uam.py alongside the existing imports:
# from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
# from ..services.pdf_parser import parse_mi_report

from fastapi import UploadFile, File
from ..services.pdf_parser import parse_mi_report


@router.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)):
    """
    Upload an MI Weekly Report PDF.
    Returns pre-filled VMT-UAM queue totals and member data —
    ready to POST to /api/vmt-uam/reports.

    No external services. Parsing runs entirely on the server.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted.",
        )

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:   # 20 MB guard
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="PDF exceeds 20 MB limit.",
        )

    try:
        parsed = parse_mi_report(content)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"PDF parsing failed: {exc}",
        )

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
