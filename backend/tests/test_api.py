"""
UAM Scorecard – Backend Test Suite
Run with: pytest tests/ -v
"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import create_tables, engine, Base

# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    """Create tables and seed data once for the test session."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await create_tables()
    from app.main import seed_initial_data
    await seed_initial_data()
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
async def admin_token(client):
    r = await client.post("/api/auth/login", json={
        "email": "admin@uam.local", "password": "admin123"
    })
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture
async def editor_token(client):
    r = await client.post("/api/auth/login", json={
        "email": "editor@uam.local", "password": "editor123"
    })
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture
async def viewer_token(client):
    r = await client.post("/api/auth/login", json={
        "email": "viewer@uam.local", "password": "viewer123"
    })
    assert r.status_code == 200
    return r.json()["access_token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── Health ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ─── Auth ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client):
    r = await client.post("/api/auth/login", json={
        "email": "admin@uam.local", "password": "admin123"
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    r = await client.post("/api/auth/login", json={
        "email": "admin@uam.local", "password": "wrongpassword"
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_user(client):
    r = await client.post("/api/auth/login", json={
        "email": "nobody@uam.local", "password": "test"
    })
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client, admin_token):
    r = await client.get("/api/auth/me", headers=auth(admin_token))
    assert r.status_code == 200
    assert r.json()["email"] == "admin@uam.local"


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    r = await client.get("/api/auth/me")
    assert r.status_code == 401


# ─── Scorecards ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_scorecards(client, viewer_token):
    r = await client.get("/api/scorecards", headers=auth(viewer_token))
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 5  # 5 seeded scorecards
    slugs = [s["slug"] for s in data]
    assert "uam-scorecard" in slugs
    assert "access-reviews" in slugs
    assert "compliance" in slugs


@pytest.mark.asyncio
async def test_get_scorecard_by_id(client, viewer_token):
    scs = (await client.get("/api/scorecards", headers=auth(viewer_token))).json()
    sc_id = scs[0]["id"]
    r = await client.get(f"/api/scorecards/{sc_id}", headers=auth(viewer_token))
    assert r.status_code == 200
    sc = r.json()
    assert sc["id"] == sc_id
    assert "kpis" in sc
    assert "sections" in sc


@pytest.mark.asyncio
async def test_get_scorecard_by_slug(client, viewer_token):
    r = await client.get("/api/scorecards/uam-scorecard", headers=auth(viewer_token))
    assert r.status_code == 200
    assert r.json()["slug"] == "uam-scorecard"


@pytest.mark.asyncio
async def test_get_scorecard_not_found(client, viewer_token):
    r = await client.get("/api/scorecards/nonexistent-slug", headers=auth(viewer_token))
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_uam_scorecard_has_kpis(client, viewer_token):
    r = await client.get("/api/scorecards/uam-scorecard", headers=auth(viewer_token))
    sc = r.json()
    assert len(sc["kpis"]) == 4
    labels = [k["label"] for k in sc["kpis"]]
    assert "Request SLA" in labels


@pytest.mark.asyncio
async def test_uam_scorecard_has_sections(client, viewer_token):
    r = await client.get("/api/scorecards/uam-scorecard", headers=auth(viewer_token))
    sc = r.json()
    assert len(sc["sections"]) >= 5
    types = [s["section_type"] for s in sc["sections"]]
    assert "timeline" in types
    assert "checklist" in types
    assert "action_table" in types
    assert "insight" in types


@pytest.mark.asyncio
async def test_create_scorecard_admin(client, admin_token):
    r = await client.post("/api/scorecards", headers=auth(admin_token), json={
        "slug": "test-scorecard-ci",
        "title": "CI Test Scorecard",
        "period": "May 2026",
        "accent_color": "blue",
        "icon": "🧪"
    })
    assert r.status_code == 200
    sc = r.json()
    assert sc["slug"] == "test-scorecard-ci"
    return sc["id"]


@pytest.mark.asyncio
async def test_create_scorecard_viewer_forbidden(client, viewer_token):
    r = await client.post("/api/scorecards", headers=auth(viewer_token), json={
        "slug": "should-fail", "title": "Should Fail"
    })
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_update_scorecard(client, editor_token):
    r = await client.get("/api/scorecards/uam-scorecard", headers=auth(editor_token))
    sc_id = r.json()["id"]
    r2 = await client.patch(f"/api/scorecards/{sc_id}", headers=auth(editor_token), json={
        "period": "May 2026 (Updated)"
    })
    assert r2.status_code == 200
    assert r2.json()["period"] == "May 2026 (Updated)"


@pytest.mark.asyncio
async def test_publish_scorecard(client, editor_token):
    r = await client.get("/api/scorecards/uam-scorecard", headers=auth(editor_token))
    sc_id = r.json()["id"]
    r2 = await client.post(f"/api/scorecards/{sc_id}/publish", headers=auth(editor_token))
    assert r2.status_code == 200
    assert r2.json()["status"] == "published"


@pytest.mark.asyncio
async def test_scorecard_versions(client, editor_token):
    r = await client.get("/api/scorecards/uam-scorecard", headers=auth(editor_token))
    sc_id = r.json()["id"]
    await client.post(f"/api/scorecards/{sc_id}/publish", headers=auth(editor_token))
    r2 = await client.get(f"/api/scorecards/{sc_id}/versions", headers=auth(editor_token))
    assert r2.status_code == 200
    assert len(r2.json()) >= 1


# ─── KPIs ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_kpi(client, editor_token):
    scs = (await client.get("/api/scorecards", headers=auth(editor_token))).json()
    sc_id = scs[0]["id"]
    r = await client.post(f"/api/scorecards/{sc_id}/kpis", headers=auth(editor_token), json={
        "label": "New Test KPI",
        "value": "99%",
        "sub_text": "All good",
        "bar_percent": 99,
        "color": "green",
        "trend": "up"
    })
    assert r.status_code == 200
    kpi = r.json()
    assert kpi["label"] == "New Test KPI"
    assert kpi["bar_percent"] == 99
    return kpi["id"]


@pytest.mark.asyncio
async def test_update_kpi(client, editor_token):
    scs = (await client.get("/api/scorecards", headers=auth(editor_token))).json()
    sc_id = scs[0]["id"]
    kpi_r = await client.post(f"/api/scorecards/{sc_id}/kpis", headers=auth(editor_token), json={
        "label": "KPI to Update", "value": "50%", "bar_percent": 50, "color": "amber", "trend": "stable"
    })
    kpi_id = kpi_r.json()["id"]
    r = await client.patch(f"/api/kpis/{kpi_id}", headers=auth(editor_token), json={
        "value": "75%", "bar_percent": 75, "color": "green", "trend": "up"
    })
    assert r.status_code == 200
    assert r.json()["value"] == "75%"
    assert r.json()["trend"] == "up"


@pytest.mark.asyncio
async def test_kpi_history(client, editor_token):
    scs = (await client.get("/api/scorecards", headers=auth(editor_token))).json()
    sc_id = scs[0]["id"]
    sc = (await client.get(f"/api/scorecards/{sc_id}", headers=auth(editor_token))).json()
    kpi_id = sc["kpis"][0]["id"]
    # Add history entry
    r = await client.post(f"/api/kpis/{kpi_id}/history", headers=auth(editor_token), json={
        "period": "May 2026", "value": 92.5
    })
    assert r.status_code == 200
    # Fetch stats
    r2 = await client.get(f"/api/kpis/{kpi_id}/stats", headers=auth(editor_token))
    assert r2.status_code == 200
    stats = r2.json()
    assert "trend" in stats
    assert "average" in stats


@pytest.mark.asyncio
async def test_delete_kpi(client, editor_token):
    scs = (await client.get("/api/scorecards", headers=auth(editor_token))).json()
    sc_id = scs[0]["id"]
    kpi_r = await client.post(f"/api/scorecards/{sc_id}/kpis", headers=auth(editor_token), json={
        "label": "KPI to Delete", "value": "0%", "bar_percent": 0, "color": "crimson", "trend": "down"
    })
    kpi_id = kpi_r.json()["id"]
    r = await client.delete(f"/api/kpis/{kpi_id}", headers=auth(editor_token))
    assert r.status_code == 200
    assert r.json()["deleted"] is True


# ─── Sections ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_section(client, editor_token):
    scs = (await client.get("/api/scorecards", headers=auth(editor_token))).json()
    sc_id = scs[0]["id"]
    r = await client.post(f"/api/scorecards/{sc_id}/sections", headers=auth(editor_token), json={
        "title": "Test Timeline Section",
        "section_type": "timeline",
        "icon": "📌",
        "accent_color": "blue"
    })
    assert r.status_code == 200
    sec = r.json()
    assert sec["section_type"] == "timeline"
    return sec["id"]


@pytest.mark.asyncio
async def test_create_checklist_item(client, editor_token):
    scs = (await client.get("/api/scorecards", headers=auth(editor_token))).json()
    sc_id = scs[0]["id"]
    # Get a checklist section
    sc = (await client.get(f"/api/scorecards/{sc_id}", headers=auth(editor_token))).json()
    sec = next((s for s in sc["sections"] if s["section_type"] == "checklist"), None)
    if not sec:
        pytest.skip("No checklist section found")
    r = await client.post(f"/api/sections/{sec['id']}/checklist-items", headers=auth(editor_token), json={
        "text": "Test checklist item from CI", "done": False
    })
    assert r.status_code == 200
    assert r.json()["text"] == "Test checklist item from CI"


@pytest.mark.asyncio
async def test_create_action_item(client, editor_token):
    scs = (await client.get("/api/scorecards", headers=auth(editor_token))).json()
    sc_id = scs[0]["id"]
    sc = (await client.get(f"/api/scorecards/{sc_id}", headers=auth(editor_token))).json()
    sec = next((s for s in sc["sections"] if s["section_type"] == "action_table"), None)
    if not sec:
        pytest.skip("No action_table section found")
    r = await client.post(f"/api/sections/{sec['id']}/action-items", headers=auth(editor_token), json={
        "action_text": "CI test action", "owner": "CI Bot", "status": "on_track"
    })
    assert r.status_code == 200
    assert r.json()["owner"] == "CI Bot"


# ─── Users ────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users_admin_only(client, admin_token, viewer_token):
    r_admin = await client.get("/api/users", headers=auth(admin_token))
    assert r_admin.status_code == 200
    assert len(r_admin.json()) >= 3
    r_viewer = await client.get("/api/users", headers=auth(viewer_token))
    assert r_viewer.status_code == 403


@pytest.mark.asyncio
async def test_create_user(client, admin_token):
    r = await client.post("/api/users", headers=auth(admin_token), json={
        "email": "ci-test@uam.local",
        "name": "CI Test User",
        "role": "viewer",
        "password": "testpass123"
    })
    assert r.status_code == 200
    assert r.json()["email"] == "ci-test@uam.local"


# ─── KPI Engine ───────────────────────────────────────────────────────────────

def test_kpi_stats_calculation():
    from app.services.kpi_engine import calculate_kpi_stats
    history = [
        {"period": "Jan 2026", "value": 80},
        {"period": "Feb 2026", "value": 85},
        {"period": "Mar 2026", "value": 90},
        {"period": "Apr 2026", "value": 92},
    ]
    stats = calculate_kpi_stats(history)
    assert stats["latest"] == 92
    assert stats["trend"] == "up"
    assert stats["delta"] == 2
    assert abs(stats["average"] - 86.75) < 0.5


def test_kpi_stats_empty():
    from app.services.kpi_engine import calculate_kpi_stats
    stats = calculate_kpi_stats([])
    assert stats["trend"] == "stable"


def test_status_color():
    from app.services.kpi_engine import determine_status_color
    assert determine_status_color(90) == "green"
    assert determine_status_color(70) == "amber"
    assert determine_status_color(40) == "crimson"


def test_completion_rate():
    from app.services.kpi_engine import calculate_completion_rate
    assert calculate_completion_rate(8, 10) == 80.0
    assert calculate_completion_rate(0, 10) == 0.0
    assert calculate_completion_rate(5, 0) == 0.0


# ─── Audit Log ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_audit_log_admin_only(client, admin_token, viewer_token):
    r_admin = await client.get("/api/audit", headers=auth(admin_token))
    assert r_admin.status_code == 200
    assert isinstance(r_admin.json(), list)
    r_viewer = await client.get("/api/audit", headers=auth(viewer_token))
    assert r_viewer.status_code == 403


@pytest.mark.asyncio
async def test_audit_log_has_entries(client, admin_token):
    r = await client.get("/api/audit", headers=auth(admin_token))
    entries = r.json()
    # Should have at minimum the seed create entries
    assert len(entries) > 0
    actions = {e["action"] for e in entries}
    assert "create" in actions
