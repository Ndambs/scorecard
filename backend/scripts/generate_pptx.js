/**
 * UAM Scorecard – Executive PowerPoint Generator
 * Usage: node generate_pptx.js '<json_string>' <output_path>
 *
 * Palette: Midnight Executive
 *   Navy     1E2761  (dominant – backgrounds, headers)
 *   Ice Blue CADCFC  (secondary – accents, cards)
 *   White    FFFFFF
 *   Crimson  C0392B  (alerts, at-risk)
 *   Emerald  16A34A  (met / good)
 *   Amber    D97706  (in-progress)
 */

"use strict";
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "assets");
const A = (f) => path.join(ASSETS, f);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NAV  = "1E2761";
const ICE  = "CADCFC";
const WHT  = "FFFFFF";
const GRY  = "64748B";
const LGR  = "F1F5F9";
const EME  = "16A34A";
const AMB  = "D97706";
const CRM  = "C0392B";
const BLU  = "2563EB";
const DKGR = "1E293B";

const COLOR_MAP = { green: EME, amber: AMB, crimson: CRM, blue: BLU, red: CRM };
const STATUS_COLOR = { met: EME, on_track: EME, done: EME, active: AMB, in_progress: AMB, at_risk: CRM };
const STATUS_LABEL = { met: "✓ Met", on_track: "✓ On Track", done: "✓ Done", active: "~ Active", in_progress: "In Progress", at_risk: "✗ At Risk" };
const TREND_LABEL  = { up: "▲", down: "▼", stable: "→" };

const W = 10, H = 5.625;

function shadow() {
  return { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.10 };
}

function addSlideHeader(slide, pres, title, subtitle = "") {
  // Dark navy left sidebar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.18, h: H,
    fill: { color: CRM }, line: { color: CRM }
  });
  slide.addText(title, {
    x: 0.35, y: 0.22, w: 8, h: 0.45,
    fontSize: 20, bold: true, color: DKGR, fontFace: "Calibri",
    margin: 0
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.35, y: 0.65, w: 7, h: 0.28,
      fontSize: 11, color: GRY, fontFace: "Calibri", italic: true, margin: 0
    });
  }
  // Thin separator
  slide.addShape(pres.shapes.LINE, {
    x: 0.35, y: 0.95, w: 9.4, h: 0,
    line: { color: "E2E8F0", width: 0.75 }
  });
}

function kpiColor(color) {
  return COLOR_MAP[color] || BLU;
}

// ─── Slide builders ───────────────────────────────────────────────────────────

/** Slide 1: Cover */
function addCoverSlide(pres, sc, generatedAt) {
  const slide = pres.addSlide();

  // Full-slide branded background (grey left + red swoosh)
  slide.addImage({ path: A("cover_bg.png"), x: 0, y: -0.057, w: 13.329, h: 7.557 });

  // Africa / One Africa colourful map (right side)
  slide.addImage({ path: A("africa_map.png"), x: 5.539, y: -0.164, w: 6.483, h: 7.828 });

  // M-Pesa dual logo — mid-right of cover
  slide.addImage({ path: A("mpesa_logo.png"), x: 9.308, y: 4.403, w: 2.805, h: 0.81 });

  // "Transforming Lives"
  slide.addText("Transforming Lives", {
    x: 0.499, y: 0.75, w: 3.48, h: 0.57,
    fontSize: 20, bold: true, italic: true, color: "FFFFFF",
    fontFace: "Calibri", margin: 0
  });

  // "UAM\nMonthly Report" — large white block
  slide.addText([
    { text: "UAM", options: { breakLine: true } },
    { text: sc.title || "Monthly Report" }
  ], {
    x: 0.35, y: 2.7, w: 5.5, h: 2.0,
    fontSize: 36, bold: true, color: "FFFFFF",
    fontFace: "Calibri", align: "center", margin: 0
  });

  // Reporting period
  slide.addText(`Reporting Period: ${sc.period || generatedAt}`, {
    x: 0.8, y: 6.39, w: 6.4, h: 0.62,
    fontSize: 16, bold: true, color: "FFFFFF",
    fontFace: "Calibri", margin: 0
  });

  // "Further together" bottom-right tag
  slide.addText("Further together", {
    x: 11.545, y: 7.074, w: 1.7, h: 0.303,
    fontSize: 7, color: "FFFFFF", fontFace: "Calibri", margin: 0
  });
}

