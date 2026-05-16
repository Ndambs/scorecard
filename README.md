# UAM Scorecard Platform

A full-stack, modular User Access Management (UAM) Operations Scorecard — built with **Angular 17**, **FastAPI**, and **PostgreSQL**. Replaces static HTML editing with a browser-based admin interface any non-technical user can operate.

---

## Quick Start (Local — No Docker)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt aiosqlite
uvicorn app.main:app --reload --port 8000
# → API runs at http://localhost:8000
# → Swagger docs at http://localhost:8000/docs
# → Database auto-created & seeded on first run
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# → App runs at http://localhost:4200
```

### 3. Login

| Role   | Email                   | Password   |
|--------|-------------------------|------------|
| Admin  | admin@uam.local         | admin123   |
| Editor | editor@uam.local        | editor123  |
| Viewer | viewer@uam.local        | viewer123  |

---

## Quick Start (Docker Compose — Full Stack)

```bash
cp .env.example .env          # edit passwords before production use
docker compose up -d
# → App at http://localhost
# → API at http://localhost:8000/docs
```

---

## Project Structure

```
uam-scorecard-platform/
│
├── backend/                        # FastAPI (Python 3.12)
│   ├── app/
│   │   ├── main.py                 # App entry point + seed data
│   │   ├── config.py               # Settings (pydantic-settings)
│   │   ├── database.py             # SQLAlchemy async engine
│   │   ├── models/__init__.py      # All ORM models (15 tables)
│   │   ├── schemas/__init__.py     # Pydantic request/response schemas
│   │   ├── api/
│   │   │   ├── auth.py             # /auth/* + JWT dependency injectors
│   │   │   ├── scorecards.py       # /scorecards CRUD + publish/versions
│   │   │   ├── content.py          # Sections, KPIs, all content types
│   │   │   └── misc.py             # Users, uploads, audit log
│   │   └── services/
│   │       ├── auth_service.py     # JWT, bcrypt, user lookup
│   │       ├── scorecard_service.py# All business logic + audit logging
│   │       └── kpi_engine.py       # pandas KPI stats + file parsing
│   ├── tests/test_api.py           # 32 tests (auth, CRUD, engine)
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                       # Angular 17 (Standalone Components)
│   ├── src/app/
│   │   ├── core/
│   │   │   ├── services/           # ApiService, AuthService
│   │   │   ├── interceptors/       # JWT auth interceptor
│   │   │   └── guards/             # authGuard, adminGuard
│   │   └── features/
│   │       ├── login/              # Login page (first-run aware)
│   │       ├── dashboard/          # Full scorecard viewer (5 tabs)
│   │       └── admin/
│   │           ├── scorecard-editor/   # Full CRUD for all content
│   │           ├── user-manager/       # User + role management
│   │           ├── upload-manager/     # CSV/Excel drag-and-drop upload
│   │           └── audit-log/          # Change history viewer
│   ├── nginx.conf                  # SPA routing + API proxy
│   └── Dockerfile
│
├── .github/workflows/ci-cd.yml    # GitHub Actions CI/CD
├── docker-compose.yml              # Full production stack
├── docker-compose.dev.yml          # Dev overrides (hot reload)
└── .env.example                    # Environment template
```

---

## Architecture

```
Browser (Angular SPA)
    │  REST/JSON over HTTPS
    ▼
FastAPI (Python 3.12)
    ├── JWT Auth (HTTP Bearer)
    ├── Role-based access (admin / editor / viewer)
    ├── Pydantic v2 validation
    ├── Audit logging on every write
    └── pandas KPI engine
    │
    ▼
SQLite (dev) / PostgreSQL 16 (prod)
    ├── 15 tables: users, scorecards, sections, kpis,
    │   kpi_history, checklist_items, action_items,
    │   metric_rows, insight_blocks, focus_items,
    │   timeline_items, uploads, audit_log,
    │   scorecard_versions
    └── Full cascade deletes
