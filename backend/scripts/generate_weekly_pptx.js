/**
 * UAM Weekly Report – PowerPoint Generator (v2)
 * Reads JSON from a FILE (not cmd arg) – avoids Windows arg-length limits.
 * Usage: node generate_weekly_pptx.js <json_file> <output_pptx>
 */
"use strict";
const pptxgen = require("pptxgenjs");
const path    = require("path");
const fs      = require("fs");

const ASSETS   = path.join(__dirname, "assets");
const A        = (f) => path.join(ASSETS, f);
const hasAsset = (f) => fs.existsSync(A(f));

const GRN="1D8348",RED="C0392B",BLK="1A1A1A",GRY="555555",WHT="FFFFFF",
      LGR="F4F4F4",NAV="1E2761",AMB="D97706",EME="16A34A",BLU="2563EB";
const W=13.333, H=7.5;

// ── helpers ──────────────────────────────────────────────────────────────────

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
    slide.addImage({path:A("africa_map.png"),x:4.5,y:-0.2,w:9.0,h:7.9,transparency:75});
}

function dot(slide,y){
  slide.addShape("ellipse",{x:6.54,y:y-0.09,w:0.18,h:0.18,fill:{color:GRN},line:{color:GRN}});
}

function leftLabel(slide,label,y){
  slide.addText(label,{x:2.0,y,w:4.3,h:0.3,fontSize:12,bold:true,color:BLK,fontFace:"Calibri",align:"right",margin:0});
  dot(slide,y+0.05);
}

function rightLabel(slide,label,y){
  slide.addText(label,{x:6.75,y,w:6.4,h:0.3,fontSize:12,bold:true,color:BLK,fontFace:"Calibri",align:"left",margin:0});
  dot(slide,y+0.05);
}

function leftBullets(slide,items,y,h=1.2){
  if(!items||!items.length) return;
  slide.addText(items.map((t,i)=>({text:String(t),options:{bullet:true,breakLine:i<items.length-1}})),
    {x:0.35,y,w:6.0,h,fontSize:10.5,color:BLK,fontFace:"Calibri",valign:"top",margin:[2,4,2,4]});
}

function rightBullets(slide,items,y,h=1.0){
  if(!items||!items.length) return;
  slide.addText(items.map((t,i)=>({text:String(t),options:{bullet:{code:"25A1",font:"Arial Unicode MS"},breakLine:i<items.length-1}})),
    {x:6.75,y,w:6.4,h,fontSize:10.5,color:BLK,fontFace:"Calibri",valign:"top",margin:[2,4,2,4]});
}

function statusItems(slide,items,y,h=1.0){
  if(!items||!items.length) return;
  slide.addText(items.map((it,i)=>({text:`${it.label||it} – ${it.status||""}`,options:{bullet:{code:"25A1",font:"Arial Unicode MS"},breakLine:i<items.length-1}})),
    {x:6.75,y,w:6.4,h,fontSize:10.5,color:BLK,fontFace:"Calibri",valign:"top",margin:[2,4,2,4]});
}

// ── Slide 1: Branded Cover ───────────────────────────────────────────────────

function slide1Cover(pres,data){
  const s=pres.addSlide();
  if(hasAsset("cover_bg.png")) s.addImage({path:A("cover_bg.png"),x:0,y:-0.057,w:13.329,h:7.557});
  else { s.background={color:"2C2C2C"}; s.addShape("rect",{x:0,y:0,w:0.55,h:H,fill:{color:RED},line:{color:RED}}); }
  if(hasAsset("africa_map.png")) s.addImage({path:A("africa_map.png"),x:5.539,y:-0.164,w:6.483,h:7.828});
  if(hasAsset("mpesa_logo.png")) s.addImage({path:A("mpesa_logo.png"),x:9.308,y:4.403,w:2.805,h:0.81});
  s.addText("Transforming Lives",{x:0.499,y:0.75,w:3.48,h:0.57,fontSize:20,bold:true,italic:true,color:WHT,fontFace:"Calibri",margin:0});
  s.addText([{text:"UAM",options:{breakLine:true}},{text:"Weekly Report"}],
    {x:0.35,y:2.7,w:5.5,h:2.0,fontSize:40,bold:true,color:WHT,fontFace:"Calibri",align:"center",margin:0});
  s.addText(`Reporting Period: ${data.report_period||""}`,{x:0.8,y:6.39,w:6.4,h:0.62,fontSize:16,bold:true,color:WHT,fontFace:"Calibri",margin:0});
  s.addText("Further together",{x:11.545,y:7.074,w:1.7,h:0.303,fontSize:7,color:WHT,fontFace:"Calibri",margin:0});
}

// ── Slide 2: Weekly At a Glance (VISUALS) ───────────────────────────────────