/** Add M-Pesa footer to non-cover slides */
function addMpesaFooter(slide) {
  slide.addImage({ path: A("mpesa_footer.png"), x: 0, y: 5.32, w: W, h: 0.22 });
}

/** Slide 2: KPI Summary Cards — 4-up grid */
function addKpiSummarySlide(pres, sc) {
  const slide = pres.addSlide();
  slide.background = { color: LGR };
  addSlideHeader(slide, pres, "Executive KPI Summary", `At-a-glance performance indicators · ${sc.period}`);

  const kpis = sc.kpis || [];
  const cols = Math.min(kpis.length, 4);
  const cardW = (W - 0.9) / cols - 0.18;
  const startX = 0.35;

  kpis.slice(0, 4).forEach((kpi, i) => {
    const cx = startX + i * (cardW + 0.22);
    const cy = 1.1;
    const col = kpiColor(kpi.color);

    // Card background
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cy, w: cardW, h: 3.85,
      fill: { color: WHT }, line: { color: WHT }, shadow: shadow()
    });
    // Color top bar
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cy, w: cardW, h: 0.07,
      fill: { color: col }, line: { color: col }
    });

    // KPI value — large
    slide.addText(kpi.value, {
      x: cx + 0.15, y: cy + 0.2, w: cardW - 0.3, h: 0.8,
      fontSize: 34, bold: true, color: col, fontFace: "Calibri",
      align: "center", margin: 0
    });

    // Trend arrow
    const trend = TREND_LABEL[kpi.trend] || "→";
    const trendCol = kpi.trend === "up" ? EME : kpi.trend === "down" ? CRM : AMB;
    slide.addText(trend, {
      x: cx + 0.15, y: cy + 1.0, w: cardW - 0.3, h: 0.3,
      fontSize: 16, bold: true, color: trendCol, align: "center", margin: 0
    });

    // Label
    slide.addText(kpi.label, {
      x: cx + 0.1, y: cy + 1.32, w: cardW - 0.2, h: 0.5,
      fontSize: 11, bold: true, color: DKGR, fontFace: "Calibri",
      align: "center", wrap: true, margin: 0
    });

    // Sub-text
    if (kpi.sub_text) {
      slide.addText(kpi.sub_text, {
        x: cx + 0.1, y: cy + 1.85, w: cardW - 0.2, h: 0.5,
        fontSize: 9, color: GRY, fontFace: "Calibri",
        align: "center", wrap: true, margin: 0, italic: true
      });
    }

    // Bar
    const barTrackW = cardW - 0.3;
    const barFillW  = barTrackW * Math.min((kpi.bar_percent || 0) / 100, 1);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx + 0.15, y: cy + 2.55, w: barTrackW, h: 0.1,
      fill: { color: "E2E8F0" }, line: { color: "E2E8F0" }
    });
    if (barFillW > 0.02) {
      slide.addShape(pres.shapes.RECTANGLE, {
        x: cx + 0.15, y: cy + 2.55, w: barFillW, h: 0.1,
        fill: { color: col }, line: { color: col }
      });
    }
    slide.addText(`${kpi.bar_percent || 0}%`, {
      x: cx + 0.15, y: cy + 2.72, w: cardW - 0.3, h: 0.22,
      fontSize: 9, color: GRY, align: "center", fontFace: "Calibri", margin: 0
    });
  });
}

