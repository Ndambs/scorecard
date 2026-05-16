from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import ScorecardOut, ScorecardCreate, ScorecardUpdate, VersionOut
from app.services import scorecard_service as svc
from app.api.auth import require_viewer, require_editor, require_admin
from app.models import User

router = APIRouter(prefix="/api/scorecards", tags=["scorecards"])


@router.get("", response_model=list[ScorecardOut])
async def list_scorecards(db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    return await svc.list_scorecards(db)


@router.get("/{scorecard_id}", response_model=ScorecardOut)
async def get_scorecard(scorecard_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    # Try by ID first, then by slug
    sc = await svc.get_scorecard(db, scorecard_id)
    if not sc:
        sc = await svc.get_scorecard_by_slug(db, scorecard_id)
    if not sc:
        raise HTTPException(404, "Scorecard not found")
    return sc


@router.post("", response_model=ScorecardOut)
async def create_scorecard(body: ScorecardCreate, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    sc = await svc.create_scorecard(db, body, user.id)
    await db.commit()
    await db.refresh(sc)
    return await svc.get_scorecard(db, sc.id)


@router.patch("/{scorecard_id}", response_model=ScorecardOut)
async def update_scorecard(scorecard_id: str, body: ScorecardUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    sc = await svc.get_scorecard(db, scorecard_id)
    if not sc:
        raise HTTPException(404, "Scorecard not found")
    await svc.update_scorecard(db, sc, body, user.id)
    await db.commit()
    return await svc.get_scorecard(db, sc.id)


@router.delete("/{scorecard_id}")
async def delete_scorecard(scorecard_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_admin)):
    sc = await svc.get_scorecard(db, scorecard_id)
    if not sc:
        raise HTTPException(404, "Scorecard not found")
    await svc.delete_scorecard(db, sc, user.id)
    await db.commit()
    return {"deleted": True}


@router.post("/{scorecard_id}/publish")
async def publish_scorecard(scorecard_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_editor)):
    sc = await svc.get_scorecard(db, scorecard_id)
    if not sc:
        raise HTTPException(404, "Scorecard not found")
    await svc.publish_scorecard(db, sc, user.id)
    await db.commit()
    return {"status": "published", "scorecard_id": scorecard_id}


@router.get("/{scorecard_id}/versions", response_model=list[VersionOut])
async def get_versions(scorecard_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(require_viewer)):
    return await svc.list_versions(db, scorecard_id)
