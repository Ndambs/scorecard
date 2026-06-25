"""
VG VMT-UAM OPS-APPL CON — Service Layer
Drop this file into: backend/app/services/vmt_uam_service.py

Zero external API calls. All analytics and report generation runs locally.
"""

from __future__ import annotations
from datetime import date
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from ..models.vmt_uam import VmtUamReport, VmtUamMemberStat
from ..schemas.vmt_uam import (
    ReportCreate, ReportUpdate, ReportOut, ReportListItem,
    AnalyticsSummary, WeeklyTrendPoint, GeneratedReport, MemberStatOut,
)


# ---------------------------------------------------------------------------
# Analytics helpers (pure functions — no DB, no external calls)
# ---------------------------------------------------------------------------

def _safe_pct(numerator: int, denominator: int) -> float:
    return round((numerator / denominator) * 100, 1) if denominator else 0.0


def _compute_queue_analytics(rep: VmtUamReport) -> dict:
    tc  = rep.q_total_closed or 1
    top = rep.q_total_open  or 1
    log = rep.q_logged      or 1

    res_eff      = _safe_pct(rep.q_closed_sla, tc)
    throughput   = _safe_pct(rep.q_total_closed, log)
    breach_rate  = _safe_pct(rep.q_closed_breach, tc)
    pend_share   = _safe_pct(rep.q_pending, top)
    open_br_rate = _safe_pct(rep.q_open_breach, top)

    # Backlog health score (0–100, higher = healthier queue)
    # Weighted composite: SLA rate 40%, no open breaches 20%,
    # throughput 25%, low pending share 15%
    health = (
        (rep.q_sla_rate          * 0.40) +
        ((100 - open_br_rate)    * 0.20) +
        (min(throughput, 100)    * 0.25) +
        ((100 - pend_share)      * 0.15)
    )
    return {
        "resolution_efficiency": res_eff,
        "throughput_ratio":      throughput,
        "breach_rate_closed":    breach_rate,
        "pending_share":         pend_share,
        "open_breach_rate":      open_br_rate,
        "backlog_health_score":  round(health, 1),
    }


def _compute_member_analytics(m: VmtUamMemberStat) -> dict:
    total_closed = (m.closed_sla or 0) + (m.closed_breach or 0)
    total_open   = (m.open_sla  or 0) + (m.open_breach  or 0)
    agent_sla    = _safe_pct(m.closed_sla or 0, total_closed or 1)
    # Productivity = normalised blend of SLA adherence and absence of open breaches
    prod = round(
        (agent_sla * 0.7) + ((0 if m.open_breach else 100) * 0.3),
        1
    )
    return {
        "total_closed":       total_closed,
        "total_open":         total_open,
        "agent_sla_rate":     agent_sla,
        "productivity_score": prod,
    }


# ---------------------------------------------------------------------------
# Report text generator (no LLM required — fully local)
# ---------------------------------------------------------------------------

AGENTS = {
    "benson":   "Benson Ndambiri",
    "malcolm":  "Malcolm Ondicho",
    "lebogang": "Lebogang Mafane",
    "felistus": "Felistus Mugi",
}