/** Slide 3: KPI Performance — horizontal bar chart */
function addKpiPerformanceSlide(pres, sc) {
  const metricSec = (sc.sections || []).find(s => s.section_type === "metric_table");
  if (!metricSec || !metricSec.metric_rows?.length) return;

  const slide = pres.addSlide();
  slide.background = { color: WHT };
  addSlideHeader(slide, pres, "KPI Performance Overview", "Measured against target thresholds");

  const rows = metricSec.metric_rows.slice(0, 6);
  const chartData = [{
    name: "Completion",
    labels: rows.map(r => r.label),
    values: rows.map(r => r.bar_percent)
  }];

  slide.addChart(pres.charts.BAR, chartData, {
    x: 0.35, y: 1.1, w: 6.2, h: 4.2,
    barDir: "bar",
    chartColors: rows.map(r => COLOR_MAP[r.bar_color] || BLU),
    chartArea: { fill: { color: WHT } },
    catAxisLabelColor: DKGR,
    catAxisLabelFontSize: 10,
    valAxisLabelColor: GRY,
    valAxisLabelFontSize: 9,
    valAxisMaxVal: 100,
    valAxisMinVal: 0,
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
    showValue: true,
    dataLabelPosition: "outEnd",
    dataLabelColor: DKGR,
    dataLabelFontSize: 10,
    showLegend: false,
  });

  // Legend panel on right
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 6.8, y: 1.1, w: 2.9, h: rows.length * 0.6 + 0.5,
    fill: { color: LGR }, line: { color: "E2E8F0" }
  });
  slide.addText("STATUS", {
    x: 6.9, y: 1.18, w: 2.7, h: 0.28,
    fontSize: 9, bold: true, color: GRY, charSpacing: 2, margin: 0
  });

  rows.forEach((row, i) => {
    const y = 1.55 + i * 0.6;
    const sColor = STATUS_COLOR[row.status] || AMB;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 6.9, y: y, w: 0.12, h: 0.3,
      fill: { color: sColor }, line: { color: sColor }
    });
    slide.addText(`${STATUS_LABEL[row.status] || row.status}`, {
      x: 7.1, y: y + 0.01, w: 2.4, h: 0.28,
      fontSize: 10, color: DKGR, fontFace: "Calibri", margin: 0
    });
  });
}

/** Slide 4: 6-Month KPI Trend */
function addTrendSlide(pres, sc) {
  const kpisWithHistory = (sc.kpis || []).filter(k => k.history && k.history.length > 1);
  if (!kpisWithHistory.length) return;

  const slide = pres.addSlide();
  slide.background = { color: WHT };
  addSlideHeader(slide, pres, "6-Month KPI Trend", "Month-on-month performance trajectory");

  // Build chart series from KPIs that have history
  const seriesKpis = kpisWithHistory.slice(0, 3);
  const allPeriods = seriesKpis[0].history.map(h => h.period);
  const CHART_COLORS = [EME, BLU, AMB, CRM];

  const chartData = seriesKpis.map((kpi, i) => ({
    name: kpi.label,
    labels: kpi.history.map(h => h.period),
    values: kpi.history.map(h => h.value)
  }));

  slide.addChart(pres.charts.LINE, chartData, {
    x: 0.35, y: 1.1, w: 9.3, h: 4.1,
    chartColors: CHART_COLORS,
    chartArea: { fill: { color: WHT } },
    catAxisLabelColor: GRY,
    catAxisLabelFontSize: 10,
    valAxisLabelColor: GRY,
    valAxisLabelFontSize: 10,
    valAxisMaxVal: 100,
    valAxisMinVal: 50,
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
    lineSize: 2.5,
    lineSmooth: true,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 10,
    legendColor: DKGR,
    showValue: false,
    dataLabelFontSize: 9,
  });
}

