import json
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models import (
    Scorecard, Section, KPI, KPIHistory,
    ChecklistItem, ActionItem, MetricRow,
    InsightBlock, FocusItem, TimelineItem,
    Upload, AuditLog, ScorecardVersion, User
)
from app.schemas import (
    ScorecardCreate, ScorecardUpdate,
    SectionCreate, SectionUpdate,
    KPICreate, KPIUpdate, KPIHistoryCreate,
    ChecklistItemCreate, ChecklistItemUpdate,
    ActionItemCreate, ActionItemUpdate,
    MetricRowCreate, MetricRowUpdate,
    InsightBlockCreate, InsightBlockUpdate,
    FocusItemCreate, FocusItemUpdate,
    TimelineItemCreate
)
import uuid


def _new_id() -> str:
    return str(uuid.uuid4())


# ─── AUDIT ────────────────────────────────────────────────────────────────────

async def log_audit(db: AsyncSession, user_id: str, entity_type: str,
                    entity_id: str, action: str, old=None, new=None):
    entry = AuditLog(
        user_id=user_id, entity_type=entity_type,
        entity_id=entity_id, action=action,
        old_value=old, new_value=new
    )
    db.add(entry)


# ─── SCORECARDS ───────────────────────────────────────────────────────────────

async def list_scorecards(db: AsyncSession) -> list[Scorecard]:
    result = await db.execute(
        select(Scorecard)
        .options(
            selectinload(Scorecard.kpis).selectinload(KPI.history),
            selectinload(Scorecard.sections)
            .selectinload(Section.checklist_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.action_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.metric_rows),
            selectinload(Scorecard.sections)
            .selectinload(Section.insight_blocks),
            selectinload(Scorecard.sections)
            .selectinload(Section.focus_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.timeline_items),
        )
        .order_by(Scorecard.display_order)
    )
    return result.scalars().all()


async def get_scorecard(db: AsyncSession, scorecard_id: str) -> Scorecard | None:
    result = await db.execute(
        select(Scorecard)
        .where(Scorecard.id == scorecard_id)
        .options(
            selectinload(Scorecard.kpis).selectinload(KPI.history),
            selectinload(Scorecard.sections)
            .selectinload(Section.checklist_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.action_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.metric_rows),
            selectinload(Scorecard.sections)
            .selectinload(Section.insight_blocks),
            selectinload(Scorecard.sections)
            .selectinload(Section.focus_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.timeline_items),
        )
    )
    return result.scalar_one_or_none()


async def get_scorecard_by_slug(db: AsyncSession, slug: str) -> Scorecard | None:
    result = await db.execute(
        select(Scorecard)
        .where(Scorecard.slug == slug)
        .options(
            selectinload(Scorecard.kpis).selectinload(KPI.history),
            selectinload(Scorecard.sections)
            .selectinload(Section.checklist_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.action_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.metric_rows),
            selectinload(Scorecard.sections)
            .selectinload(Section.insight_blocks),
            selectinload(Scorecard.sections)
            .selectinload(Section.focus_items),
            selectinload(Scorecard.sections)
            .selectinload(Section.timeline_items),
        )
    )
    return result.scalar_one_or_none()


async def create_scorecard(db: AsyncSession, data: ScorecardCreate, user_id: str) -> Scorecard:
    sc = Scorecard(id=_new_id(), created_by=user_id, **data.model_dump())
    db.add(sc)
    await db.flush()
    await log_audit(db, user_id, "scorecard", sc.id, "create", new=data.model_dump())
    return sc


async def update_scorecard(db: AsyncSession, sc: Scorecard, data: ScorecardUpdate, user_id: str) -> Scorecard:
    old = {k: getattr(sc, k) for k in data.model_fields}
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(sc, k, v)
    sc.updated_at = datetime.utcnow()
    await log_audit(db, user_id, "scorecard", sc.id, "update", old=old, new=data.model_dump(exclude_none=True))
    return sc


async def publish_scorecard(db: AsyncSession, sc: Scorecard, user_id: str) -> Scorecard:
    # Count existing versions
    count_result = await db.execute(
        select(func.count()).where(ScorecardVersion.scorecard_id == sc.id)
    )
    version_num = (count_result.scalar() or 0) + 1

    # Snapshot current state (simplified - just key fields)
    snapshot = {
        "id": sc.id, "title": sc.title, "period": sc.period,
        "status": sc.status, "version": version_num,
        "snapshot_at": datetime.utcnow().isoformat()
    }

    version = ScorecardVersion(
        id=_new_id(), scorecard_id=sc.id,
        version_num=version_num, snapshot=snapshot, published_by=user_id
    )
    db.add(version)

    sc.status = "published"
    sc.published_at = datetime.utcnow()
    sc.updated_at = datetime.utcnow()
    await log_audit(db, user_id, "scorecard", sc.id, "publish", new={"version": version_num})
    return sc


