"""
Export router – file-based JSON (fixes Windows 500), three PPTX endpoints.
"""
import json, os, subprocess, tempfile
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.api.auth import require_viewer
from app.models import User

router = APIRouter(prefix="/api/export", tags=["export"])

_HERE      = os.path.dirname(os.path.abspath(__file__))
SCRIPT_DIR = os.path.abspath(os.path.join(_HERE, "..", "..", "scripts"))
NODE_MODS  = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "node_modules"))

MONTHLY_SCRIPT  = os.path.join(SCRIPT_DIR, "generate_pptx.js")
WEEKLY_SCRIPT   = os.path.join(SCRIPT_DIR, "generate_weekly_pptx.js")
MFW_SCRIPT      = os.path.join(SCRIPT_DIR, "generate_monthly_from_weekly.js")
PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


def _find_node() -> str:
    candidates = [
        "node", "node.exe",
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
        "/usr/bin/node", "/usr/local/bin/node",
        os.path.expanduser("~/AppData/Roaming/nvm/current/node.exe"),
    ]
    for c in candidates:
        try:
            r = subprocess.run([c, "--version"], capture_output=True, timeout=5)
            if r.returncode == 0:
                return c
        except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
            continue
    raise RuntimeError(
        "node.js not found. Install Node.js from https://nodejs.org and restart the backend."
    )


def _run_node(script: str, payload: dict, filename: str) -> str:
    """Write payload to a temp JSON file, call Node, return the output PPTX path."""
    # Write JSON to temp file — avoids Windows arg-length and quote-escaping issues
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as jf:
        json.dump(payload, jf, ensure_ascii=False)
        json_path = jf.name

    with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as pf:
        pptx_path = pf.name

    try:
        node_bin = _find_node()
    except RuntimeError as e:
        for p in (json_path, pptx_path):
            try: os.unlink(p)
            except OSError: pass
        raise HTTPException(500, str(e))

    env = os.environ.copy()
    env["NODE_PATH"] = NODE_MODS

    try:
        result = subprocess.run(
            [node_bin, os.path.abspath(script), json_path, pptx_path],
            capture_output=True, text=True, timeout=90, env=env,
            cwd=os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..")),
        )
    except subprocess.TimeoutExpired:
        for p in (json_path, pptx_path):
            try: os.unlink(p)
            except OSError: pass
        raise HTTPException(504, "PPTX generation timed out (>90 s).")
    finally:
        try: os.unlink(json_path)
        except OSError: pass

    if result.returncode != 0:
        err = (result.stderr or result.stdout or "unknown error")[:800]
        try: os.unlink(pptx_path)
        except OSError: pass
        raise HTTPException(500, f"PPTX generation failed:\n{err}")

    if not os.path.exists(pptx_path) or os.path.getsize(pptx_path) < 1024:
        try: os.unlink(pptx_path)
        except OSError: pass
        raise HTTPException(500, "PPTX output was empty or corrupt.")

    return pptx_path


def _file_response(pptx_path: str, filename: str) -> FileResponse:
    safe = filename.replace(" ", "_").replace("/", "-").replace("\\", "-")
    return FileResponse(
        path=pptx_path, media_type=PPTX_MIME, filename=safe,
        headers={"Content-Disposition": f'attachment; filename="{safe}"'},
    )


# ─── Payload builders ─────────────────────────────────────────────────────────

async def _monthly_payload(db) -> dict:
    from app.services import scorecard_service as svc
    scorecards = await svc.list_scorecards(db)
    result = []
    for sc in scorecards:
        result.append({
            "id": sc.id, "slug": sc.slug, "title": sc.title,
            "subtitle": sc.subtitle, "period": sc.period,
            "kpis": [{
                "id": k.id, "label": k.label, "value": k.value,
                "sub_text": k.sub_text, "bar_percent": k.bar_percent,
                "color": k.color, "trend": k.trend,
                "history": [{"period": h.period, "value": h.value}
                             for h in sorted(k.history, key=lambda x: x.period)],
            } for k in sc.kpis],
            "sections": [{
                "id": s.id, "title": s.title, "section_type": s.section_type,
                "checklist_items": [{"id": i.id, "text": i.text, "done": i.done} for i in s.checklist_items],
                "action_items":    [{"id": i.id, "action_text": i.action_text, "owner": i.owner,
                                     "owner_color": i.owner_color, "status": i.status} for i in s.action_items],
                "metric_rows":     [{"id": r.id, "label": r.label, "bar_percent": r.bar_percent,
                                     "bar_color": r.bar_color, "status": r.status} for r in s.metric_rows],
                "insight_blocks":  [{"id": b.id, "heading": b.heading, "body": b.body, "color": b.color} for b in s.insight_blocks],
                "focus_items":     [{"id": i.id, "text": i.text} for i in s.focus_items],
                "timeline_items":  [{"id": i.id, "text": i.text} for i in s.timeline_items],
            } for s in sc.sections],
        })
    return {"scorecards": result}