/** Slide 5: Access Reviews — bar chart by team */
function addAccessReviewsSlide(pres, allScorecards) {
  const sc = allScorecards.find(s => s.slug === "access-reviews");
  if (!sc) return;

  const slide = pres.addSlide();
  slide.background = { color: WHT };
  addSlideHeader(slide, pres, "Access Reviews", `${sc.period || "Q1 2026"} · Review completion by team`);

  // KPI metric cards — top row
  const kpis = (sc.kpis || []).slice(0, 4);
  kpis.forEach((kpi, i) => {
    const cx = 0.35 + i * 2.35;
    const col = kpiColor(kpi.color);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.1, w: 2.1, h: 0.95,
      fill: { color: LGR }, line: { color: "E2E8F0" }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.1, w: 0.08, h: 0.95,
      fill: { color: col }, line: { color: col }
    });
    slide.addText(kpi.value, {
      x: cx + 0.18, y: 1.14, w: 1.85, h: 0.4,
      fontSize: 20, bold: true, color: col, fontFace: "Calibri", margin: 0
    });
    slide.addText(kpi.label, {
      x: cx + 0.18, y: 1.56, w: 1.85, h: 0.38,
      fontSize: 9, color: DKGR, fontFace: "Calibri", wrap: true, margin: 0
    });
  });

  // Team completion bar chart
  const metricSec = (sc.sections || []).find(s => s.section_type === "metric_table");
  if (metricSec?.metric_rows?.length) {
    const rows = metricSec.metric_rows.slice(0, 6);
    slide.addChart(pres.charts.BAR, [{
      name: "Review Completion %",
      labels: rows.map(r => r.label),
      values: rows.map(r => r.bar_percent)
    }], {
      x: 0.35, y: 2.2, w: 9.3, h: 3.1,
      barDir: "bar",
      chartColors: rows.map(r => COLOR_MAP[r.bar_color] || BLU),
      chartArea: { fill: { color: WHT } },
      catAxisLabelColor: DKGR, catAxisLabelFontSize: 10,
      valAxisLabelColor: GRY, valAxisLabelFontSize: 9,
      valAxisMaxVal: 100, valAxisMinVal: 0,
      valGridLine: { color: "E2E8F0", size: 0.5 },
      catGridLine: { style: "none" },
      showValue: true,
      dataLabelPosition: "outEnd",
      dataLabelColor: DKGR, dataLabelFontSize: 10,
      showLegend: false,
    });
  }
}

/** Slide 6: SR Tracker */
function addSrTrackerSlide(pres, allScorecards) {
  const sc = allScorecards.find(s => s.slug === "sr-tracker");
  if (!sc) return;

  const slide = pres.addSlide();
  slide.background = { color: LGR };
  addSlideHeader(slide, pres, "Service Request Tracker", `${sc.period || "April 2026"} · SLA monitoring & closure status`);

  // Top 4 KPI cards
  const kpis = (sc.kpis || []).slice(0, 4);
  kpis.forEach((kpi, i) => {
    const cx = 0.35 + i * 2.35;
    const col = kpiColor(kpi.color);
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.1, w: 2.1, h: 1.15,
      fill: { color: WHT }, line: { color: WHT }, shadow: shadow()
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.1, w: 2.1, h: 0.07,
      fill: { color: col }, line: { color: col }
    });
    slide.addText(kpi.value, {
      x: cx + 0.08, y: 1.2, w: 1.95, h: 0.48,
      fontSize: 24, bold: true, color: col, align: "center", fontFace: "Calibri", margin: 0
    });
    slide.addText(kpi.label, {
      x: cx + 0.08, y: 1.68, w: 1.95, h: 0.45,
      fontSize: 9, bold: true, color: DKGR, align: "center", wrap: true, margin: 0
    });
  });

  // Open SRs table
  const actionSec = (sc.sections || []).find(s => s.section_type === "action_table");
  const actions = actionSec?.action_items || [];

  if (actions.length) {
    const headerRow = [
      { text: "Open Service Request", options: { bold: true, color: WHT, fill: { color: NAV }, fontSize: 10 } },
      { text: "Owner", options: { bold: true, color: WHT, fill: { color: NAV }, fontSize: 10 } },
      { text: "Status", options: { bold: true, color: WHT, fill: { color: NAV }, fontSize: 10 } }
    ];
    const rows = [headerRow, ...actions.slice(0, 4).map(a => {
      const sCol = STATUS_COLOR[a.status] || AMB;
      return [
        { text: a.action_text, options: { fontSize: 9, color: DKGR, margin: [3, 5, 3, 5] } },
        { text: a.owner || "—", options: { fontSize: 9, color: GRY, align: "center" } },
        { text: STATUS_LABEL[a.status] || a.status, options: { fontSize: 9, bold: true, color: sCol, align: "center" } }
      ];
    })];

    slide.addTable(rows, {
      x: 0.35, y: 2.45, w: 9.3, h: rows.length * 0.52,
      colW: [6.0, 1.5, 1.8],
      border: { pt: 0.5, color: "E2E8F0" },
      autoPage: false,
      fill: { color: WHT },
      rowH: 0.42,
    });
  }
}