async def delete_scorecard(db: AsyncSession, sc: Scorecard, user_id: str):
    await log_audit(db, user_id, "scorecard", sc.id, "delete")
    await db.delete(sc)


# ─── SECTIONS ─────────────────────────────────────────────────────────────────

async def create_section(db: AsyncSession, scorecard_id: str, data: SectionCreate, user_id: str) -> Section:
    sec = Section(id=_new_id(), scorecard_id=scorecard_id, **data.model_dump())
    db.add(sec)
    await db.flush()
    await log_audit(db, user_id, "section", sec.id, "create", new=data.model_dump())
    return sec


async def update_section(db: AsyncSession, sec: Section, data: SectionUpdate, user_id: str) -> Section:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(sec, k, v)
    await log_audit(db, user_id, "section", sec.id, "update", new=data.model_dump(exclude_none=True))
    return sec


async def delete_section(db: AsyncSession, sec: Section, user_id: str):
    await log_audit(db, user_id, "section", sec.id, "delete")
    await db.delete(sec)


async def get_section(db: AsyncSession, section_id: str) -> Section | None:
    result = await db.execute(
        select(Section).where(Section.id == section_id)
        .options(
            selectinload(Section.checklist_items),
            selectinload(Section.action_items),
            selectinload(Section.metric_rows),
            selectinload(Section.insight_blocks),
            selectinload(Section.focus_items),
            selectinload(Section.timeline_items),
        )
    )
    return result.scalar_one_or_none()


# ─── KPIS ─────────────────────────────────────────────────────────────────────

async def create_kpi(db: AsyncSession, scorecard_id: str, data: KPICreate, user_id: str) -> KPI:
    kpi = KPI(id=_new_id(), scorecard_id=scorecard_id, **data.model_dump())
    db.add(kpi)
    await db.flush()
    await log_audit(db, user_id, "kpi", kpi.id, "create", new=data.model_dump())
    return kpi


async def update_kpi(db: AsyncSession, kpi: KPI, data: KPIUpdate, user_id: str) -> KPI:
    old = {k: getattr(kpi, k) for k in data.model_fields}
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(kpi, k, v)
    kpi.updated_at = datetime.utcnow()
    await log_audit(db, user_id, "kpi", kpi.id, "update", old=old, new=data.model_dump(exclude_none=True))
    return kpi


async def delete_kpi(db: AsyncSession, kpi: KPI, user_id: str):
    await log_audit(db, user_id, "kpi", kpi.id, "delete")
    await db.delete(kpi)


async def get_kpi(db: AsyncSession, kpi_id: str) -> KPI | None:
    result = await db.execute(
        select(KPI).where(KPI.id == kpi_id)
        .options(selectinload(KPI.history))
    )
    return result.scalar_one_or_none()


async def add_kpi_history(db: AsyncSession, kpi: KPI, data: KPIHistoryCreate) -> KPIHistory:
    h = KPIHistory(id=_new_id(), kpi_id=kpi.id, **data.model_dump())
    db.add(h)
    return h


# ─── CHECKLIST ITEMS ──────────────────────────────────────────────────────────

async def create_checklist_item(db: AsyncSession, section_id: str, data: ChecklistItemCreate) -> ChecklistItem:
    item = ChecklistItem(id=_new_id(), section_id=section_id, **data.model_dump())
    db.add(item)
    return item


async def update_checklist_item(db: AsyncSession, item: ChecklistItem, data: ChecklistItemUpdate) -> ChecklistItem:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    return item


async def get_checklist_item(db: AsyncSession, item_id: str) -> ChecklistItem | None:
    r = await db.execute(select(ChecklistItem).where(ChecklistItem.id == item_id))
    return r.scalar_one_or_none()


# ─── ACTION ITEMS ─────────────────────────────────────────────────────────────

async def create_action_item(db: AsyncSession, section_id: str, data: ActionItemCreate, user_id: str) -> ActionItem:
    item = ActionItem(id=_new_id(), section_id=section_id, **data.model_dump())
    db.add(item)
    await db.flush()
    await log_audit(db, user_id, "action_item", item.id, "create", new=data.model_dump())
    return item


