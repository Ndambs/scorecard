import pandas as pd
import numpy as np
from typing import Any


def calculate_kpi_stats(history: list[dict]) -> dict[str, Any]:
    """
    Given a list of historical KPI readings, return trend, avg, delta, chart data.
    Input: [{"period": "Jan 2026", "value": 88.5}, ...]
    """
    if not history or len(history) < 1:
        return {"trend": "stable", "delta": 0, "average": 0, "chart_data": []}

    df = pd.DataFrame(history)
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna(subset=["value"])

    if df.empty:
        return {"trend": "stable", "delta": 0, "average": 0, "chart_data": []}

    latest = float(df["value"].iloc[-1])
    prev = float(df["value"].iloc[-2]) if len(df) > 1 else latest
    avg = float(df["value"].mean().round(1))
    delta = round(latest - prev, 1)
    trend = "up" if delta > 0 else ("down" if delta < 0 else "stable")

    return {
        "latest": latest,
        "previous": prev,
        "average": avg,
        "delta": delta,
        "trend": trend,
        "chart_data": df[["period", "value"]].to_dict("records"),
    }


def parse_csv_preview(filepath: str, max_rows: int = 20) -> dict[str, Any]:
    """Parse a CSV file and return preview + column names."""
    try:
        df = pd.read_csv(filepath, nrows=max_rows)
        return {
            "columns": list(df.columns),
            "rows": df.head(max_rows).fillna("").to_dict("records"),
            "total_rows": len(df),
            "error": None,
        }
    except Exception as e:
        return {"columns": [], "rows": [], "total_rows": 0, "error": str(e)}


def parse_excel_preview(filepath: str, max_rows: int = 20) -> dict[str, Any]:
    """Parse an Excel file and return preview + column names."""
    try:
        df = pd.read_excel(filepath, nrows=max_rows)
        return {
            "columns": list(df.columns),
            "rows": df.head(max_rows).fillna("").to_dict("records"),
            "total_rows": len(df),
            "error": None,
        }
    except Exception as e:
        return {"columns": [], "rows": [], "total_rows": 0, "error": str(e)}


def calculate_completion_rate(done: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round((done / total) * 100, 1)


def determine_status_color(value: float, thresholds: dict = None) -> str:
    """
    Map a numeric value to green/amber/crimson based on thresholds.
    Default: >=80 green, >=60 amber, <60 crimson
    """
    t = thresholds or {"green": 80, "amber": 60}
    if value >= t["green"]:
        return "green"
    elif value >= t["amber"]:
        return "amber"
    return "crimson"
