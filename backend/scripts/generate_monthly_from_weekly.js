/**
 * UAM Monthly Report (from Weeklies) – PowerPoint Generator
 * Aggregates multiple weekly reports into one detailed monthly PPTX.
 *
 * Usage: node generate_monthly_from_weekly.js <json_file> <output_pptx>
 * JSON structure: { period, weeks: [WeeklyReport, ...] }
 */
"use strict";
const pptxgen = require("pptxgenjs");
const path    = require("path");
const fs      = require("fs");

const ASSETS   = path.join(__dirname, "assets");
const A        = (f) => path.join(ASSETS, f);
const hasAsset = (f) => fs.existsSync(A(f));

const GRN="1D8348",RED="C0392B",BLK="1A1A1A",GRY="555555",WHT="FFFFFF",
      LGR="F4F4F4",NAV="1E2761",AMB="D97706",EME="16A34A",BLU="2563EB",CRM="C0392B";
const W=13.333, H=7.5;

// ── shared helpers ────────────────────────────────────────────────────────────

function shadow(){ return {type:"outer",color:"000000",blur:6,offset:2,angle:135,opacity:0.08}; }

function addMpesaFooter(slide){
  if(hasAsset("mpesa_footer.png")){
    slide.addImage({path:A("mpesa_footer.png"),x:0,y:6.85,w:W,h:0.52});
  } else {
    slide.addShape("rect",{x:0,y:6.85,w:W,h:0.52,fill:{color:"F8F8F8"},line:{color:"E0E0E0"}});
    slide.addText("m-pesa  |  UAM Operations",{x:9.5,y:6.9,w:3.5,h:0.35,fontSize:9,color:GRN,fontFace:"Calibri",align:"right",margin:0});
  }
}

function addWatermark(slide){
  if(hasAsset("africa_map.png"))
    slide.addImage({path:A("africa_map.png"),x:4.5,y:-0.2,w:9.0,h:7.9,transparency:78});
}

function addSlideHeader(slide,title,subtitle=""){
  slide.addShape("rect",{x:0,y:0,w:0.14,h:H,fill:{color:CRM},line:{color:CRM}});
  slide.addText(title,{x:0.3,y:0.2,w:10,h:0.42,fontSize:20,bold:true,color:NAV,fontFace:"Calibri",margin:0});
  if(subtitle) slide.addText(subtitle,{x:0.3,y:0.6,w:10,h:0.28,fontSize:11,color:GRY,fontFace:"Calibri",italic:true,margin:0});
  slide.addShape("line",{x:0.3,y:0.92,w:12.7,h:0,line:{color:"E2E8F0",width:0.75}});
}

// ── Aggregate utilities ───────────────────────────────────────────────────────

function unique(arr){ return [...new Set(arr.map(s=>String(s).trim()).filter(Boolean))]; }

function aggregateWeeks(weeks){
  const agg = {
    allHighlights:    [],
    allFocusAreas:    [],
    allKpiPerf:       [],
    allSrClosure:     [],
    allAchievements:  [],
    allSrsClosure:    [],
    allVfFocus:       [],
    allGeneralFocus:  [],
    q1Latest:         [],
    q4Latest:         [],
    allSmartAppHub:   [],
    allOther:         [],
    weekLabels:       [],
    weekHighlightCounts:[],
    weekSrCounts:     [],
    weekAchCounts:    [],
  };
  weeks.forEach(w=>{
    agg.weekLabels.push(w.report_period||"Week");
    agg.allHighlights.push(...(w.key_highlights||[]));
    agg.allFocusAreas.push(...(w.focus_areas||[]));
    agg.allKpiPerf.push(...(w.kpi_performance||[]));
    agg.allSrClosure.push(...(w.sr_closure_status||[]));
    agg.allAchievements.push(...(w.achievements||[]));
    agg.allSrsClosure.push(...(w.srs_closure||[]));
    agg.allVfFocus.push(...(w.vf_focus_items||[]));
    agg.allGeneralFocus.push(...(w.general_focus_areas||[]));
    agg.allSmartAppHub.push(...(w.smartapp_hub_focus||[]));
    agg.allOther.push(...(w.other_items||[]));
    agg.weekHighlightCounts.push((w.key_highlights||[]).length);
    agg.weekSrCounts.push((w.sr_closure_status||[]).length);
    agg.weekAchCounts.push((w.achievements||[]).length);
    // Use latest week's Q1/Q4 review statuses
    if((w.q1_user_review||[]).length) agg.q1Latest = w.q1_user_review;
    if((w.q4_user_review||[]).length) agg.q4Latest = w.q4_user_review;
  });
  agg.uniqueHighlights   = unique(agg.allHighlights).slice(0,8);
  agg.uniqueFocusAreas   = unique(agg.allFocusAreas).slice(0,8);
  agg.uniqueKpiPerf      = unique(agg.allKpiPerf).slice(0,6);
  agg.uniqueSrClosure    = unique(agg.allSrClosure).slice(0,6);
  agg.uniqueAchievements = unique(agg.allAchievements).slice(0,6);
  agg.uniqueSrsClosure   = unique(agg.allSrsClosure).slice(0,5);
  agg.uniqueVfFocus      = unique(agg.allVfFocus).slice(0,4);
  agg.uniqueGeneralFocus = unique(agg.allGeneralFocus).slice(0,8);
  agg.uniqueSmartAppHub  = unique(agg.allSmartAppHub).slice(0,4);
  agg.uniqueOther        = unique(agg.allOther).slice(0,4);
  return agg;
}