async def update_action_item(db: AsyncSession, item: ActionItem, data: ActionItemUpdate, user_id: str) -> ActionItem:
    old = {k: getattr(item, k) for k in data.model_fields}
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    item.updated_at = datetime.utcnow()
    await log_audit(db, user_id, "action_item", item.id, "update", old=old, new=data.model_dump(exclude_none=True))
    return item


async def get_action_item(db: AsyncSession, item_id: str) -> ActionItem | None:
    r = await db.execute(select(ActionItem).where(ActionItem.id == item_id))
    return r.scalar_one_or_none()


# ─── METRIC ROWS ──────────────────────────────────────────────────────────────

async def create_metric_row(db: AsyncSession, section_id: str, data: MetricRowCreate) -> MetricRow:
    row = MetricRow(id=_new_id(), section_id=section_id, **data.model_dump())
    db.add(row)
    return row


async def update_metric_row(db: AsyncSession, row: MetricRow, data: MetricRowUpdate) -> MetricRow:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(row, k, v)
    return row


async def get_metric_row(db: AsyncSession, row_id: str) -> MetricRow | None:
    r = await db.execute(select(MetricRow).where(MetricRow.id == row_id))
    return r.scalar_one_or_none()


# ─── INSIGHT BLOCKS ───────────────────────────────────────────────────────────

async def create_insight_block(db: AsyncSession, section_id: str, data: InsightBlockCreate) -> InsightBlock:
    block = InsightBlock(id=_new_id(), section_id=section_id, **data.model_dump())
    db.add(block)
    return block


async def update_insight_block(db: AsyncSession, block: InsightBlock, data: InsightBlockUpdate) -> InsightBlock:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(block, k, v)
    return block


async def get_insight_block(db: AsyncSession, block_id: str) -> InsightBlock | None:
    r = await db.execute(select(InsightBlock).where(InsightBlock.id == block_id))
    return r.scalar_one_or_none()


# ─── FOCUS ITEMS ──────────────────────────────────────────────────────────────

async def create_focus_item(db: AsyncSession, section_id: str, data: FocusItemCreate) -> FocusItem:
    item = FocusItem(id=_new_id(), section_id=section_id, **data.model_dump())
    db.add(item)
    return item


async def update_focus_item(db: AsyncSession, item: FocusItem, data: FocusItemUpdate) -> FocusItem:
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    return item


async def get_focus_item(db: AsyncSession, item_id: str) -> FocusItem | None:
    r = await db.execute(select(FocusItem).where(FocusItem.id == item_id))
    return r.scalar_one_or_none()


# ─── TIMELINE ITEMS ───────────────────────────────────────────────────────────

async def create_timeline_item(db: AsyncSession, section_id: str, data: TimelineItemCreate) -> TimelineItem:
    item = TimelineItem(id=_new_id(), section_id=section_id, **data.model_dump())
    db.add(item)
    return item


async def get_timeline_item(db: AsyncSession, item_id: str) -> TimelineItem | None:
    r = await db.execute(select(TimelineItem).where(TimelineItem.id == item_id))
    return r.scalar_one_or_none()


# ─── USERS ────────────────────────────────────────────────────────────────────

async def list_users(db: AsyncSession) -> list[User]:
    r = await db.execute(select(User).order_by(User.created_at))
    return r.scalars().all()


async def create_user(db: AsyncSession, data, hashed_password: str) -> User:
    user = User(
        id=_new_id(), email=data.email, name=data.name,
        role=data.role, password_hash=hashed_password
    )
    db.add(user)
    return user


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    r = await db.execute(select(User).where(User.email == email))
    return r.scalar_one_or_none()


# ─── AUDIT LOG ────────────────────────────────────────────────────────────────

async def list_audit_logs(db: AsyncSession, entity_type: str = None, limit: int = 100):
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    r = await db.execute(q)
    return r.scalars().all()


# ─── VERSIONS ─────────────────────────────────────────────────────────────────

async def list_versions(db: AsyncSession, scorecard_id: str) -> list[ScorecardVersion]:
    r = await db.execute(
        select(ScorecardVersion)
        .where(ScorecardVersion.scorecard_id == scorecard_id)
        .order_by(ScorecardVersion.version_num.desc())
    )
    return r.scalars().all()