def generate_report_text(report: VmtUamReport) -> GeneratedReport:
    q   = report
    tc  = q.q_total_closed or 0
    log = q.q_logged       or 0
    pct = lambda n, d: round((n / d) * 100) if d else 0

    # ── Period label ──────────────────────────────────────────────────────
    ps  = q.period_start.strftime("%d %b %Y")
    pe  = q.period_end.strftime("%d %b %Y")
    period_label = f"{ps} to {pe}"

    # ── Health label ──────────────────────────────────────────────────────
    hs = q.backlog_health_score
    health_label = (
        "Excellent" if hs >= 90 else
        "Good"      if hs >= 75 else
        "Fair"      if hs >= 60 else
        "Poor"
    )

    # ── Executive summary ─────────────────────────────────────────────────
    sla_verdict = (
        f"exceeding the 90% operational target ({q.q_sla_rate}% achieved)"
        if q.q_sla_rate >= 90
        else f"below the 90% operational target at {q.q_sla_rate}%"
    )
    exec_summary = (
        f"The VG VMT-UAM OPS-APPL CON queue reported {log} logged ticket(s) "
        f"and {tc} closure(s) for the period {period_label}, reflecting a "
        f"throughput ratio of {q.throughput_ratio:.0f}%. "
        f"The SLA clear-up rate of {q.q_sla_rate}% is {sla_verdict}. "
        f"Overall backlog health is rated {health_label} "
        f"(score: {hs:.0f}/100)."
    )

    # ── Volume & throughput ───────────────────────────────────────────────
    backlog_direction = (
        "actively reducing its backlog" if tc > log
        else "maintaining steady throughput" if tc == log
        else "accumulating a small backlog"
    )
    volume = (
        f"{log} ticket(s) were logged this period and {tc} were closed, "
        f"meaning the queue is {backlog_direction}. "
        f"{q.q_total_open} ticket(s) remain open (including {q.q_pending} in "
        f"pending status) going into the next reporting cycle."
    )

    # ── SLA performance ───────────────────────────────────────────────────
    breach_line = (
        f"{q.q_closed_breach} closure(s) breached SLA, representing "
        f"{q.breach_rate_closed:.0f}% of all closures this week."
        if q.q_closed_breach > 0
        else "All closures this period were completed within SLA — no breaches recorded on closed tickets."
    )
    open_breach_line = (
        f" Additionally, {q.q_open_breach} open ticket(s) have already exceeded "
        f"their SLA target and require immediate escalation."
        if q.q_open_breach > 0
        else " There are no open tickets currently in SLA breach."
    )
    sla_text = (
        f"The resolution efficiency stands at {q.resolution_efficiency:.0f}% "
        f"(closed-in-SLA ÷ total-closed). {breach_line}{open_breach_line}"
    )

    # ── Member activity ───────────────────────────────────────────────────
    active, inactive, top_agent, top_closed = [], [], None, -1
    for m in (report.members or []):
        tc_m = (m.closed_sla or 0) + (m.closed_breach or 0)
        has_any = tc_m > 0 or (m.open_sla or 0) > 0 or (m.pending or 0) > 0
        if has_any:
            active.append(m.agent_name)
            if tc_m > top_closed:
                top_closed, top_agent = tc_m, m.agent_name
        else:
            inactive.append(m.agent_name)

    member_lines = []
    for m in (report.members or []):
        tc_m = (m.closed_sla or 0) + (m.closed_breach or 0)
        member_lines.append(
            f"  • {m.agent_name}: {tc_m} closed "
            f"({m.closed_sla} in SLA, {m.closed_breach} breached), "
            f"{(m.open_sla or 0) + (m.open_breach or 0)} open, "
            f"{m.pending or 0} pending — SLA rate {m.agent_sla_rate:.0f}%"
        )

    top_line = f" Top performer this week: {top_agent} ({top_closed} closures)." if top_agent else ""
    inactive_line = (
        f" {', '.join(inactive)} recorded no ticket activity this period; "
        f"confirm availability and assignment status."
        if inactive else ""
    )
    member_text = (
        f"{len(active)} of 4 team members recorded ticket activity.{top_line}"
        f"{inactive_line}\n\n" + "\n".join(member_lines)
    )

    # ── Backlog & risk ────────────────────────────────────────────────────
    pend_risk = (
        "Pending tickets represent a high proportion of the open backlog. "
        "These should be reviewed for stall risk before the next reporting period."
        if q.pending_share > 50
        else "Pending ticket volume is within acceptable limits."
    )
    risk_text = (
        f"{q.q_total_open} open ticket(s) carry into the next period "
        f"({q.q_open_sla} in SLA, {q.q_open_breach} in breach, "
        f"{q.q_pending} pending, {q.q_open_blank} unclassified). "
        f"{pend_risk}"
    )

    # ── Recommendations ───────────────────────────────────────────────────
    recs: List[str] = []

    if q.q_sla_rate < 90:
        recs.append(
            f"SLA clear-up rate is {q.q_sla_rate}% — below the 90% target. "
            f"Conduct a root-cause review on the {q.q_closed_breach} breached "
            f"closure(s) and implement corrective actions before next cycle."
        )

    if q.q_open_breach > 0:
        recs.append(
            f"Escalate the {q.q_open_breach} open SLA-breached ticket(s) immediately. "
            f"Assign a resolution owner and set a hard closure deadline."
        )

    if inactive:
        recs.append(
            f"Confirm availability and role assignments for {', '.join(inactive)}, "
            f"who had zero activity this period. Reallocate tickets if necessary."
        )

    if q.q_pending > 5:
        recs.append(
            f"{q.q_pending} tickets are in pending status. Set an SLA on pending "
            f"resolution time to prevent this from becoming a silent backlog."
        )

    if not recs:
        recs.append(
            "Maintain current performance standards. Continue monitoring SLA "
            "adherence weekly and flag any emerging breach risks early."
        )

    # Cap to 3 recommendations
    recs = recs[:3]

    return GeneratedReport(
        period_label=period_label,
        executive_summary=exec_summary,
        volume_analysis=volume,
        sla_analysis=sla_text,
        member_activity=member_text,
        backlog_risk=risk_text,
        recommendations=recs,
        health_score=hs,
        health_label=health_label,
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

async def create_report(db: AsyncSession, payload: ReportCreate) -> VmtUamReport:
    rep = VmtUamReport(
        period_start=payload.period_start,
        period_end=payload.period_end,
        notes=payload.notes or "",
        created_by=payload.created_by or "editor",
        q_logged=payload.q_logged,
        q_open_sla=payload.q_open_sla,
        q_open_breach=payload.q_open_breach,
        q_open_blank=payload.q_open_blank,
        q_pending=payload.q_pending,
        q_total_open=payload.q_total_open,
        q_closed_sla=payload.q_closed_sla,
        q_closed_breach=payload.q_closed_breach,
        q_closed_blank=payload.q_closed_blank,
        q_total_closed=payload.q_total_closed,
        q_sla_rate=payload.q_sla_rate,
    )
    db.add(rep)
    await db.flush()

    for m_in in payload.members:
        m = VmtUamMemberStat(report_id=rep.id, **m_in.model_dump())
        derived = _compute_member_analytics(m)
        for k, v in derived.items():
            setattr(m, k, v)
        db.add(m)

    await db.flush()
    analytics = _compute_queue_analytics(rep)
    for k, v in analytics.items():
        setattr(rep, k, v)

    await db.commit()
    # Re-fetch with members eagerly loaded (selectinload) instead of a plain
    # db.refresh(): refresh() only reloads the report's own columns, so a later
    # access to rep.members would trigger a lazy load outside of an awaited
    # context and raise MissingGreenlet. Eager-loading here keeps the
    # relationship populated for response serialization.
    return await get_report(db, rep.id)


async def get_report(db: AsyncSession, report_id: int) -> Optional[VmtUamReport]:
    result = await db.execute(
        select(VmtUamReport)
        .options(selectinload(VmtUamReport.members))
        .where(VmtUamReport.id == report_id)
    )
    return result.scalars().first()


async def list_reports(db: AsyncSession, limit: int = 52) -> List[VmtUamReport]:
    result = await db.execute(
        select(VmtUamReport)
        .order_by(VmtUamReport.period_start.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def update_report(
    db: AsyncSession, report_id: int, payload: ReportUpdate
) -> Optional[VmtUamReport]:
    rep = await get_report(db, report_id)
    if not rep:
        return None

    for field, value in payload.model_dump(exclude_unset=True, exclude={"members"}).items():
        setattr(rep, field, value)

    if payload.members is not None:
        existing = await db.execute(
            select(VmtUamMemberStat).where(VmtUamMemberStat.report_id == report_id)
        )
        for old in existing.scalars().all():
            await db.delete(old)
        for m_in in payload.members:
            m = VmtUamMemberStat(report_id=rep.id, **m_in.model_dump())
            derived = _compute_member_analytics(m)
            for k, v in derived.items():
                setattr(m, k, v)
            db.add(m)

    await db.flush()
    analytics = _compute_queue_analytics(rep)
    for k, v in analytics.items():
        setattr(rep, k, v)

    await db.commit()
    return await get_report(db, rep.id)


async def clone_report(db: AsyncSession, source_id: int, new_start: date, new_end: date) -> Optional[VmtUamReport]:
    """Copy a previous report as a starting point for a new period."""
    source = await get_report(db, source_id)
    if not source:
        return None

    # Build create payload from source
    member_data = [
        {
            "agent_id": m.agent_id, "agent_name": m.agent_name,
            "open_sla": 0, "open_breach": 0, "open_blank": 0, "pending": 0,
            "closed_sla": 0, "closed_breach": 0, "closed_blank": 0,
        }
        for m in source.members
    ]
    payload = ReportCreate(
        period_start=new_start,
        period_end=new_end,
        notes=f"Copied from {source.period_start} – {source.period_end}",
        created_by="editor",
        q_logged=0, q_open_sla=source.q_open_sla,
        q_open_breach=source.q_open_breach, q_open_blank=source.q_open_blank,
        q_pending=source.q_pending, q_total_open=source.q_total_open,
        q_closed_sla=0, q_closed_breach=0, q_closed_blank=0,
        q_total_closed=0, q_sla_rate=0.0,
        members=[],
    )
    return await create_report(db, payload)


async def publish_report(db: AsyncSession, report_id: int) -> Optional[VmtUamReport]:
    rep = await get_report(db, report_id)
    if rep:
        rep.is_published = True
        await db.commit()
        rep = await get_report(db, report_id)
    return rep


async def delete_report(db: AsyncSession, report_id: int) -> bool:
    """Permanently remove a report and its member stats (used by 'Clear logs')."""
    rep = await get_report(db, report_id)
    if not rep:
        return False
    await db.delete(rep)
    await db.commit()
    return True


async def delete_reports(db: AsyncSession, report_ids: List[int]) -> int:
    """Bulk-delete reports by id. Returns the number actually deleted."""
    deleted = 0
    for rid in report_ids:
        if await delete_report(db, rid):
            deleted += 1
    return deleted


async def list_reports_in_range(
    db: AsyncSession, start: Optional[date] = None, end: Optional[date] = None
) -> List[VmtUamReport]:
    """Fetch reports (with members eagerly loaded) for export, optionally
    filtered to a period range. Used by the Excel export endpoint."""
    q = select(VmtUamReport).options(selectinload(VmtUamReport.members))
    if start:
        q = q.where(VmtUamReport.period_start >= start)
    if end:
        q = q.where(VmtUamReport.period_end <= end)
    q = q.order_by(VmtUamReport.period_start.asc())
    result = await db.execute(q)
    return result.scalars().all()


async def get_analytics(db: AsyncSession, limit: int = 12) -> AnalyticsSummary:
    reports = await list_reports(db, limit=limit)
    if not reports:
        return AnalyticsSummary(
            total_reports=0, avg_sla_rate=0, avg_resolution_efficiency=0,
            avg_throughput_ratio=0, best_sla_week=None, worst_sla_week=None,
            trend=[], sla_target_met_count=0, sla_target_miss_count=0,
        )

    sla_rates = [r.q_sla_rate for r in reports]
    trend = [
        WeeklyTrendPoint(
            period_start=r.period_start,
            period_end=r.period_end,
            q_total_closed=r.q_total_closed,
            q_total_open=r.q_total_open,
            q_sla_rate=r.q_sla_rate,
            resolution_efficiency=r.resolution_efficiency,
            throughput_ratio=r.throughput_ratio,
            backlog_health_score=r.backlog_health_score,
        )
        for r in reversed(reports)
    ]
    best  = max(reports, key=lambda r: r.q_sla_rate)
    worst = min(reports, key=lambda r: r.q_sla_rate)

    return AnalyticsSummary(
        total_reports=len(reports),
        avg_sla_rate=round(sum(sla_rates) / len(sla_rates), 1),
        avg_resolution_efficiency=round(
            sum(r.resolution_efficiency for r in reports) / len(reports), 1
        ),
        avg_throughput_ratio=round(
            sum(r.throughput_ratio for r in reports) / len(reports), 1
        ),
        best_sla_week=best.period_start,
        worst_sla_week=worst.period_start,
        trend=trend,
        sla_target_met_count=sum(1 for r in reports if r.q_sla_rate >= 90),
        sla_target_miss_count=sum(1 for r in reports if r.q_sla_rate < 90),
    )


# ---------------------------------------------------------------------------
# Excel export ("Clear logs" / export tooling on the History page)
# ---------------------------------------------------------------------------

def build_excel_export(reports: List[VmtUamReport]) -> bytes:
    """Builds an .xlsx workbook (Weekly Summary + Member Stats sheets) for the
    given list of reports. Returns the raw file bytes."""
    import io
    import pandas as pd

    summary_rows = []
    member_rows = []

    for r in reports:
        summary_rows.append({
            "Period start": r.period_start,
            "Period end": r.period_end,
            "Status": "Published" if r.is_published else "Draft",
            "Logged": r.q_logged,
            "Open (SLA)": r.q_open_sla,
            "Open (breach)": r.q_open_breach,
            "Open (blank)": r.q_open_blank,
            "Pending": r.q_pending,
            "Total open": r.q_total_open,
            "Closed (SLA)": r.q_closed_sla,
            "Closed (breach)": r.q_closed_breach,
            "Closed (blank)": r.q_closed_blank,
            "Total closed": r.q_total_closed,
            "SLA rate (%)": r.q_sla_rate,
            "Resolution efficiency (%)": r.resolution_efficiency,
            "Throughput ratio (%)": r.throughput_ratio,
            "Breach rate closed (%)": r.breach_rate_closed,
            "Pending share (%)": r.pending_share,
            "Open breach rate (%)": r.open_breach_rate,
            "Backlog health score": r.backlog_health_score,
            "Notes": r.notes,
            "Created by": r.created_by,
            "Created at": r.created_at,
        })
        for m in (r.members or []):
            member_rows.append({
                "Period start": r.period_start,
                "Period end": r.period_end,
                "Agent": m.agent_name,
                "Open (SLA)": m.open_sla,
                "Open (breach)": m.open_breach,
                "Open (blank)": m.open_blank,
                "Pending": m.pending,
                "Closed (SLA)": m.closed_sla,
                "Closed (breach)": m.closed_breach,
                "Closed (blank)": m.closed_blank,
                "Total closed": m.total_closed,
                "Total open": m.total_open,
                "Agent SLA rate (%)": m.agent_sla_rate,
                "Productivity score": m.productivity_score,
            })

    summary_df = pd.DataFrame(summary_rows)
    member_df = pd.DataFrame(member_rows)

    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        (summary_df if not summary_df.empty else pd.DataFrame(
            columns=["Period start", "Period end"]
        )).to_excel(writer, index=False, sheet_name="Weekly Summary")
        (member_df if not member_df.empty else pd.DataFrame(
            columns=["Period start", "Period end", "Agent"]
        )).to_excel(writer, index=False, sheet_name="Member Stats")

        for sheet_name, df in (("Weekly Summary", summary_df), ("Member Stats", member_df)):
            ws = writer.sheets[sheet_name]
            cols = df.columns if not df.empty else ws[1]
            for i, col in enumerate(cols, start=1):
                header = col if isinstance(col, str) else str(col.value or "")
                width = max(12, min(32, len(header) + 4))
                ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = width

    buf.seek(0)
    return buf.read()
