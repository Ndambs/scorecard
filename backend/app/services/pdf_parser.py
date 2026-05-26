"""
backend/app/services/pdf_parser.py
MI Weekly Report PDF Parser — VG VMT-UAM OPS-APPL CON
Requires:  pdfplumber (listed in requirements.txt)
"""

from __future__ import annotations
import io
import logging
import re
import warnings
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

# Suppress pdfplumber's noisy FontBBox warnings from Power BI PDFs
logging.getLogger("pdfplumber").setLevel(logging.ERROR)
warnings.filterwarnings("ignore", message=".*FontBBox.*")

import pdfplumber  # noqa: E402  (import after suppressing warnings)


# ── Known team members (zero-filled for anyone absent from the report) ─────────
TEAM_MEMBERS = [
    {"agent_id": "benson",   "agent_name": "Benson Ndambiri"},
    {"agent_id": "malcolm",  "agent_name": "Malcolm Ondicho"},
    {"agent_id": "lebogang", "agent_name": "Lebogang Mafane"},
    {"agent_id": "felistus", "agent_name": "Felistus Mugi"},
]

# Map names as they appear in the PDF → agent_id (lowercase)
NAME_MAP = {
    "benson ndambiri":  "benson",
    "malcolm ondicho":  "malcolm",
    "lebogang mafane":  "lebogang",
    "felistus mugi":    "felistus",
}

QUEUE_LABEL = "VG VMT-UAM OPS-APPL CON"


@dataclass
class MemberData:
    agent_id:      str
    agent_name:    str
    open_sla:      int = 0
    open_breach:   int = 0
    open_blank:    int = 0
    pending:       int = 0
    closed_sla:    int = 0
    closed_breach: int = 0
    closed_blank:  int = 0


@dataclass
class ParsedReport:
    period_start:    Optional[date]
    period_end:      Optional[date]
    q_logged:        int = 0
    q_open_sla:      int = 0
    q_open_breach:   int = 0
    q_open_blank:    int = 0
    q_pending:       int = 0
    q_total_open:    int = 0
    q_closed_sla:    int = 0
    q_closed_breach: int = 0
    q_closed_blank:  int = 0
    q_total_closed:  int = 0
    q_sla_rate:      float = 0.0
    members:         list[MemberData] = field(default_factory=list)
    warnings:        list[str] = field(default_factory=list)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _ints(text: str) -> list[int]:
    """Extract all integers from a string."""
    return [int(x) for x in re.findall(r'\d+', text)]


def _float_pct(text: str) -> float:
    """Extract a percentage value like '86%' → 86.0"""
    m = re.search(r'(\d+(?:\.\d+)?)\s*%', text)
    return float(m.group(1)) if m else 0.0


def _strip_icons(line: str) -> str:
    """Remove Power BI icon / bullet Unicode characters."""
    return re.sub(r'[\uf164\uf166\ue115\ue116\ue117\u25a0\u25cf\u25e6]', '', line).strip()


def _parse_period(text: str) -> tuple[Optional[date], Optional[date]]:
    """
    Parse strings like '04TH - 10TH MAY 2026' or '4 - 10 MAY 2026'
    into (date(2026,5,4), date(2026,5,10)).
    """
    MONTHS = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5,  'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    }
    pattern = re.compile(
        r'(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*(\d{1,2})(?:st|nd|rd|th)?\s+'
        r'([a-zA-Z]+)\s+(\d{4})',
        re.IGNORECASE,
    )
    m = pattern.search(text)
    if not m:
        return None, None
    day_start, day_end, month_str, year = m.groups()
    month = MONTHS.get(month_str[:3].lower())
    if not month:
        return None, None
    y = int(year)
    return date(y, month, int(day_start)), date(y, month, int(day_end))


def _member_slot(members: dict[str, MemberData], raw_name: str) -> Optional[MemberData]:
    """Return the MemberData for a recognised agent name, or None."""
    key = raw_name.strip().lower()
    agent_id = NAME_MAP.get(key)
    return members.get(agent_id) if agent_id else None


# ── Page parsers ───────────────────────────────────────────────────────────────

def _parse_queue_totals(text: str) -> Optional[dict]:
    """
    Find the row for VG VMT-UAM OPS-APPL CON in the MI Calculation page.
    Columns: Logged | OpenSLA | OpenBreach | OpenBlank | Pending |
             TotalOpen | ClosedSLA | ClosedBreach | ClosedBlank | TotalClosed | SLARate%
    """
    for line in text.splitlines():
        if QUEUE_LABEL in line:
            nums = _ints(line)
            pct  = _float_pct(line)
            if len(nums) >= 10:
                return {
                    "q_logged":        nums[0],
                    "q_open_sla":      nums[1],
                    "q_open_breach":   nums[2],
                    "q_open_blank":    nums[3],
                    "q_pending":       nums[4],
                    "q_total_open":    nums[5],
                    "q_closed_sla":    nums[6],
                    "q_closed_breach": nums[7],
                    "q_closed_blank":  nums[8],
                    "q_total_closed":  nums[9],
                    "q_sla_rate":      pct,
                }
    return None


