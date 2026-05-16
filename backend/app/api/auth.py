from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import LoginRequest, TokenResponse, UserOut, UserCreate
from app.services.auth_service import (
    authenticate_user, create_access_token, decode_token,
    get_user_by_id, hash_password
)
from app.services import scorecard_service as svc
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])
bearer = HTTPBearer(auto_error=False)


# ─── DEPENDENCY: get current user from Bearer token ───────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials if credentials else None
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await get_user_by_id(db, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def require_viewer(user: User = Depends(get_current_user)) -> User:
    return user  # all authenticated users can view


async def require_editor(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("editor", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Editor role required")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return user


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id, "email": user.email,
            "name": user.name, "role": user.role
        }
    }


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.post("/register", response_model=UserOut)
async def register_first_admin(body: UserCreate, db: AsyncSession = Depends(get_db)):
    """Only usable when no users exist (first-run setup)."""
    from sqlalchemy import select, func
    count = await db.execute(select(func.count()).select_from(User))
    if count.scalar() > 0:
        raise HTTPException(400, "Registration disabled. Use admin panel to add users.")
    user = await svc.create_user(db, body, hash_password(body.password))
    user.role = "admin"  # first user is always admin
    await db.commit()
    await db.refresh(user)
    return user