function slide2AtAGlance(pres,data){
  const s=pres.addSlide();
  s.background={color:WHT};
  addWatermark(s);

  s.addText("Weekly At a Glance",{x:0,y:0.05,w:W,h:0.55,fontSize:24,bold:true,color:GRN,fontFace:"Calibri",align:"center",margin:0});
  s.addText(data.report_period||"",{x:0,y:0.57,w:W,h:0.28,fontSize:11,color:GRY,fontFace:"Calibri",italic:true,align:"center",margin:0});

  // Compute metrics
  const q1 = data.q1_user_review||[], q4 = data.q4_user_review||[];
  const q1Done = q1.filter(i=>(i.status||"").toLowerCase().includes("complete")).length;
  const q4Done = q4.filter(i=>(i.status||"").toLowerCase().includes("complete")).length;
  const q1Pct  = q1.length ? Math.round(q1Done/q1.length*100) : 0;
  const q4Pct  = q4.length ? Math.round(q4Done/q4.length*100) : 0;

  // 4 KPI metric cards
  const cards=[
    {label:"Key Highlights", value:String((data.key_highlights||[]).length), sub:"This week",          col:GRN},
    {label:"Focus Areas",    value:String((data.focus_areas||[]).length),    sub:"Being tracked",      col:BLU},
    {label:"Q1 Reviews",     value:`${q1Done}/${q1.length}`,                 sub:`${q1Pct}% complete`, col:q1Pct>=80?EME:q1Pct>=50?AMB:RED},
    {label:"Q4 Reviews",     value:`${q4Done}/${q4.length}`,                 sub:`${q4Pct}% complete`, col:q4Pct>=80?EME:q4Pct>=50?AMB:RED},
  ];
  const cW=2.7,cH=1.6,sX=0.5,cY=1.0,gap=0.25;
  cards.forEach((c,i)=>{
    const cx=sX+i*(cW+gap);
    s.addShape("rect",{x:cx,y:cY,w:cW,h:cH,fill:{color:WHT},line:{color:"E5E7EB"},shadow:{type:"outer",color:"000000",blur:5,offset:2,angle:135,opacity:0.07}});
    s.addShape("rect",{x:cx,y:cY,w:cW,h:0.06,fill:{color:c.col},line:{color:c.col}});
    s.addText(c.value,{x:cx+0.15,y:cY+0.14,w:cW-0.3,h:0.65,fontSize:30,bold:true,color:c.col,fontFace:"Calibri",align:"center",margin:0});
    s.addText(c.label,{x:cx+0.1,y:cY+0.82,w:cW-0.2,h:0.38,fontSize:10,bold:true,color:BLK,fontFace:"Calibri",align:"center",margin:0});
    s.addText(c.sub,  {x:cx+0.1,y:cY+1.22,w:cW-0.2,h:0.25,fontSize:9,color:GRY,fontFace:"Calibri",italic:true,align:"center",margin:0});
  });

  // SR Closure box (bottom-left)
  const srY=2.85;
  s.addShape("rect",{x:0.35,y:srY,w:5.9,h:3.3,fill:{color:LGR},line:{color:"E5E7EB"}});
  s.addText("SR Closure Status",{x:0.55,y:srY+0.15,w:5.6,h:0.32,fontSize:12,bold:true,color:NAV,fontFace:"Calibri",margin:0});
  (data.sr_closure_status||[]).slice(0,5).forEach((txt,i)=>{
    const iy=srY+0.58+i*0.49;
    s.addShape("rect",{x:0.55,y:iy+0.05,w:0.07,h:0.3,fill:{color:GRN},line:{color:GRN}});
    s.addText(String(txt),{x:0.72,y:iy,w:5.3,h:0.44,fontSize:10,color:BLK,fontFace:"Calibri",wrap:true,margin:0});
  });

  // Q1 + Q4 bar chart (bottom-right)
  const allR=[...q1.map(i=>({...i,grp:"Q1"})),...q4.map(i=>({...i,grp:"Q4"}))];
  if(allR.length){
    const chartColors=allR.map(i=>(i.status||"").toLowerCase().includes("complete")?EME:AMB);
    s.addChart(pres.charts.BAR,[{
      name:"Completion",
      labels:allR.map(i=>`${i.grp} – ${i.label||i}`),
      values:allR.map(i=>(i.status||"").toLowerCase().includes("complete")?100:50)
    }],{
      x:6.5,y:srY,w:6.5,h:3.3,
      barDir:"bar",
      chartColors,
      chartArea:{fill:{color:WHT}},
      catAxisLabelColor:BLK,catAxisLabelFontSize:9,
      valAxisLabelColor:GRY,valAxisLabelFontSize:9,
      valAxisMaxVal:100,valAxisMinVal:0,
      valGridLine:{color:"F1F5F9",size:0.5},catGridLine:{style:"none"},
      showValue:true,dataLabelFontSize:9,dataLabelColor:BLK,
      showLegend:false,
      title:"User Review Progress",titleFontSize:11,titleColor:NAV
    });
  } else {
    s.addText("No review data entered for this week.",{x:6.5,y:srY+1.3,w:6.5,h:0.4,fontSize:11,color:GRY,align:"center",italic:true,margin:0});
  }

  // Achievements strip
  const ach=data.achievements||[];
  if(ach.length){
    s.addShape("rect",{x:0.35,y:6.3,w:W-0.7,h:0.42,fill:{color:"F0FDF4"},line:{color:"BBF7D0"}});
    s.addText("🏆  "+ach.slice(0,2).join("   ·   "),{x:0.55,y:6.32,w:W-1.1,h:0.35,fontSize:10,bold:true,color:EME,fontFace:"Calibri",margin:0});
  }

  addMpesaFooter(s);
}

