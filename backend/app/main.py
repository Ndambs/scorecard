from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import create_tables
from app.api.auth import router as auth_router
from app.api.scorecards import router as sc_router
from app.api.content import (
    sc_sections_router, sections_router,
    sc_kpis_router, kpis_router,
    checklist_router, action_router,
    metric_router, insight_router,
    focus_router, timeline_router,
)
from app.api.misc import users_router, uploads_router, audit_router
from app.api.export import router as export_router
from app.api.weekly_reports import router as weekly_router, seed_default_weekly_report
from app.api.vmt_uam import router as vmt_uam_router 

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and seed data on startup
    await create_tables()
    await seed_initial_data()
    from app.database import AsyncSessionLocal as _ASL
    async with _ASL() as _db:
        await seed_default_weekly_report(_db)
    yield


app = FastAPI(
    title="UAM Scorecard API",
    version="1.0.0",
    description="Backend API for UAM Operations Scorecard Management Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
for router in [
    auth_router, sc_router,
    sc_sections_router, sections_router,
    sc_kpis_router, kpis_router,
    checklist_router, action_router,
    metric_router, insight_router,
    focus_router, timeline_router,
    users_router, uploads_router, audit_router, export_router, weekly_router,vmt_uam_router,
]:
    app.include_router(router)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


# ─── SEED DATA ────────────────────────────────────────────────────────────────

async def seed_initial_data():
    """Populate the DB with the UAM Scorecard data from the existing HTML file."""
    from app.database import AsyncSessionLocal
    from app.models import User, Scorecard, Section, KPI, KPIHistory
    from app.models import ChecklistItem, ActionItem, MetricRow, InsightBlock, FocusItem, TimelineItem
    from sqlalchemy import select, func
    import uuid

    def nid(): return str(uuid.uuid4())

    async with AsyncSessionLocal() as db:
        # Skip if already seeded
        user_count = await db.execute(select(func.count()).select_from(User))
        if user_count.scalar() > 0:
            return

        # ── Create default users ────────────────────────────────────────────
        from app.services.auth_service import hash_password

        admin = User(id=nid(), email="admin@uam.local", name="UAM Admin",
                     role="admin", password_hash=hash_password("Admin@1234!"))
        editor = User(id=nid(), email="editor@uam.local", name="UAM Editor",
                      role="editor", password_hash=hash_password("Editor@1234!"))
        viewer = User(id=nid(), email="viewer@uam.local", name="UAM Viewer",
                      role="viewer", password_hash=hash_password("Viewer@1234!"))
        db.add_all([admin, editor, viewer])
        await db.flush()

        # ── Scorecard 1: UAM Operations Scorecard ──────────────────────────
        sc1_id = nid()
        sc1 = Scorecard(
            id=sc1_id, slug="uam-scorecard", title="UAM Operations Scorecard",
            subtitle="User Access Management Performance Overview",
            period="April 2026", status="published", accent_color="crimson",
            icon="🔐", display_order=0, created_by=admin.id,
        )
        db.add(sc1)

        # KPI row cards
        kpis_data = [
            ("Request SLA",      "90%+",    "Maintained above target",   90,  "green",   "stable", 0),
            ("Access Reviews",   "Q1 & Q4", "Actively tracked & completed", 75, "blue",  "up",     1),
            ("Pending Requests", "Active",  "Being tracked & resolved",  60,  "amber",   "down",   2),
            ("VF Support",       "↑",       "Responsiveness improved",   85,  "crimson", "up",     3),
        ]
        kpi_ids = []
        for label, value, sub, pct, color, trend, order in kpis_data:
            k = KPI(id=nid(), scorecard_id=sc1_id, label=label, value=value,
                    sub_text=sub, bar_percent=pct, color=color, trend=trend, sort_order=order)
            db.add(k)
            kpi_ids.append(k.id)
            # Add 6 months of history
            history_vals = {
                "Request SLA":      [84, 87, 88, 91, 90, 90],
                "Access Reviews":   [60, 65, 70, 72, 74, 75],
                "Pending Requests": [80, 75, 70, 68, 62, 60],
                "VF Support":       [70, 75, 78, 80, 83, 85],
            }
            periods = ["Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"]
            for i, (period, val) in enumerate(zip(periods, history_vals[label])):
                db.add(KPIHistory(id=nid(), kpi_id=k.id, period=period, value=val))

        # Section: Key Highlights (timeline)
        s_highlights_id = nid()
        s_highlights = Section(
            id=s_highlights_id, scorecard_id=sc1_id, title="Key Highlights",
            section_type="timeline", icon="📌", accent_color="crimson", display_order=0
        )
        db.add(s_highlights)
        for i, text in enumerate([
            "Progress made on pending access requests across multiple teams",
            "Continued support for Vodafone (VF) login, VOGA, and GitHub access issues",
            "Q1 and Q4 user reviews actively tracked and completed where applicable",
            "Maintained Request SLA performance above 90%",
            "Continued support for SmartApp and Hub-related operational activities",
        ]):
            db.add(TimelineItem(id=nid(), section_id=s_highlights_id, text=text, sort_order=i))

        # Section: KPI Performance Overview (metric_table)
        s_kpi_perf_id = nid()
        s_kpi_perf = Section(
            id=s_kpi_perf_id, scorecard_id=sc1_id, title="KPI Performance Overview",
            section_type="metric_table", icon="📊", accent_color="green", display_order=1
        )
        db.add(s_kpi_perf)
        for i, (label, pct, color, status) in enumerate([
            ("Request SLA maintained above 90%",          90, "green", "met"),
            ("Pending access requests tracked & resolved", 70, "amber", "active"),
            ("User review completion monitored",           75, "blue",  "active"),
            ("Support responsiveness — Vodafone",          85, "green", "met"),
        ]):
            db.add(MetricRow(id=nid(), section_id=s_kpi_perf_id, label=label,
                             bar_percent=pct, bar_color=color, status=status, sort_order=i))

        # Section: SR Closure Status (checklist)
        s_sr_id = nid()
        s_sr = Section(
            id=s_sr_id, scorecard_id=sc1_id, title="Service Request (SR) Closure Status",
            section_type="checklist", icon="🎫", accent_color="blue", display_order=2
        )
        db.add(s_sr)
        for i, (text, done) in enumerate([
            ("Completion of pending access requests for different teams", True),
            ("Fast-tracking Q1 user review completion", True),
            ("Continuous follow-up on outstanding requests", False),
        ]):
            db.add(ChecklistItem(id=nid(), section_id=s_sr_id, text=text, done=done, sort_order=i))

        # Section: Achievements (checklist)
        s_ach_id = nid()
        s_ach = Section(
            id=s_ach_id, scorecard_id=sc1_id, title="Achievements",
            section_type="checklist", icon="🏆", accent_color="green", display_order=3
        )
        db.add(s_ach)
        for i, text in enumerate([
            "Improved turnaround time on user support requests",
            "Enhanced coordination with teams for approvals and closures",
            "VF login, VOGA and GitHub access issues actively resolved",
        ]):
            db.add(ChecklistItem(id=nid(), section_id=s_ach_id, text=text, done=True, sort_order=i))

        # Section: Focus Areas (focus_list)
        s_focus_id = nid()
        s_focus = Section(
            id=s_focus_id, scorecard_id=sc1_id, title="Focus Areas",
            section_type="focus_list", icon="🎯", accent_color="amber", display_order=4
        )
        db.add(s_focus)
        for i, text in enumerate([
            "Follow up and close out on the pending reviews",
            "Improving operational efficiency and user support responsiveness",
            "Supporting automation and documentation initiatives",
            "Fast-tracking pending VF requests",
            "Supporting users with VF login issues",
        ]):
            db.add(FocusItem(id=nid(), section_id=s_focus_id, text=text, sort_order=i))

        # Section: Key Asks / Action Tracker (action_table)
        s_action_id = nid()
        s_action = Section(
            id=s_action_id, scorecard_id=sc1_id, title="Key Asks / Market Action Tracker",
            section_type="action_table", icon="📣", accent_color="crimson", display_order=5
        )
        db.add(s_action)
        for i, (action, owner, owner_color, status) in enumerate([
            ("Reduce emergency changes through stronger forward planning", "Market Ops",   "blue",  "in_progress"),
            ("Improve RCA completion and close overdue problem actions",   "Problem Mgt",  "red",   "in_progress"),
            ("Protect availability through proactive monitoring",          "Service Ops",  "green", "on_track"),
        ]):
            db.add(ActionItem(id=nid(), section_id=s_action_id, action_text=action,
                              owner=owner, owner_color=owner_color, status=status, sort_order=i))

        # Section: Key Insights (insight)
        s_insight_id = nid()
        s_insight = Section(
            id=s_insight_id, scorecard_id=sc1_id, title="Key Insights",
            section_type="insight", icon="🔍", accent_color="amber", display_order=6
        )
        db.add(s_insight)
        for i, (heading, body, color) in enumerate([
            ("What Happened",
             "Overall Request SLA held above 90% for April 2026. Pending access requests were actively tracked across multiple teams. Q1 and Q4 user review cycles progressed with completions recorded where applicable.",
             "crimson"),
            ("What Is Being Done",
             "Fast-tracking VF pending requests and login issue resolution. Automation and documentation initiatives underway to reduce manual effort. Coordination with approvers improved to close outstanding SRs faster.",
             "blue"),
            ("Leadership Note",
             "Outstanding Q1 user reviews require leadership follow-up to ensure completion before Q2 audit. VF access issues present a recurring pattern — recommend a permanent fix review. Pending requests across teams need escalation path defined.",
             "amber"),
        ]):
            db.add(InsightBlock(id=nid(), section_id=s_insight_id,
                                heading=heading, body=body, color=color, sort_order=i))

        # ── Scorecard 2: Access Reviews ─────────────────────────────────────
        sc2_id = nid()
        sc2 = Scorecard(
            id=sc2_id, slug="access-reviews", title="Access Reviews",
            subtitle="Quarterly User Access Review Tracker",
            period="Q1 2026", status="published", accent_color="blue",
            icon="🔑", display_order=1, created_by=admin.id,
        )
        db.add(sc2)

        # Access Reviews KPIs
        for label, value, sub, pct, color, order in [
            ("Q1 Reviews Completed", "78%",    "Target: 100%",           78,  "amber", 0),
            ("Q4 Reviews Closed",    "95%",    "Ahead of schedule",      95,  "green", 1),
            ("Overdue Reviews",      "12",     "Requires immediate action", 30, "crimson", 2),
            ("Teams Reviewed",       "8 / 10", "2 teams pending",        80,  "blue",  3),
        ]:
            db.add(KPI(id=nid(), scorecard_id=sc2_id, label=label, value=value,
                       sub_text=sub, bar_percent=pct, color=color, sort_order=order))

        s_ar_id = nid()
        db.add(Section(id=s_ar_id, scorecard_id=sc2_id, title="Review Status by Team",
                       section_type="metric_table", icon="📋", accent_color="blue", display_order=0))
        for i, (label, pct, color, status) in enumerate([
            ("Engineering Team",    100, "green",   "met"),
            ("Finance Team",         95, "green",   "met"),
            ("HR & People Ops",      80, "green",   "met"),
            ("Market Operations",    60, "amber",   "active"),
            ("IT Security",          45, "crimson", "at_risk"),
            ("Customer Support",     90, "green",   "met"),
        ]):
            db.add(MetricRow(id=nid(), section_id=s_ar_id, label=label,
                             bar_percent=pct, bar_color=color, status=status, sort_order=i))

        s_ar_insight_id = nid()
        db.add(Section(id=s_ar_insight_id, scorecard_id=sc2_id, title="Access Review Insights",
                       section_type="insight", icon="🔍", accent_color="amber", display_order=1))
        for i, (heading, body, color) in enumerate([
            ("Q1 Progress", "78% of Q1 reviews completed as of April 2026. Engineering and Finance teams leading completion rates.", "blue"),
            ("Critical Gaps", "IT Security team at 45% completion — highest risk for Q2 audit. Immediate escalation required.", "crimson"),
            ("Recommendation", "Schedule dedicated review sessions for IT Security and Market Operations before end of May 2026.", "amber"),
        ]):
            db.add(InsightBlock(id=nid(), section_id=s_ar_insight_id,
                                heading=heading, body=body, color=color, sort_order=i))

        # ── Scorecard 3: SR Tracker ──────────────────────────────────────────
        sc3_id = nid()
        sc3 = Scorecard(
            id=sc3_id, slug="sr-tracker", title="SR Tracker",
            subtitle="Service Request Management & SLA Monitoring",
            period="April 2026", status="published", accent_color="green",
            icon="🎫", display_order=2, created_by=admin.id,
        )
        db.add(sc3)

        for label, value, sub, pct, color, order in [
            ("Open SRs",         "14",   "Requires attention",     35,  "amber", 0),
            ("Closed This Month","28",   "Above monthly target",   92,  "green", 1),
            ("SLA Breaches",     "2",    "Below threshold",        8,   "crimson", 2),
            ("Avg Resolution",   "1.8d", "Target: 2 days",         90,  "green", 3),
        ]:
            db.add(KPI(id=nid(), scorecard_id=sc3_id, label=label, value=value,
                       sub_text=sub, bar_percent=pct, color=color, sort_order=order))

        s_sr2_id = nid()
        db.add(Section(id=s_sr2_id, scorecard_id=sc3_id, title="Open Service Requests",
                       section_type="action_table", icon="📋", accent_color="crimson", display_order=0))
        for i, (action, owner, owner_color, status) in enumerate([
            ("VF VOGA portal access not restored after password reset", "UAM Team",   "blue",  "in_progress"),
            ("GitHub enterprise access blocked for new joiner batch",   "IT Ops",     "green", "in_progress"),
            ("SmartApp login failure — 3 affected users",               "App Support","amber", "at_risk"),
            ("Bulk access request Q1 cleanup pending sign-off",         "UAM Admin",  "red",   "in_progress"),
        ]):
            db.add(ActionItem(id=nid(), section_id=s_sr2_id, action_text=action,
                              owner=owner, owner_color=owner_color, status=status, sort_order=i))

        # ── Scorecard 4: KPI Trends ──────────────────────────────────────────
        sc4_id = nid()
        sc4 = Scorecard(
            id=sc4_id, slug="kpi-trends", title="KPI Trends",
            subtitle="6-Month Performance Trends & Analytics",
            period="Nov 2025 – Apr 2026", status="published", accent_color="blue",
            icon="📈", display_order=3, created_by=admin.id,
        )
        db.add(sc4)

        s_trends_id = nid()
        db.add(Section(id=s_trends_id, scorecard_id=sc4_id, title="Trend Summary",
                       section_type="insight", icon="📊", accent_color="blue", display_order=0))
        for i, (heading, body, color) in enumerate([
            ("SLA Trajectory",    "Request SLA improved from 84% in November 2025 to 90%+ in April 2026. Positive 6-month trend driven by process improvements.", "green"),
            ("Review Completion", "Access review completion rates climbed steadily. Q4 2025 reviews now 95% closed. Q1 2026 at 78% with 3 weeks remaining.", "blue"),
            ("Risk Areas",        "Pending request backlog reduced but still elevated. VF-related requests remain a recurring pattern requiring permanent resolution.", "amber"),
        ]):
            db.add(InsightBlock(id=nid(), section_id=s_trends_id,
                                heading=heading, body=body, color=color, sort_order=i))

        # ── Scorecard 5: Compliance ──────────────────────────────────────────
        sc5_id = nid()
        sc5 = Scorecard(
            id=sc5_id, slug="compliance", title="Compliance",
            subtitle="UAM Regulatory & Policy Compliance Status",
            period="April 2026", status="published", accent_color="crimson",
            icon="✅", display_order=4, created_by=admin.id,
        )
        db.add(sc5)

        for label, value, sub, pct, color, order in [
            ("Policy Adherence",      "94%",  "Above 90% target",        94,  "green",   0),
            ("SOX Controls",          "100%", "All controls passing",    100,  "green",   1),
            ("Orphan Accounts",       "3",    "Under remediation",        6,   "crimson", 2),
            ("Privileged Access Cov.","88%",  "Target: 95% by Jun 2026", 88,  "amber",   3),
        ]:
            db.add(KPI(id=nid(), scorecard_id=sc5_id, label=label, value=value,
                       sub_text=sub, bar_percent=pct, color=color, sort_order=order))

        s_compliance_id = nid()
        db.add(Section(id=s_compliance_id, scorecard_id=sc5_id, title="Compliance Checklist",
                       section_type="checklist", icon="✅", accent_color="green", display_order=0))
        for i, (text, done) in enumerate([
            ("Quarterly access certification completed for all systems",    True),
            ("Privileged account reviews submitted to CISO",                True),
            ("Orphan account remediation plan approved",                    True),
            ("SOX evidence package submitted for Q1 audit",                 True),
            ("Privileged access coverage target of 95% reached",           False),
            ("New joiners' access provisioned within SLA for all of Q1",   False),
        ]):
            db.add(ChecklistItem(id=nid(), section_id=s_compliance_id, text=text, done=done, sort_order=i))

        await db.commit()
        print("✅ Database seeded with UAM Scorecard data")
