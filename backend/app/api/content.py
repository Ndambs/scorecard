from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import (
    SectionOut, SectionCreate, SectionUpdate,
    KPIOut, KPICreate, KPIUpdate, KPIHistoryCreate, KPIHistoryOut,
    ChecklistItemOut, ChecklistItemCreate, ChecklistItemUpdate,
    ActionItemOut, ActionItemCreate, ActionItemUpdate,
    MetricRowOut, MetricRowCreate, MetricRowUpdate,
    InsightBlockOut, InsightBlockCreate, InsightBlockUpdate,
    FocusItemOut, FocusItemCreate, FocusItemUpdate,
    TimelineItemOut, TimelineItemCreate,
)
from app.services import scorecard_service as svc
from app.services.kpi_engine import calculate_kpi_stats
from app.api.auth import require_viewer, require_editor, require_admin
from app.models import User

# ─── SECTIONS ─────────────────────────────────────────────────────────────────

sections_router = APIRouter(prefix="/api/sections", tags=["sections"])
sc_sections_router = APIRouter(prefix="/api/scorecards", tags=["sections"])


@sc_sections_router.post("/{scorecard_id}/sections", response_model=SectionOut)
async def create_section(scorecard_id: str, body: SectionCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    sec = await svc.create_section(db, scorecard_id, body, user.id)
    await db.commit()
    return await svc.get_section(db, sec.id)


@sections_router.patch("/{section_id}", response_model=SectionOut)
async def update_section(section_id: str, body: SectionUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    sec = await svc.get_section(db, section_id)
    if not sec:
        raise HTTPException(404, "Section not found")
    await svc.update_section(db, sec, body, user.id)
    await db.commit()
    return await svc.get_section(db, section_id)


@sections_router.delete("/{section_id}")
async def delete_section(section_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    sec = await svc.get_section(db, section_id)
    if not sec:
        raise HTTPException(404, "Section not found")
    await svc.delete_section(db, sec, user.id)
    await db.commit()
    return {"deleted": True}


# ─── KPIS ─────────────────────────────────────────────────────────────────────

kpis_router = APIRouter(prefix="/api/kpis", tags=["kpis"])
sc_kpis_router = APIRouter(prefix="/api/scorecards", tags=["kpis"])


@sc_kpis_router.post("/{scorecard_id}/kpis", response_model=KPIOut)
async def create_kpi(scorecard_id: str, body: KPICreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    kpi = await svc.create_kpi(db, scorecard_id, body, user.id)
    await db.commit()
    return await svc.get_kpi(db, kpi.id)


@kpis_router.patch("/{kpi_id}", response_model=KPIOut)
async def update_kpi(kpi_id: str, body: KPIUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    kpi = await svc.get_kpi(db, kpi_id)
    if not kpi:
        raise HTTPException(404, "KPI not found")
    await svc.update_kpi(db, kpi, body, user.id)
    await db.commit()
    return await svc.get_kpi(db, kpi_id)


@kpis_router.delete("/{kpi_id}")
async def delete_kpi(kpi_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    kpi = await svc.get_kpi(db, kpi_id)
    if not kpi:
        raise HTTPException(404, "KPI not found")
    await svc.delete_kpi(db, kpi, user.id)
    await db.commit()
    return {"deleted": True}


@kpis_router.post("/{kpi_id}/history", response_model=KPIHistoryOut)
async def add_history(kpi_id: str, body: KPIHistoryCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    kpi = await svc.get_kpi(db, kpi_id)
    if not kpi:
        raise HTTPException(404, "KPI not found")
    h = await svc.add_kpi_history(db, kpi, body)
    await db.commit()
    return h


@kpis_router.get("/{kpi_id}/stats")
async def get_kpi_stats(kpi_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    kpi = await svc.get_kpi(db, kpi_id)
    if not kpi:
        raise HTTPException(404, "KPI not found")
    history = [{"period": h.period, "value": h.value} for h in kpi.history]
    return calculate_kpi_stats(history)


# ─── CHECKLIST ITEMS ──────────────────────────────────────────────────────────

checklist_router = APIRouter(prefix="/api/sections", tags=["checklist"])


@checklist_router.post("/{section_id}/checklist-items", response_model=ChecklistItemOut)
async def create_checklist_item(section_id: str, body: ChecklistItemCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.create_checklist_item(db, section_id, body)
    await db.commit()
    await db.refresh(item)
    return item


@checklist_router.patch("/checklist-items/{item_id}", response_model=ChecklistItemOut)
async def update_checklist_item(item_id: str, body: ChecklistItemUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.get_checklist_item(db, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await svc.update_checklist_item(db, item, body)
    await db.commit()
    await db.refresh(item)
    return item


@checklist_router.delete("/checklist-items/{item_id}")
async def delete_checklist_item(item_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.get_checklist_item(db, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    await db.commit()
    return {"deleted": True}


# ─── ACTION ITEMS ─────────────────────────────────────────────────────────────

action_router = APIRouter(prefix="/api/sections", tags=["action-items"])


@action_router.post("/{section_id}/action-items", response_model=ActionItemOut)
async def create_action_item(section_id: str, body: ActionItemCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.create_action_item(db, section_id, body, user.id)
    await db.commit()
    await db.refresh(item)
    return item


@action_router.patch("/action-items/{item_id}", response_model=ActionItemOut)
async def update_action_item(item_id: str, body: ActionItemUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.get_action_item(db, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await svc.update_action_item(db, item, body, user.id)
    await db.commit()
    await db.refresh(item)
    return item


@action_router.delete("/action-items/{item_id}")
async def delete_action_item(item_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.get_action_item(db, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    await db.commit()
    return {"deleted": True}


# ─── METRIC ROWS ──────────────────────────────────────────────────────────────

metric_router = APIRouter(prefix="/api/sections", tags=["metric-rows"])


@metric_router.post("/{section_id}/metric-rows", response_model=MetricRowOut)
async def create_metric_row(section_id: str, body: MetricRowCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    row = await svc.create_metric_row(db, section_id, body)
    await db.commit()
    await db.refresh(row)
    return row


@metric_router.patch("/metric-rows/{row_id}", response_model=MetricRowOut)
async def update_metric_row(row_id: str, body: MetricRowUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    row = await svc.get_metric_row(db, row_id)
    if not row:
        raise HTTPException(404, "Row not found")
    await svc.update_metric_row(db, row, body)
    await db.commit()
    await db.refresh(row)
    return row


@metric_router.delete("/metric-rows/{row_id}")
async def delete_metric_row(row_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    row = await svc.get_metric_row(db, row_id)
    if not row:
        raise HTTPException(404, "Row not found")
    await db.delete(row)
    await db.commit()
    return {"deleted": True}


# ─── INSIGHT BLOCKS ───────────────────────────────────────────────────────────

insight_router = APIRouter(prefix="/api/sections", tags=["insights"])


@insight_router.post("/{section_id}/insight-blocks", response_model=InsightBlockOut)
async def create_insight(section_id: str, body: InsightBlockCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    block = await svc.create_insight_block(db, section_id, body)
    await db.commit()
    await db.refresh(block)
    return block


@insight_router.patch("/insight-blocks/{block_id}", response_model=InsightBlockOut)
async def update_insight(block_id: str, body: InsightBlockUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    block = await svc.get_insight_block(db, block_id)
    if not block:
        raise HTTPException(404, "Block not found")
    await svc.update_insight_block(db, block, body)
    await db.commit()
    await db.refresh(block)
    return block


@insight_router.delete("/insight-blocks/{block_id}")
async def delete_insight(block_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    block = await svc.get_insight_block(db, block_id)
    if not block:
        raise HTTPException(404, "Block not found")
    await db.delete(block)
    await db.commit()
    return {"deleted": True}


# ─── FOCUS ITEMS ──────────────────────────────────────────────────────────────

focus_router = APIRouter(prefix="/api/sections", tags=["focus-items"])


@focus_router.post("/{section_id}/focus-items", response_model=FocusItemOut)
async def create_focus(section_id: str, body: FocusItemCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.create_focus_item(db, section_id, body)
    await db.commit()
    await db.refresh(item)
    return item


@focus_router.patch("/focus-items/{item_id}", response_model=FocusItemOut)
async def update_focus(item_id: str, body: FocusItemUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.get_focus_item(db, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await svc.update_focus_item(db, item, body)
    await db.commit()
    await db.refresh(item)
    return item


@focus_router.delete("/focus-items/{item_id}")
async def delete_focus(item_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.get_focus_item(db, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    await db.commit()
    return {"deleted": True}


# ─── TIMELINE ITEMS ───────────────────────────────────────────────────────────

timeline_router = APIRouter(prefix="/api/sections", tags=["timeline"])


@timeline_router.post("/{section_id}/timeline-items", response_model=TimelineItemOut)
async def create_timeline(section_id: str, body: TimelineItemCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.create_timeline_item(db, section_id, body)
    await db.commit()
    await db.refresh(item)
    return item


@timeline_router.delete("/timeline-items/{item_id}")
async def delete_timeline(item_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    item = await svc.get_timeline_item(db, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    await db.commit()
    return {"deleted": True}