// ── Slide 3: Key Highlights ──────────────────────────────────────────────────

function slide3Highlights(pres,data){
  const s=pres.addSlide(); s.background={color:WHT}; addWatermark(s);
  s.addText("UAM Operations: Key Highlights",{x:0,y:0.05,w:W,h:0.58,fontSize:24,bold:true,color:GRN,fontFace:"Calibri",align:"center",margin:0});
  s.addShape("line",{x:6.62,y:0.85,w:0,h:6.6,line:{color:RED,width:1.8}});
  leftLabel(s,"Key Highlights",0.85);  leftBullets(s,data.key_highlights||[],1.08,1.55);
  leftLabel(s,"Focus Areas",2.72);     leftBullets(s,data.focus_areas||[],3.0,1.5);
  rightLabel(s,"KPI Performance Overview",0.65);          rightBullets(s,data.kpi_performance||[],0.92,1.5);
  rightLabel(s,"Service Request (SR) Closure Status",2.46); rightBullets(s,data.sr_closure_status||[],2.73,1.2);
  rightLabel(s,"Achievements",4.12);                       rightBullets(s,data.achievements||[],4.38,1.0);
  addMpesaFooter(s);
}

// ── Slide 4: KPIs & Summary ──────────────────────────────────────────────────

function slide4KpiSummary(pres,data){
  const s=pres.addSlide(); s.background={color:WHT}; addWatermark(s);
  s.addText("UAM Operations: KPIs & Summary",{x:0,y:0.05,w:W,h:0.58,fontSize:24,bold:true,color:GRN,fontFace:"Calibri",align:"center",margin:0});
  s.addShape("line",{x:6.62,y:0.85,w:0,h:6.6,line:{color:RED,width:1.8}});
  leftLabel(s,"SRs Closure",0.85);                      leftBullets(s,data.srs_closure||[],1.08,0.9);
  leftLabel(s,"Focus Area – Vodafone Requests",2.05);   leftBullets(s,data.vf_focus_items||[],2.32,1.0);
  leftLabel(s,"Focus Areas",3.4);                       leftBullets(s,data.general_focus_areas||[],3.65,2.6);
  rightLabel(s,"Q1 User Review",0.65);                  statusItems(s,data.q1_user_review||[],0.92,1.0);
  rightLabel(s,"Q4 User Review",1.96);                  statusItems(s,data.q4_user_review||[],2.23,1.05);
  rightLabel(s,"Focus Areas – SmartApp & Hub",3.3);     rightBullets(s,data.smartapp_hub_focus||[],3.55,1.35);
  rightLabel(s,"Other",4.95);                           rightBullets(s,data.other_items||[],5.2,0.7);
  addMpesaFooter(s);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(){
  const jsonFile = process.argv[2];
  const outPath  = process.argv[3] || "weekly_report.pptx";
  if(!jsonFile){ console.error("Usage: node generate_weekly_pptx.js <json_file> <output>"); process.exit(1); }
  if(!fs.existsSync(jsonFile)){ console.error("JSON file not found:", jsonFile); process.exit(1); }

  let data;
  try { data = JSON.parse(fs.readFileSync(jsonFile,"utf8")); }
  catch(e){ console.error("JSON parse error:", e.message); process.exit(1); }

  const pres=new pptxgen();
  pres.layout="LAYOUT_WIDE"; pres.author="UAM Operations";
  pres.title=`UAM Weekly Report – ${data.report_period||""}`;

  slide1Cover      (pres,data);
  slide2AtAGlance  (pres,data);
  slide3Highlights (pres,data);
  slide4KpiSummary (pres,data);

  await pres.writeFile({fileName:outPath});
  console.log(`OK:${outPath}`);
}

main().catch(e=>{ console.error("Fatal:",e.message||e); process.exit(1); });