// ── Slide 1: Branded Cover ───────────────────────────────────────────────────

function slide1Cover(pres,period){
  const s=pres.addSlide();
  if(hasAsset("cover_bg.png")) s.addImage({path:A("cover_bg.png"),x:0,y:-0.057,w:13.329,h:7.557});
  else { s.background={color:"2C2C2C"}; s.addShape("rect",{x:0,y:0,w:0.55,h:H,fill:{color:RED},line:{color:RED}}); }
  if(hasAsset("africa_map.png")) s.addImage({path:A("africa_map.png"),x:5.539,y:-0.164,w:6.483,h:7.828});
  if(hasAsset("mpesa_logo.png")) s.addImage({path:A("mpesa_logo.png"),x:9.308,y:4.403,w:2.805,h:0.81});
  s.addText("Transforming Lives",{x:0.499,y:0.75,w:3.48,h:0.57,fontSize:20,bold:true,italic:true,color:WHT,fontFace:"Calibri",margin:0});
  s.addText([{text:"UAM",options:{breakLine:true}},{text:"Monthly Report"}],
    {x:0.35,y:2.7,w:5.5,h:2.0,fontSize:40,bold:true,color:WHT,fontFace:"Calibri",align:"center",margin:0});
  s.addText(`Reporting Period: ${period}`,{x:0.8,y:6.39,w:6.4,h:0.62,fontSize:16,bold:true,color:WHT,fontFace:"Calibri",margin:0});
  s.addText("Further together",{x:11.545,y:7.074,w:1.7,h:0.303,fontSize:7,color:WHT,fontFace:"Calibri",margin:0});
}

// ── Slide 2: Monthly Executive Summary (KPI cards + trend chart) ─────────────