# Queue section terminators — any queue label that is NOT ours
_OTHER_QUEUE_PATTERNS = re.compile(
    r'OPS-(?:APPL|GH|TZ|ZA|MZ|VFCD|IT|QA|INFRA|INSIGHT|OS)|'
    r'BUSINESS ANALYSTS|Security Patching|GSD ITSM|SPV-',
    re.IGNORECASE,
)


def _is_section_end(line: str) -> bool:
    """Return True if this line starts a different queue's block."""
    if QUEUE_LABEL in line:
        return False
    return bool(_OTHER_QUEUE_PATTERNS.search(line)) or line.strip().lower().startswith("total")


def _parse_open_members(text: str, members: dict[str, MemberData]) -> None:
    """
    Open Summary page — inside the VG VMT-UAM block:
      AgentName  blank  in_sla  breached
    Columns: Blanks | Within Service Target | SLA Breached
    """
    lines = [_strip_icons(l) for l in text.splitlines()]
    in_queue = False
    for line in lines:
        if QUEUE_LABEL in line:
            in_queue = True
            continue
        if not in_queue:
            continue
        if _is_section_end(line):
            break
        nums = _ints(line)
        if not nums:
            continue
        name_part = re.sub(r'[\d\s]+$', '', line).strip()
        slot = _member_slot(members, name_part)
        if slot and len(nums) >= 3:
            slot.open_blank  = nums[0]
            slot.open_sla    = nums[1]
            slot.open_breach = nums[2]


def _parse_closed_members(text: str, members: dict[str, MemberData]) -> None:
    """
    Closed Summary page — inside the VG VMT-UAM block:
      AgentName  closed_blank  closed_sla  closed_breach  total
    """
    lines = [_strip_icons(l) for l in text.splitlines()]
    in_queue = False
    for line in lines:
        if QUEUE_LABEL in line:
            in_queue = True
            continue
        if not in_queue:
            continue
        if _is_section_end(line):
            break
        nums = _ints(line)
        if not nums:
            continue
        name_part = re.sub(r'[\d\s]+$', '', line).strip()
        slot = _member_slot(members, name_part)
        if slot and len(nums) >= 3:
            slot.closed_blank  = nums[0]
            slot.closed_sla    = nums[1]
            slot.closed_breach = nums[2]


def _parse_pending_members(text: str, members: dict[str, MemberData]) -> None:
    """
    Pending Summary page — find the VG VMT-UAM block (right column).
    Format:
      VG VMT-UAM OPS-APPL CON  2
      AgentName  N
    """
    lines = [_strip_icons(l) for l in text.splitlines()]
    found_first = False
    in_queue = False
    for line in lines:
        if QUEUE_LABEL in line:
            if not found_first:
                # Skip the first occurrence (left-column summary total)
                found_first = True
                continue
            in_queue = True
            continue
        if not in_queue:
            continue
        if line.strip().lower().startswith("total"):
            break
        nums = _ints(line)
        if not nums:
            continue
        name_part = re.sub(r'[\d\s]+$', '', line).strip()
        slot = _member_slot(members, name_part)
        if slot:
            slot.pending = nums[0]


# ── Main entry point ───────────────────────────────────────────────────────────

def parse_mi_report(pdf_bytes: bytes) -> ParsedReport:
    """
    Parse an MI Weekly Report PDF and return structured VMT-UAM data.
    Raises ValueError with a descriptive message if the file cannot be parsed.
    """
    result = ParsedReport(period_start=None, period_end=None)

    # Initialise member slots for all known agents
    members: dict[str, MemberData] = {
        t["agent_id"]: MemberData(agent_id=t["agent_id"], agent_name=t["agent_name"])
        for t in TEAM_MEMBERS
    }

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
    except Exception as exc:
        raise ValueError(f"Could not open PDF: {exc}") from exc

    if not pages:
        raise ValueError("PDF appears to be empty — no pages found.")

    # ── Period (page 1) ─────────────────────────────────────────────────
    result.period_start, result.period_end = _parse_period(pages[0])
    if not result.period_start:
        result.warnings.append("Could not parse report period from page 1.")

    # ── Queue totals (page 3 — MI Calculation) ──────────────────────────
    totals = _parse_queue_totals(pages[2]) if len(pages) > 2 else None
    if totals:
        for k, v in totals.items():
            setattr(result, k, v)
    else:
        result.warnings.append(
            f"'{QUEUE_LABEL}' row not found on page 3 (MI Calculation). "
            "Verify this PDF matches the expected MI weekly report format."
        )

    # ── Open member data (page 5 — Open Summary) ────────────────────────
    if len(pages) > 4:
        _parse_open_members(pages[4], members)
    else:
        result.warnings.append("Open Summary page (p.5) not found.")

    # ── Closed member data (page 6 — Closed Summary) ────────────────────
    if len(pages) > 5:
        _parse_closed_members(pages[5], members)
    else:
        result.warnings.append("Closed Summary page (p.6) not found.")

    # ── Pending member data (page 7 — Pending Summary) ──────────────────
    if len(pages) > 6:
        _parse_pending_members(pages[6], members)
    else:
        result.warnings.append("Pending Summary page (p.7) not found.")

    result.members = list(members.values())
    return result
