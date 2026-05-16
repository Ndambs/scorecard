import json
import os
import subprocess
import tempfile
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services import scorecard_service as svc
from app.api.auth import require_viewer
from app.models import User

router = APIRouter(prefix="/api/export", tags=["export"])

# Path to the Node.js generator script (relative to this file's location)
# __file__ is backend/app/api/export.py  →  go up 2 levels to reach backend/
SCRIPT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "scripts")
PPTX_SCRIPT = os.path.join(SCRIPT_DIR, "generate_pptx.js")

# node_modules lives at the project root (one level above backend/)
NODE_MODULES = os.path.join(SCRIPT_DIR, "..", "..", "node_modules")


def _find_node() -> str:
    """Find the node executable."""
    for candidate in ["node", "/usr/bin/node", "/usr/local/bin/node"]:
        try:
            result = subprocess.run(
                [candidate, "--version"], capture_output=True, timeout=5
            )
            if result.returncode == 0:
                return candidate
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    raise RuntimeError("node.js not found. Install Node.js to enable PPTX export.")


async def _build_payload(db: AsyncSession) -> dict:
    """Fetch all scorecards and return as serializable dict."""
    scorecards = await svc.list_scorecards(db)
    result = []
    for sc in scorecards:
        sc_dict = {
            "id": sc.id,
            "slug": sc.slug,
            "title": sc.title,
            "subtitle": sc.subtitle,
            "period": sc.period,
            "status": sc.status,
            "kpis": [
                {
                    "id": k.id,
                    "label": k.label,
                    "value": k.value,
                    "sub_text": k.sub_text,
                    "bar_percent": k.bar_percent,
                    "color": k.color,
                    "trend": k.trend,
                    "history": [
                        {"period": h.period, "value": h.value}
                        for h in sorted(k.history, key=lambda x: x.period)
                    ],
                }
                for k in sc.kpis
            ],
            "sections": [
                {
                    "id": s.id,
                    "title": s.title,
                    "section_type": s.section_type,
                    "checklist_items": [
                        {"id": i.id, "text": i.text, "done": i.done}
                        for i in s.checklist_items
                    ],
                    "action_items": [
                        {
                            "id": i.id,
                            "action_text": i.action_text,
                            "owner": i.owner,
                            "owner_color": i.owner_color,
                            "status": i.status,
                        }
                        for i in s.action_items
                    ],
                    "metric_rows": [
                        {
                            "id": r.id,
                            "label": r.label,
                            "bar_percent": r.bar_percent,
                            "bar_color": r.bar_color,
                            "status": r.status,
                        }
                        for r in s.metric_rows
                    ],
                    "insight_blocks": [
                        {
                            "id": b.id,
                            "heading": b.heading,
                            "body": b.body,
                            "color": b.color,
                        }
                        for b in s.insight_blocks
                    ],
                    "focus_items": [
                        {"id": i.id, "text": i.text}
                        for i in s.focus_items
                    ],
                    "timeline_items": [
                        {"id": i.id, "text": i.text}
                        for i in s.timeline_items
                    ],
                }
                for s in sc.sections
            ],
        }
        result.append(sc_dict)
    return {"scorecards": result}


@router.get("/pptx")
async def export_pptx(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_viewer),
):
    """
    Generate and download the UAM Scorecard executive PowerPoint report.
    Calls the Node.js PptxGenJS script with live data from the database.
    """
    # 1. Build payload from live DB data
    try:
        payload = await _build_payload(db)
    except Exception as e:
        raise HTTPException(500, f"Failed to load scorecard data: {e}")

    # 2. Find node
    try:
        node_bin = _find_node()
    except RuntimeError as e:
        raise HTTPException(500, str(e))

    # 3. Write PPTX to a temp file
    with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        json_str = json.dumps(payload)

        env = os.environ.copy()
        # Ensure node can find pptxgenjs in the project node_modules
        env["NODE_PATH"] = os.path.abspath(NODE_MODULES)

        result = subprocess.run(
            [node_bin, os.path.abspath(PPTX_SCRIPT), json_str, tmp_path],
            capture_output=True,
            text=True,
            timeout=60,
            env=env,
            cwd=os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..")),
        )

        if result.returncode != 0:
            err = (result.stderr or result.stdout or "unknown error")[:800]
            raise HTTPException(500, f"PPTX generation failed: {err}")

        if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) < 1000:
            raise HTTPException(500, "PPTX file was not generated correctly.")

        # 4. Stream file back, then clean up
        period = payload["scorecards"][0].get("period", "Report").replace(" ", "_")
        filename = f"UAM_Scorecard_{period}.pptx"

        return FileResponse(
            path=tmp_path,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            filename=filename,
            background=None,  # FileResponse handles cleanup via starlette
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    except HTTPException:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise
    except subprocess.TimeoutExpired:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(504, "PPTX generation timed out (>60s).")
    except Exception as e:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(500, f"Unexpected error: {e}")