function slide2ExecutiveSummary(pres,agg,numWeeks,period){
  const s=pres.addSlide(); s.background={color:LGR}; addWatermark(s);
  addSlideHeader(s,"Monthly Executive Summary",`${period}  ·  Aggregated from ${numWeeks} weekly report${numWeeks!==1?"s":""}`);

  const q1Done  = agg.q1Latest.filter(i=>(i.status||"").toLowerCase().includes("complete")).length;
  const q4Done  = agg.q4Latest.filter(i=>(i.status||"").toLowerCase().includes("complete")).length;
  const q1Pct   = agg.q1Latest.length ? Math.round(q1Done/agg.q1Latest.length*100) : 0;
  const q4Pct   = agg.q4Latest.length ? Math.round(q4Done/agg.q4Latest.length*100) : 0;
  const totHigh = agg.allHighlights.length;
  const totAch  = agg.allAchievements.length;

  // 4 large KPI summary cards
  const cards=[
    {label:"Total Highlights",    value:String(totHigh),         sub:`Across ${numWeeks} weeks`,   col:NAV},
    {label:"Achievements Logged", value:String(totAch),          sub:"Cumulative this month",      col:GRN},
    {label:"Q1 Review Progress",  value:`${q1Pct}%`,            sub:`${q1Done}/${agg.q1Latest.length} complete`, col:q1Pct>=80?EME:q1Pct>=50?AMB:CRM},
    {label:"Q4 Review Progress",  value:`${q4Pct}%`,            sub:`${q4Done}/${agg.q4Latest.length} complete`, col:q4Pct>=80?EME:q4Pct>=50?AMB:CRM},
  ];
  const cW=2.8,cH=1.7,sX=0.4,cY=1.1,gap=0.2;
  cards.forEach((c,i)=>{
    const cx=sX+i*(cW+gap);
    s.addShape("rect",{x:cx,y:cY,w:cW,h:cH,fill:{color:WHT},line:{color:WHT},shadow:shadow()});
    s.addShape("rect",{x:cx,y:cY,w:cW,h:0.07,fill:{color:c.col},line:{color:c.col}});
    s.addText(c.value,{x:cx+0.1,y:cY+0.18,w:cW-0.2,h:0.72,fontSize:32,bold:true,color:c.col,fontFace:"Calibri",align:"center",margin:0});
    s.addText(c.label,{x:cx+0.1,y:cY+0.94,w:cW-0.2,h:0.4,fontSize:10,bold:true,color:BLK,fontFace:"Calibri",align:"center",margin:0});
    s.addText(c.sub,  {x:cx+0.1,y:cY+1.34,w:cW-0.2,h:0.25,fontSize:9,color:GRY,fontFace:"Calibri",italic:true,align:"center",margin:0});
  });

  // Weekly activity trend chart (highlights per week)
  if(agg.weekLabels.length>1){
    const shortLabels = agg.weekLabels.map((l,i)=>`W${i+1}`);
    s.addChart(pres.charts.LINE,[
      {name:"Key Highlights", labels:shortLabels, values:agg.weekHighlightCounts},
      {name:"Achievements",   labels:shortLabels, values:agg.weekAchCounts},
    ],{
      x:0.35, y:3.0, w:12.6, h:3.3,
      chartColors:[NAV,EME],
      chartArea:{fill:{color:WHT}},
      catAxisLabelColor:BLK, catAxisLabelFontSize:10,
      valAxisLabelColor:GRY, valAxisLabelFontSize:10,
      valAxisMinVal:0,
      valGridLine:{color:"F1F5F9",size:0.5}, catGridLine:{style:"none"},
      lineSize:2.5, lineSmooth:true,
      showLegend:true, legendPos:"b", legendFontSize:10, legendColor:BLK,
      showValue:true, dataLabelFontSize:9, dataLabelColor:BLK,
      title:"Weekly Activity Trend", titleFontSize:11, titleColor:NAV
    });
  }
  addMpesaFooter(s);
}

// ── Slide 3: Q1 & Q4 Review Detail + SR Trend ───────────────────────────────