/** Slide 7: Compliance */
function addComplianceSlide(pres, allScorecards) {
  const sc = allScorecards.find(s => s.slug === "compliance");
  if (!sc) return;

  const slide = pres.addSlide();
  slide.background = { color: WHT };
  addSlideHeader(slide, pres, "Compliance & Policy Status", `${sc.period || "April 2026"} · Regulatory adherence overview`);

  // 4 KPI cards in a 2x2 grid
  const kpis = (sc.kpis || []).slice(0, 4);
  const grid = [[0, 1], [2, 3]];
  grid.forEach((row, ri) => {
    row.forEach((ki, ci) => {
      const kpi = kpis[ki];
      if (!kpi) return;
      const cx = 0.35 + ci * 4.8;
      const cy = 1.1 + ri * 1.4;
      const col = kpiColor(kpi.color);

      slide.addShape(pres.shapes.RECTANGLE, {
        x: cx, y: cy, w: 4.5, h: 1.2,
        fill: { color: LGR }, line: { color: "E2E8F0" }
      });
      slide.addShape(pres.shapes.RECTANGLE, {
        x: cx, y: cy, w: 0.09, h: 1.2,
        fill: { color: col }, line: { color: col }
      });
      slide.addText(kpi.value, {
        x: cx + 0.22, y: cy + 0.1, w: 1.3, h: 0.55,
        fontSize: 26, bold: true, color: col, fontFace: "Calibri", margin: 0
      });
      slide.addText(kpi.label, {
        x: cx + 0.22, y: cy + 0.64, w: 4.1, h: 0.32,
        fontSize: 10, bold: true, color: DKGR, fontFace: "Calibri", margin: 0
      });
      if (kpi.sub_text) {
        slide.addText(kpi.sub_text, {
          x: cx + 0.22, y: cy + 0.88, w: 4.1, h: 0.25,
          fontSize: 9, color: GRY, italic: true, fontFace: "Calibri", margin: 0
        });
      }
    });
  });

  // Compliance checklist (right side summary)
  const checkSec = (sc.sections || []).find(s => s.section_type === "checklist");
  if (checkSec?.checklist_items?.length) {
    const items = checkSec.checklist_items.slice(0, 6);
    const doneCount = items.filter(i => i.done).length;

    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.35, y: 3.85, w: 9.3, h: 1.5,
      fill: { color: LGR }, line: { color: "E2E8F0" }
    });
    slide.addText(`Compliance Checklist  —  ${doneCount}/${items.length} items complete`, {
      x: 0.5, y: 3.93, w: 8, h: 0.28,
      fontSize: 11, bold: true, color: DKGR, fontFace: "Calibri", margin: 0
    });

    const leftItems = items.slice(0, 3);
    const rightItems = items.slice(3, 6);
    [leftItems, rightItems].forEach((col, ci) => {
      col.forEach((item, ii) => {
        const cx = 0.5 + ci * 4.7;
        const cy = 4.28 + ii * 0.34;
        const icon = item.done ? "✓" : "○";
        const icCol = item.done ? EME : AMB;
        slide.addText(icon, {
          x: cx, y: cy, w: 0.25, h: 0.28,
          fontSize: 10, bold: true, color: icCol, margin: 0
        });
        slide.addText(item.text, {
          x: cx + 0.28, y: cy, w: 4.2, h: 0.28,
          fontSize: 9, color: item.done ? GRY : DKGR,
          fontFace: "Calibri", margin: 0, wrap: true
        });
      });
    });
  }
}