def _weekly_to_dict(r) -> dict:
    return {
        "report_period":       r.report_period,
        "key_highlights":      r.key_highlights      or [],
        "focus_areas":         r.focus_areas         or [],
        "kpi_performance":     r.kpi_performance     or [],
        "sr_closure_status":   r.sr_closure_status   or [],
        "achievements":        r.achievements        or [],
        "srs_closure":         r.srs_closure         or [],
        "vf_focus_items":      r.vf_focus_items      or [],
        "general_focus_areas": r.general_focus_areas or [],
        "q1_user_review":      r.q1_user_review      or [],
        "q4_user_review":      r.q4_user_review      or [],
        "smartapp_hub_focus":  r.smartapp_hub_focus  or [],
        "other_items":         r.other_items         or [],
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/pptx")
async def export_monthly(db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    """Monthly executive scorecard report (from DB scorecards)."""
    payload  = await _monthly_payload(db)
    period   = (payload["scorecards"][0].get("period") or "Report").replace(" ", "_") if payload["scorecards"] else "Report"
    pptx     = _run_node(MONTHLY_SCRIPT, payload, f"UAM_Monthly_{period}.pptx")
    return _file_response(pptx, f"UAM_Monthly_Report_{period}.pptx")


@router.get("/weekly-pptx")
async def export_weekly(
    report_id: str = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_viewer),
):
    """Single weekly report PPTX with visuals."""
    from sqlalchemy import select
    from app.models import WeeklyReport

    if report_id:
        r = await db.execute(select(WeeklyReport).where(WeeklyReport.id == report_id))
        report = r.scalar_one_or_none()
    else:
        r = await db.execute(select(WeeklyReport).order_by(WeeklyReport.updated_at.desc()).limit(1))
        report = r.scalar_one_or_none()

    if not report:
        raise HTTPException(404, "No weekly report found. Create one in the Weekly Report editor first.")

    payload  = _weekly_to_dict(report)
    period   = (report.report_period or "Weekly").replace(" ", "_").replace("/", "-")
    filename = f"UAM_Weekly_Report_{period}.pptx"
    pptx     = _run_node(WEEKLY_SCRIPT, payload, filename)
    return _file_response(pptx, filename)


@router.get("/monthly-from-weekly")
async def export_monthly_from_weekly(
    start_date:   str = Query(None, description="YYYY-MM-DD filter (week_start >=)"),
    end_date:     str = Query(None, description="YYYY-MM-DD filter (week_end <=)"),
    period_label: str = Query(None, description="Display period e.g. 'May 2026'"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_viewer),
):
    """Monthly report aggregated from all (or date-filtered) weekly reports."""
    from sqlalchemy import select
    from app.models import WeeklyReport

    q = select(WeeklyReport).order_by(WeeklyReport.week_start.asc())
    if start_date: q = q.where(WeeklyReport.week_start >= start_date)
    if end_date:   q = q.where(WeeklyReport.week_end   <= end_date)

    r       = await db.execute(q)
    reports = r.scalars().all()

    if not reports:
        raise HTTPException(
            404,
            "No weekly reports found for this period. "
            "Add weekly reports first or widen the date range."
        )

    period  = period_label or _infer_period(reports)
    payload = {"period": period, "weeks": [_weekly_to_dict(rp) for rp in reports]}
    safe    = period.replace(" ", "_")
    pptx    = _run_node(MFW_SCRIPT, payload, f"UAM_Monthly_From_Weekly_{safe}.pptx")
    return _file_response(pptx, f"UAM_Monthly_Report_{safe}.pptx")


def _infer_period(reports) -> str:
    periods = [r.report_period for r in reports if r.report_period]
    if not periods: return "Monthly_Report"
    if len(periods) == 1: return periods[0]
    first = periods[0].split()[-1]
    last  = periods[-1].split()[-1]
    return first if first == last else f"{first}–{last}"