```

---

## Scorecard Modules (5 Tabs)

| Tab | Slug | Content |
|-----|------|---------|
| UAM Operations Scorecard | `uam-scorecard` | KPI cards, timeline, metrics, SR status, achievements, focus areas, action tracker, insights |
| Access Reviews | `access-reviews` | Review completion by team, insight blocks |
| SR Tracker | `sr-tracker` | Open SRs, closure KPIs, action table |
| KPI Trends | `kpi-trends` | 6-month trend insights |
| Compliance | `compliance` | Policy adherence KPIs, compliance checklist |

---

## Section Types

Each scorecard is built from typed sections — add, remove, reorder freely:

| Type | Description |
|------|-------------|
| `timeline` | Bullet-point timeline of events |
| `metric_table` | Label + progress bar + status badge rows |
| `checklist` | Checkbox items (done / pending) |
| `action_table` | Action · Owner · Status rows |
| `insight` | Coloured insight blocks (What Happened / Being Done / Leadership) |
| `focus_list` | Simple bulleted focus items |

---

## API Reference

Full interactive docs at `http://localhost:8000/docs` (Swagger UI).

### Key Endpoints

```
POST   /api/auth/login                  → { access_token, user }
GET    /api/auth/me                     → current user

GET    /api/scorecards                  → all scorecards with sections + KPIs
GET    /api/scorecards/{id|slug}        → single scorecard (full detail)
PATCH  /api/scorecards/{id}             → update meta (title, period, etc.)
POST   /api/scorecards/{id}/publish     → publish & create version snapshot
GET    /api/scorecards/{id}/versions    → version history

POST   /api/scorecards/{id}/kpis        → create KPI card
PATCH  /api/kpis/{id}                   → update KPI (value, bar%, color, trend)
POST   /api/kpis/{id}/history           → add monthly data point
GET    /api/kpis/{id}/stats             → trend, avg, delta (from pandas engine)

POST   /api/scorecards/{id}/sections    → add section
PATCH  /api/sections/{id}               → update section meta
DELETE /api/sections/{id}               → delete section + cascade

POST   /api/sections/{id}/checklist-items
POST   /api/sections/{id}/action-items
POST   /api/sections/{id}/metric-rows
POST   /api/sections/{id}/insight-blocks
POST   /api/sections/{id}/focus-items
POST   /api/sections/{id}/timeline-items

POST   /api/uploads                     → multipart CSV/Excel upload
GET    /api/uploads/{id}/preview        → first 20 rows as JSON

GET    /api/users                       → list users (admin only)
POST   /api/users                       → create user (admin only)

GET    /api/audit                       → audit log (admin only)
```

---

## Roles & Permissions

| Action | viewer | editor | admin |
|--------|:------:|:------:|:-----:|
| View dashboard | ✅ | ✅ | ✅ |
| Edit KPIs & sections | ✗ | ✅ | ✅ |
| Upload files | ✗ | ✅ | ✅ |
| Publish scorecard | ✗ | ✅ | ✅ |
| Manage users | ✗ | ✗ | ✅ |
| View audit log | ✗ | ✗ | ✅ |
| Create/delete scorecards | ✗ | ✗ | ✅ |

---

## Running Tests

```bash
cd backend
pytest tests/ -v
# 32 tests: auth, CRUD, role enforcement, KPI engine
```

---

## Production Deployment

### Environment Variables

```bash
cp .env.example .env
# Set: POSTGRES_PASSWORD, SECRET_KEY (openssl rand -hex 32)
```

### Docker Compose

```bash
docker compose up -d
# Services: db (PostgreSQL), redis, api (FastAPI), frontend (Nginx)
```

### GitHub Actions CI/CD

Set these repository secrets:
- `SERVER_HOST` — your server IP/hostname
- `SERVER_USER` — SSH user
- `SERVER_SSH_KEY` — private SSH key

Pipeline: test backend → build Angular → push Docker images → deploy via SSH.

---

## Switching from SQLite to PostgreSQL

The backend uses **SQLite** by default (zero config for local dev). For production, set:

```env
DATABASE_URL=postgresql+asyncpg://uam:password@localhost:5432/uam_scorecard
```

No code changes needed — SQLAlchemy handles both.

---

## Default Credentials (Development Only)

> ⚠️ Change all passwords before any production deployment.

| User | Password |
|------|----------|
| admin@uam.local | admin123 |
| editor@uam.local | editor123 |
| viewer@uam.local | viewer123 |