/** Slide 8: Key Insights — 3-column coloured blocks */
function addInsightsSlide(pres, sc) {
  const insightSec = (sc.sections || []).find(s => s.section_type === "insight");
  if (!insightSec?.insight_blocks?.length) return;

  const slide = pres.addSlide();
  slide.background = { color: LGR };
  addSlideHeader(slide, pres, "Key Insights", "Operational narrative · What happened and what's next");

  const blocks = insightSec.insight_blocks.slice(0, 3);
  const colW = (W - 0.7) / blocks.length - 0.2;
  const BLOCK_COLORS = { crimson: CRM, blue: BLU, amber: AMB, green: EME };

  blocks.forEach((block, i) => {
    const cx = 0.35 + i * (colW + 0.22);
    const col = BLOCK_COLORS[block.color] || BLU;

    // White card
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.1, w: colW, h: 4.2,
      fill: { color: WHT }, line: { color: WHT }, shadow: shadow()
    });
    // Colour header band
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: 1.1, w: colW, h: 0.55,
      fill: { color: col }, line: { color: col }
    });
    slide.addText(block.heading.toUpperCase(), {
      x: cx + 0.12, y: 1.15, w: colW - 0.24, h: 0.42,
      fontSize: 10, bold: true, color: WHT, fontFace: "Calibri",
      charSpacing: 1, valign: "middle", margin: 0
    });
    slide.addText(block.body, {
      x: cx + 0.14, y: 1.75, w: colW - 0.28, h: 3.42,
      fontSize: 10.5, color: DKGR, fontFace: "Calibri",
      wrap: true, valign: "top", margin: 0
    });
  });
}

/** Slide 9: Action Items / Key Asks */
function addActionSlide(pres, sc) {
  const actionSec = (sc.sections || []).find(s => s.section_type === "action_table");
  if (!actionSec?.action_items?.length) return;

  const slide = pres.addSlide();
  slide.background = { color: WHT };
  addSlideHeader(slide, pres, "Key Actions & Market Asks", "Accountability tracker · Owners and status");

  const items = actionSec.action_items.slice(0, 6);
  const headerRow = [
    { text: "#", options: { bold: true, color: WHT, fill: { color: NAV }, fontSize: 10, align: "center" } },
    { text: "Action / Ask", options: { bold: true, color: WHT, fill: { color: NAV }, fontSize: 10 } },
    { text: "Owner", options: { bold: true, color: WHT, fill: { color: NAV }, fontSize: 10 } },
    { text: "Status", options: { bold: true, color: WHT, fill: { color: NAV }, fontSize: 10, align: "center" } }
  ];

  const dataRows = items.map((item, i) => {
    const sCol = STATUS_COLOR[item.status] || AMB;
    const rowFill = i % 2 === 0 ? WHT : LGR;
    return [
      { text: String(i + 1), options: { fontSize: 10, color: GRY, align: "center", fill: { color: rowFill } } },
      { text: item.action_text, options: { fontSize: 10, color: DKGR, fill: { color: rowFill }, margin: [3, 5, 3, 5] } },
      { text: item.owner || "—", options: { fontSize: 10, color: GRY, fill: { color: rowFill }, align: "center" } },
      { text: STATUS_LABEL[item.status] || item.status, options: { fontSize: 10, bold: true, color: sCol, fill: { color: rowFill }, align: "center" } }
    ];
  });

  slide.addTable([headerRow, ...dataRows], {
    x: 0.35, y: 1.1, w: 9.3,
    colW: [0.4, 5.7, 1.5, 1.7],
    border: { pt: 0.5, color: "E2E8F0" },
    rowH: 0.56,
  });
}