function slide3ReviewsAndSR(pres,agg){
  const s=pres.addSlide(); s.background={color:WHT}; addWatermark(s);
  addSlideHeader(s,"User Reviews & SR Performance","Q1 & Q4 completion status · Service Request trends");

  // Q1 Review bar chart (left)
  if(agg.q1Latest.length){
    s.addChart(pres.charts.BAR,[{
      name:"Q1 Completion",
      labels:agg.q1Latest.map(i=>i.label||i),
      values:agg.q1Latest.map(i=>(i.status||"").toLowerCase().includes("complete")?100:50)
    }],{
      x:0.35, y:1.1, w:5.8, h:3.5,
      barDir:"bar",
      chartColors:agg.q1Latest.map(i=>(i.status||"").toLowerCase().includes("complete")?EME:AMB),
      chartArea:{fill:{color:WHT}},
      catAxisLabelColor:BLK, catAxisLabelFontSize:10,
      valAxisLabelColor:GRY, valAxisLabelFontSize:9,
      valAxisMaxVal:100, valAxisMinVal:0,
      showValue:true, dataLabelFontSize:10, dataLabelColor:BLK,
      showLegend:false,
      title:"Q1 User Review Status", titleFontSize:12, titleColor:NAV
    });
  }

  // Q4 Review bar chart (right)
  if(agg.q4Latest.length){
    s.addChart(pres.charts.BAR,[{
      name:"Q4 Completion",
      labels:agg.q4Latest.map(i=>i.label||i),
      values:agg.q4Latest.map(i=>(i.status||"").toLowerCase().includes("complete")?100:50)
    }],{
      x:6.5, y:1.1, w:6.5, h:3.5,
      barDir:"bar",
      chartColors:agg.q4Latest.map(i=>(i.status||"").toLowerCase().includes("complete")?EME:AMB),
      chartArea:{fill:{color:WHT}},
      catAxisLabelColor:BLK, catAxisLabelFontSize:10,
      valAxisLabelColor:GRY, valAxisLabelFontSize:9,
      valAxisMaxVal:100, valAxisMinVal:0,
      showValue:true, dataLabelFontSize:10, dataLabelColor:BLK,
      showLegend:false,
      title:"Q4 User Review Status", titleFontSize:12, titleColor:NAV
    });
  }

  // SR Closure summary table
  const srItems = agg.uniqueSrsClosure.slice(0,4);
  if(srItems.length){
    const hdr=[
      {text:"SR Closure Actions",options:{bold:true,color:WHT,fill:{color:NAV},fontSize:10}},
      {text:"Status",options:{bold:true,color:WHT,fill:{color:NAV},fontSize:10,align:"center"}}
    ];
    const rows=[hdr,...srItems.map((txt,i)=>[
      {text:String(txt),options:{fontSize:10,color:BLK,fill:{color:i%2===0?WHT:LGR}}},
      {text:"Tracked",options:{fontSize:10,color:BLU,fill:{color:i%2===0?WHT:LGR},align:"center"}}
    ])];
    s.addTable(rows,{x:0.35,y:4.78,w:12.6,colW:[10.3,2.3],rowH:0.38,border:{pt:0.5,color:"E5E7EB"}});
  }
  addMpesaFooter(s);
}

// ── Slide 4: Cumulative Key Highlights ───────────────────────────────────────

function slide4Highlights(pres,agg,numWeeks){
  const s=pres.addSlide(); s.background={color:LGR}; addWatermark(s);
  addSlideHeader(s,"Monthly Key Highlights",`Cumulative highlights from ${numWeeks} weeks of operations`);

  const items=agg.uniqueHighlights;
  const half=Math.ceil(items.length/2);
  const left=items.slice(0,half), right=items.slice(half);

  // Left column
  s.addShape("rect",{x:0.35,y:1.1,w:5.9,h:H-1.9,fill:{color:WHT},line:{color:"E5E7EB"},shadow:shadow()});
  left.forEach((txt,i)=>{
    const ty=1.22+i*0.67;
    s.addShape("rect",{x:0.45,y:ty+0.05,w:0.08,h:0.38,fill:{color:CRM},line:{color:CRM}});
    s.addText(String(txt),{x:0.62,y:ty,w:5.45,h:0.6,fontSize:10.5,color:BLK,fontFace:"Calibri",wrap:true,valign:"top",margin:0});
  });

  // Right column
  s.addShape("rect",{x:6.7,y:1.1,w:6.3,h:H-1.9,fill:{color:WHT},line:{color:"E5E7EB"},shadow:shadow()});
  right.forEach((txt,i)=>{
    const ty=1.22+i*0.67;
    s.addShape("rect",{x:6.8,y:ty+0.05,w:0.08,h:0.38,fill:{color:GRN},line:{color:GRN}});
    s.addText(String(txt),{x:7.0,y:ty,w:5.8,h:0.6,fontSize:10.5,color:BLK,fontFace:"Calibri",wrap:true,valign:"top",margin:0});
  });

  addMpesaFooter(s);
}

// ── Slide 5: Focus Areas & Achievements ──────────────────────────────────────

