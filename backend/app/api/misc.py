from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas import UserOut, UserCreate, UserUpdate, UploadOut, AuditLogOut
from app.services import scorecard_service as svc
from app.services.auth_service import hash_password
from app.services.kpi_engine import parse_csv_preview, parse_excel_preview
from app.api.auth import require_viewer, require_editor, require_admin
from app.models import User, Upload
from app.config import settings
import aiofiles, uuid, os

# ─── USERS ────────────────────────────────────────────────────────────────────

users_router = APIRouter(prefix="/api/users", tags=["users"])


@users_router.get("", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    return await svc.list_users(db)


@users_router.post("", response_model=UserOut)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    existing = await svc.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(400, "Email already registered")
    new_user = await svc.create_user(db, body, hash_password(body.password))
    await db.commit()
    await db.refresh(new_user)
    return new_user


@users_router.patch("/{user_id}", response_model=UserOut)
async def update_user(user_id: str, body: UserUpdate, db: AsyncSession = Depends(get_db), current: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User not found")
    if body.name:      target.name = body.name
    if body.role:      target.role = body.role
    if body.is_active is not None: target.is_active = body.is_active
    if body.password:  target.password_hash = hash_password(body.password)
    await db.commit()
    await db.refresh(target)
    return target


@users_router.delete("/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db), current: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == current.id:
        raise HTTPException(400, "Cannot delete yourself")
    await db.delete(target)
    await db.commit()
    return {"deleted": True}


# ─── UPLOADS ──────────────────────────────────────────────────────────────────

uploads_router = APIRouter(prefix="/api/uploads", tags=["uploads"])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


@uploads_router.post("", response_model=UploadOut)
async def upload_file(
    file: UploadFile = File(...),
    scorecard_id: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_editor)
):
    ext = (file.filename or "").split(".")[-1].lower()
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(400, "Only CSV and Excel files accepted")

    unique_name = f"{uuid.uuid4()}.{ext}"
    path = os.path.join(settings.UPLOAD_DIR, unique_name)

    async with aiofiles.open(path, "wb") as f:
        content = await file.read()
        await f.write(content)

    upload = Upload(
        scorecard_id=scorecard_id,
        filename=unique_name,
        original_name=file.filename,
        file_type=ext,
        file_size=len(content),
        storage_path=path,
        status="uploaded",
        uploaded_by=user.id,
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)
    return upload


@uploads_router.get("/{upload_id}/preview")
async def preview_upload(upload_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    result = await db.execute(select(Upload).where(Upload.id == upload_id))
    upload = result.scalar_one_or_none()
    if not upload:
        raise HTTPException(404, "Upload not found")
    if not upload.storage_path or not os.path.exists(upload.storage_path):
        raise HTTPException(404, "File not found on disk")

    if upload.file_type == "csv":
        return parse_csv_preview(upload.storage_path)
    else:
        return parse_excel_preview(upload.storage_path)


@uploads_router.get("", response_model=list[UploadOut])
async def list_uploads(scorecard_id: str = None, db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    q = select(Upload)
    if scorecard_id:
        q = q.where(Upload.scorecard_id == scorecard_id)
    r = await db.execute(q)
    return r.scalars().all()


# ─── AUDIT LOG ────────────────────────────────────────────────────────────────

audit_router = APIRouter(prefix="/api/audit", tags=["audit"])


@audit_router.get("", response_model=list[AuditLogOut])
async def list_audit(
    entity_type: str = None,
    limit: int = 100,
    start_date: Optional[datetime] = Query(None, description="Filter: created_at >= this timestamp"),
    end_date:   Optional[datetime] = Query(None, description="Filter: created_at <= this timestamp"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin)
):
    return await svc.list_audit_logs(db, entity_type, limit, start_date, end_date)


@audit_router.get("/component-types")
async def get_audit_component_types(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Distinct system component types currently present in the audit log,
    for populating the filter/export/delete dropdown."""
    return {"types": await svc.list_audit_log_types(db)}


@audit_router.delete("")
async def clear_audit_logs(
    entity_type: Optional[str] = Query(None, description="Limit to one component type; omit to target all types"),
    start_date: Optional[datetime] = Query(None, description="Only clear entries with created_at >= this timestamp"),
    end_date:   Optional[datetime] = Query(None, description="Only clear entries with created_at <= this timestamp"),
    confirm: bool = Query(False, description="Must be true to actually delete"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Bulk-delete audit log entries, optionally scoped to a component type
    and/or date range. With no filters at all, this clears the entire log —
    requires confirm=true as a safety check."""
    if not confirm:
        raise HTTPException(status_code=400, detail="Pass confirm=true to delete audit logs.")
    deleted = await svc.delete_audit_logs(db, entity_type, start_date, end_date)
    return {"deleted": deleted}


@audit_router.get("/export/excel")
async def export_audit_logs_excel(
    entity_type: Optional[str] = Query(None, description="Limit export to one component type"),
    start_date: Optional[datetime] = Query(None, description="Filter: created_at >= this timestamp"),
    end_date:   Optional[datetime] = Query(None, description="Filter: created_at <= this timestamp"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Export audit log entries to a downloadable .xlsx, optionally scoped to
    a single component type and/or date range."""
    logs = await svc.list_audit_logs(db, entity_type, limit=100000, start_date=start_date, end_date=end_date)
    content = svc.build_audit_log_excel(logs)

    label = entity_type or "all-components"
    filename = f"Audit_Log_{label}.xlsx"

    return StreamingResponse(
        iter([content]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