/** Slide 10: Focus Areas + Closing */
function addClosingSlide(pres, sc) {
  const focusSec = (sc.sections || []).find(s => s.section_type === "focus_list");
  const slide = pres.addSlide();
  slide.background = { color: NAV };

  // Left accent
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.55, h: H,
    fill: { color: CRM }, line: { color: CRM }
  });

  // Left panel: Focus Areas
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.72, y: 0.3, w: 5.3, h: 5.0,
    fill: { color: "162347" }, line: { color: "162347" }
  });
  slide.addText("FOCUS AREAS", {
    x: 0.88, y: 0.45, w: 5, h: 0.35,
    fontSize: 11, bold: true, color: CRM, charSpacing: 3,
    fontFace: "Calibri", margin: 0
  });

  const focuses = focusSec?.focus_items || [];
  focuses.slice(0, 5).forEach((item, i) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.88, y: 0.95 + i * 0.77, w: 0.06, h: 0.38,
      fill: { color: CRM }, line: { color: CRM }
    });
    slide.addText(item.text, {
      x: 1.04, y: 0.95 + i * 0.77, w: 4.8, h: 0.55,
      fontSize: 11, color: ICE, fontFace: "Calibri", wrap: true, margin: 0
    });
  });

  // Right panel: Closing
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 6.22, y: 0.3, w: 3.45, h: 5.0,
    fill: { color: WHT }, line: { color: WHT }
  });
  slide.addText("NEXT STEPS", {
    x: 6.38, y: 0.55, w: 3.1, h: 0.32,
    fontSize: 10, bold: true, color: CRM, charSpacing: 3,
    fontFace: "Calibri", margin: 0
  });
  slide.addText([
    { text: "Review highlighted KPIs with team leads", options: { breakLine: true } },
    { text: " ", options: { breakLine: true } },
    { text: "Escalate IT Security access review", options: { breakLine: true } },
    { text: " ", options: { breakLine: true } },
    { text: "Fast-track VF login resolution", options: { breakLine: true } },
    { text: " ", options: { breakLine: true } },
    { text: "Monitor Q1 user review closures weekly", options: {} },
  ].map((r, i) => ({ text: r.text, options: { ...r.options, bullet: r.text.trim() ? true : false } })), {
    x: 6.38, y: 1.0, w: 3.1, h: 3.2,
    fontSize: 10.5, color: DKGR, fontFace: "Calibri", margin: 0
  });

  // Bottom signature line
  slide.addText(`UAM Operations · ${sc.period || "April 2026"} · Confidential`, {
    x: 0.72, y: 5.28, w: 8.95, h: 0.22,
    fontSize: 8, color: "7B91B5", align: "center", fontFace: "Calibri", margin: 0
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const jsonArg   = process.argv[2];
  const outPath   = process.argv[3] || "scorecard_report.pptx";

  if (!jsonArg) {
    console.error("Usage: node generate_pptx.js <json_file_or_string> <output_path>");
    process.exit(1);
  }

  let payload;
  try {
    // Accept either a file path or raw JSON string
    if (require("fs").existsSync(jsonArg)) {
      payload = JSON.parse(require("fs").readFileSync(jsonArg, "utf8"));
    } else {
      payload = JSON.parse(jsonArg);
    }
  } catch (e) {
    console.error("Invalid JSON or file not found:", e.message);
    process.exit(1);
  }

  const allScorecards = payload.scorecards || [];
  const mainSc        = allScorecards.find(s => s.slug === "uam-scorecard") || allScorecards[0];
  if (!mainSc) { console.error("No scorecard data"); process.exit(1); }

  const generatedAt = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric"
  });

  const pres = new pptxgen();
  pres.layout  = "LAYOUT_WIDE";
  pres.author  = "UAM Operations";
  pres.title   = `${mainSc.title} – ${mainSc.period}`;
  pres.subject = "Senior Leadership Report";

  // Build all slides
  addCoverSlide        (pres, mainSc, generatedAt);
  addKpiSummarySlide   (pres, mainSc);
  addKpiPerformanceSlide(pres, mainSc);
  addTrendSlide        (pres, mainSc);
  addAccessReviewsSlide(pres, allScorecards);
  addSrTrackerSlide    (pres, allScorecards);
  addComplianceSlide   (pres, allScorecards);
  addInsightsSlide     (pres, mainSc);
  addActionSlide       (pres, mainSc);
  addClosingSlide      (pres, mainSc);

  await pres.writeFile({ fileName: outPath });
  console.log(`OK:${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