function slide5FocusAchievements(pres,agg){
  const s=pres.addSlide(); s.background={color:WHT}; addWatermark(s);
  addSlideHeader(s,"Focus Areas & Achievements","Monthly operational priorities and accomplishments");

  // Focus Areas (left)
  s.addShape("rect",{x:0.35,y:1.1,w:5.9,h:5.5,fill:{color:LGR},line:{color:"E5E7EB"}});
  s.addText("🎯  Focus Areas",{x:0.5,y:1.18,w:5.6,h:0.35,fontSize:13,bold:true,color:NAV,fontFace:"Calibri",margin:0});
  agg.uniqueFocusAreas.slice(0,7).forEach((txt,i)=>{
    const ty=1.65+i*0.6;
    s.addShape("ellipse",{x:0.52,y:ty+0.08,w:0.12,h:0.12,fill:{color:CRM},line:{color:CRM}});
    s.addText(String(txt),{x:0.72,y:ty,w:5.3,h:0.52,fontSize:10.5,color:BLK,fontFace:"Calibri",wrap:true,margin:0});
  });

  // Achievements (right)
  s.addShape("rect",{x:6.7,y:1.1,w:6.3,h:5.5,fill:{color:"F0FDF4"},line:{color:"BBF7D0"}});
  s.addText("🏆  Achievements",{x:6.85,y:1.18,w:6.0,h:0.35,fontSize:13,bold:true,color:GRN,fontFace:"Calibri",margin:0});
  agg.uniqueAchievements.slice(0,6).forEach((txt,i)=>{
    const ty=1.65+i*0.67;
    s.addText("✓",{x:6.88,y:ty,w:0.28,h:0.45,fontSize:13,bold:true,color:EME,align:"center",margin:0});
    s.addText(String(txt),{x:7.18,y:ty,w:5.6,h:0.55,fontSize:10.5,color:BLK,fontFace:"Calibri",wrap:true,margin:0});
  });

  addMpesaFooter(s);
}

// ── Slide 6: KPI Performance + VF Focus ──────────────────────────────────────

function slide6KpiAndVF(pres,agg){
  const s=pres.addSlide(); s.background={color:LGR}; addWatermark(s);
  addSlideHeader(s,"KPI Performance & VF Focus","Monthly performance metrics and Vodafone request status");

  // KPI Performance list (left)
  s.addShape("rect",{x:0.35,y:1.1,w:5.9,h:3.5,fill:{color:WHT},line:{color:"E5E7EB"},shadow:shadow()});
  s.addText("📊  KPI Performance Overview",{x:0.5,y:1.18,w:5.6,h:0.32,fontSize:12,bold:true,color:NAV,fontFace:"Calibri",margin:0});
  agg.uniqueKpiPerf.slice(0,5).forEach((txt,i)=>{
    const ty=1.6+i*0.47;
    s.addShape("rect",{x:0.5,y:ty+0.06,w:0.07,h:0.28,fill:{color:GRN},line:{color:GRN}});
    s.addText(String(txt),{x:0.65,y:ty,w:5.4,h:0.44,fontSize:10,color:BLK,fontFace:"Calibri",wrap:true,margin:0});
  });

  // VF Focus list (right)
  s.addShape("rect",{x:6.7,y:1.1,w:6.3,h:3.5,fill:{color:WHT},line:{color:"E5E7EB"},shadow:shadow()});
  s.addText("📡  Vodafone Focus Area",{x:6.85,y:1.18,w:6.0,h:0.32,fontSize:12,bold:true,color:NAV,fontFace:"Calibri",margin:0});
  agg.uniqueVfFocus.forEach((txt,i)=>{
    const ty=1.6+i*0.55;
    s.addShape("rect",{x:6.85,y:ty+0.06,w:0.07,h:0.28,fill:{color:AMB},line:{color:AMB}});
    s.addText(String(txt),{x:7.0,y:ty,w:5.8,h:0.48,fontSize:10,color:BLK,fontFace:"Calibri",wrap:true,margin:0});
  });

  // SmartApp & Hub (bottom, full width)
  s.addShape("rect",{x:0.35,y:4.75,w:12.6,h:1.5,fill:{color:WHT},line:{color:"E5E7EB"}});
  s.addText("📱  SmartApp & Hub Focus",{x:0.5,y:4.83,w:4,h:0.3,fontSize:12,bold:true,color:NAV,fontFace:"Calibri",margin:0});
  if(agg.uniqueSmartAppHub.length){
    s.addText(agg.uniqueSmartAppHub.join("   ·   "),{x:0.5,y:5.2,w:12.1,h:0.85,fontSize:10,color:BLK,fontFace:"Calibri",wrap:true,margin:0});
  }
  addMpesaFooter(s);
}

// ── Slide 7: Closing / Next Steps ────────────────────────────────────────────

function slide7Closing(pres,period){
  const s=pres.addSlide();
  s.background={color:NAV};
  s.addShape("rect",{x:0,y:0,w:0.55,h:H,fill:{color:CRM},line:{color:CRM}});

  // Left – focus summary
  s.addShape("rect",{x:0.72,y:0.3,w:5.4,h:5.0,fill:{color:"162347"},line:{color:"162347"}});
  s.addText("MONTHLY SUMMARY",{x:0.88,y:0.45,w:5.1,h:0.35,fontSize:11,bold:true,color:CRM,charSpacing:3,fontFace:"Calibri",margin:0});
  const points=["Consolidated all weekly highlights and achievements","Q1 and Q4 user review progress tracked to completion","SR closure actions monitored and followed up","VF and SmartApp/Hub focus areas actively managed","Continuous SLA maintenance above 90%"];
  points.forEach((p,i)=>{
    s.addShape("rect",{x:0.88,y:1.0+i*0.77,w:0.06,h:0.38,fill:{color:CRM},line:{color:CRM}});
    s.addText(p,{x:1.04,y:1.0+i*0.77,w:4.9,h:0.55,fontSize:11,color:"CADCFC",fontFace:"Calibri",wrap:true,margin:0});
  });

  // Right – next steps
  s.addShape("rect",{x:6.3,y:0.3,w:6.7,h:5.0,fill:{color:WHT},line:{color:WHT}});
  s.addText("NEXT STEPS",{x:6.5,y:0.55,w:6.2,h:0.32,fontSize:10,bold:true,color:CRM,charSpacing:3,fontFace:"Calibri",margin:0});
  const steps=["Review Q1 user reviews requiring leadership follow-up","Escalate IT Security access reviews immediately","Resolve VF login/VOGA/GitHub issues permanently","Define escalation path for pending access requests","Complete UAM SOP documentation for movers and leavers"];
  steps.forEach((p,i)=>{
    s.addText("•",{x:6.5,y:1.05+i*0.63,w:0.22,h:0.45,fontSize:12,bold:true,color:CRM,align:"center",margin:0});
    s.addText(p,{x:6.75,y:1.05+i*0.63,w:6.1,h:0.5,fontSize:11,color:BLK,fontFace:"Calibri",wrap:true,margin:0});
  });

  // Footer
  s.addText(`UAM Operations  ·  ${period}  ·  Confidential`,{x:0.72,y:5.32,w:12.3,h:0.22,fontSize:8,color:"7B91B5",align:"center",fontFace:"Calibri",margin:0});
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(){
  const jsonFile = process.argv[2];
  const outPath  = process.argv[3] || "monthly_from_weekly.pptx";

  if(!jsonFile){ console.error("Usage: node generate_monthly_from_weekly.js <json_file> <output>"); process.exit(1); }
  if(!fs.existsSync(jsonFile)){ console.error("JSON file not found:", jsonFile); process.exit(1); }

  let payload;
  try { payload = JSON.parse(fs.readFileSync(jsonFile,"utf8")); }
  catch(e){ console.error("JSON parse error:", e.message); process.exit(1); }

  const weeks    = payload.weeks || [];
  const period   = payload.period || "Monthly Report";
  const numWeeks = weeks.length;

  if(!numWeeks){ console.error("No weekly reports in payload"); process.exit(1); }

  const agg = aggregateWeeks(weeks);

  const pres = new pptxgen();
  pres.layout  = "LAYOUT_WIDE";
  pres.author  = "UAM Operations";
  pres.title   = `UAM Monthly Report – ${period}`;
  pres.subject = "Monthly Consolidated Report";

  slide1Cover             (pres, period);
  slide2ExecutiveSummary  (pres, agg, numWeeks, period);
  slide3ReviewsAndSR      (pres, agg);
  slide4Highlights        (pres, agg, numWeeks);
  slide5FocusAchievements (pres, agg);
  slide6KpiAndVF          (pres, agg);
  slide7Closing           (pres, period);

  await pres.writeFile({fileName:outPath});
  console.log(`OK:${outPath}`);
}

main().catch(e=>{ console.error("Fatal:",e.message||e); process.exit(1); });
