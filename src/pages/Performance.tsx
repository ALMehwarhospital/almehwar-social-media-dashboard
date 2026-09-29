import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, PhoneCall, Stethoscope, UserRoundSearch } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFilters } from "../utils/FilterContext";
import { useDecisionLive } from "../utils/useDecisionLive";
import { getMonthlyPerformance } from "../utils/selectors";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { MonthlyTrendChart } from "../components/charts/MonthlyTrendChart";
import { FunnelView } from "../components/charts/FunnelView";
import { formatNumber } from "../utils/format";
import { fetchInboundCallsSnapshot, mergeInboundCalls, type InboundCallRow } from "../data/inboundCalls";

function sumAvailable(rows:any[], key:string):number|null{ const vals=rows.map(r=>r[key]).filter(v=>typeof v==="number"&&Number.isFinite(v)); return vals.length?vals.reduce((a,b)=>a+b,0):null; }
function publishedCount(row:any):number|null{ const posts=typeof row.posts==="number"?row.posts:null; const videos=typeof row.videos==="number"?row.videos:null; if(posts===null&&videos===null)return null; return (posts??0)+(videos??0); }
function sumPublished(rows:any[]):number|null{ const values=rows.map(publishedCount).filter((v):v is number=>v!==null); return values.length?values.reduce((sum,value)=>sum+value,0):null; }
function currentMonthKey(){ const now=new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`; }

const callReasonLabels: Array<[keyof InboundCallRow,string]> = [
  ["opdReservations","OPD Reservations"],["expertInquiries","Expert Inquiries"],["expertVisits","Expert Visits"],
  ["physiotherapy","Physiotherapy"],["contracts","Contracts"],["internal","Internal"],["operations","Operations"],
  ["radiology","Radiology"],["laboratory","Laboratory"],["catheterization","Catheterization"],["medicalReports","Medical Reports"],
  ["dialysis","Dialysis"],["pharmacy","Pharmacy"],["comprehensiveCheckups","Comprehensive Checkups"],["bloodBank","Blood Bank"],
  ["emergency","Emergency"],["ambulance","Ambulance"],["accounts","Accounts"],["marketing","Marketing"],
  ["purchasing","Purchasing"],["recruitment","Recruitment"],["wrongCalls","Wrong Calls"],["generalInquiries","General Inquiries"],
];

function CallStat({label,value,note,icon:Icon}:{label:string;value:string;note:string;icon:any}){
  return <Card className="p-4 sm:p-5"><div className="flex justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wide text-fog-400">{label}</p><p className="font-display text-2xl text-navy-900 mt-1">{value}</p></div><div className="w-9 h-9 rounded-xl bg-mint-100 text-mint-700 flex items-center justify-center"><Icon size={17}/></div></div><p className="text-[11px] text-fog-500 mt-3">{note}</p></Card>;
}

function CallsSection({month,rows}:{month:string;rows:InboundCallRow[]}){
  const selected=useMemo(()=>rows.filter(row=>row.periodMonth===month).sort((a,b)=>a.date.localeCompare(b.date)),[rows,month]);
  if(!selected.length) return <section><SectionHeader eyebrow="Inbound Calls" title="Call Center Performance" description="Daily call data is available from June 2026."/><EmptyState message="No inbound call data for the selected month."/></section>;
  const total=(key:keyof InboundCallRow):number|null=>{ const valid=selected.map(row=>row[key]).filter((value):value is number=>typeof value==="number"&&Number.isFinite(value)); return valid.length?valid.reduce((sum,value)=>sum+value,0):null; };
  const calls=total("inboundCalls"), clinics=total("clinics"), opd=total("opdReservations"), experts=total("expertInquiries");
  const average=calls!==null&&selected.length?calls/selected.length:null, opdShare=calls!==null&&calls>0&&opd!==null?opd/calls:null;
  const lastDate=selected[selected.length-1].date;
  const label=new Date(`${month}-01T00:00:00`).toLocaleString("en",{month:"long",year:"numeric"});
  const coverage=month===currentMonthKey()?`${label} MTD through ${new Date(`${lastDate}T00:00:00`).toLocaleString("en",{month:"short",day:"numeric"})}`:`${label} · ${selected.length} days`;
  const daily=selected.map(row=>({day:Number(row.date.slice(-2)),calls:row.inboundCalls,opd:row.opdReservations}));
  const topReasons=callReasonLabels.map(([key,name])=>({name,value:total(key)})).filter((item):item is {name:string;value:number}=>item.value!==null&&item.value>0).sort((a,b)=>b.value-a.value).slice(0,7);
  const monthly=[...new Set(rows.map(row=>row.periodMonth))].sort().map(period=>{ const monthRows=rows.filter(row=>row.periodMonth===period); return {month:new Date(`${period}-01T00:00:00`).toLocaleString("en",{month:"short"}),calls:monthRows.reduce((sum,row)=>sum+(typeof row.inboundCalls==="number"?row.inboundCalls:0),0)}; });

  return <section className="space-y-5">
    <SectionHeader eyebrow="Inbound Calls" title="Call Center Performance" description={`${coverage}. Call reasons may overlap, so OPD share is context—not a conversion rate.`}/>
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <CallStat label="Inbound Calls" value={formatNumber(calls)} note="Total received calls" icon={PhoneCall}/><CallStat label="Daily Average" value={formatNumber(average)} note={`${selected.length} reported days`} icon={CalendarDays}/><CallStat label="Clinic Calls" value={formatNumber(clinics)} note="Clinic-related calls" icon={Stethoscope}/><CallStat label="OPD Reservations" value={formatNumber(opd)} note="Recorded OPD reservations" icon={BarChart3}/><CallStat label="Expert Inquiries" value={formatNumber(experts)} note="Questions about visiting experts" icon={UserRoundSearch}/><CallStat label="OPD / Calls" value={opdShare===null?"N/A":`${(opdShare*100).toFixed(1)}%`} note="Operational share, not conversion" icon={BarChart3}/>
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <Card><h3 className="font-semibold text-navy-900">Daily call volume</h3><p className="text-xs text-fog-500 mt-1">Inbound calls and recorded OPD reservations by day.</p><div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="day" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Line type="monotone" dataKey="calls" name="Inbound Calls" stroke="#0E3145" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="opd" name="OPD Reservations" stroke="#56B6A9" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></Card>
      <Card><h3 className="font-semibold text-navy-900">Monthly inbound calls</h3><p className="text-xs text-fog-500 mt-1">June onward; the current month remains month-to-date.</p><div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Bar dataKey="calls" name="Inbound Calls" fill="#3C7391" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div></Card>
    </div>
    <Card><h3 className="font-semibold text-navy-900">Top recorded call reasons</h3><p className="text-xs text-fog-500 mt-1">Volumes are shown independently because source categories are not guaranteed to be mutually exclusive.</p><div className="space-y-3 mt-4">{topReasons.map((item,index)=><div key={item.name} className="flex items-center gap-3"><span className="w-6 text-xs font-semibold text-fog-400">#{index+1}</span><div className="flex-1"><div className="flex justify-between gap-3 text-sm"><span>{item.name}</span><span className="font-semibold">{formatNumber(item.value)}</span></div><div className="h-2 bg-fog-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-mint-500 rounded-full" style={{width:`${Math.max(2,(item.value/(topReasons[0]?.value||1))*100)}%`}}/></div></div></div>)}</div></Card>
  </section>;
}

export default function Performance(){
  const { month, spendType, setSpendType } = useFilters();
  const live=useDecisionLive();
  const [callSnapshot,setCallSnapshot]=useState<InboundCallRow[]>([]);
  useEffect(()=>{fetchInboundCallsSnapshot().then(setCallSnapshot).catch(()=>setCallSnapshot([]));},[]);
  const liveCalls=Array.isArray(live.data?.data.inboundCalls)?live.data!.data.inboundCalls as InboundCallRow[]:[];
  const calls=useMemo(()=>mergeInboundCalls(callSnapshot,liveCalls),[callSnapshot,liveCalls]);

  if(month===currentMonthKey() && live.loading && !live.data) return <EmptyState message="Loading live performance data…"/>;
  if(month===currentMonthKey() && !live.data && live.error) return <EmptyState message="Live performance data is temporarily unavailable. No demo data is shown."/>;
  if(live.data && month===live.data.currentMonth){
    const rows=live.data.data.overview.filter((r:any)=>r.month===month);
    const reachPlatforms=rows.filter((r:any)=>typeof r.reach==="number"&&Number.isFinite(r.reach)).map((r:any)=>r.platform);
    const reachLabel=reachPlatforms.length?`Available Reach (${reachPlatforms.join(" + ")})`:"Available Reach";
    const metrics=[[reachLabel,sumAvailable(rows,"reach")],["Views",sumAvailable(rows,"views")],["Interactions",sumAvailable(rows,"interactions")],["New Followers",sumAvailable(rows,"newFollowers")],["Profile Visits",sumAvailable(rows,"profileVisits")],["Link Clicks",sumAvailable(rows,"linkClicks")],["Instagram Profile Link Taps",sumAvailable(rows,"profileLinkTaps")],["Leads",sumAvailable(rows,"leads")],["Tracked Published",sumPublished(rows)]] as const;
    return <div className="space-y-10"><SectionHeader eyebrow={live.isLive ? "LIVE API · MTD" : live.deliverySource === "snapshot" ? "SNAPSHOT · MTD" : "CURRENT MTD"} title="Performance This Month" description="Current-month totals are read live from Monthly Overview. They are not compared directly with a closed full month because the periods are not equivalent." action={<span className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-mint-100 text-mint-700">{live.isLive ? "LIVE API" : live.deliverySource === "snapshot" ? "SNAPSHOT" : "SOURCE UNAVAILABLE"}</span>}/><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{metrics.map(([label,value])=><Card key={label}><p className="text-[10px] uppercase tracking-wide text-fog-400">{label}</p><p className="font-display text-2xl text-navy-900 mt-1">{formatNumber(value)}</p></Card>)}</div><Card><p className="text-sm text-navy-800">Paid vs Organic remains intentionally unavailable until that split is present in the source. Missing platform metrics are excluded from tracked totals rather than treated as zero.</p></Card><CallsSection month={month} rows={calls}/></div>;
  }

  const scope: "total"|"organic"|"paid" = spendType === "All" ? "total" : spendType.toLowerCase() as "organic"|"paid";
  const current = getMonthlyPerformance(month);
  if(!current) return <div className="space-y-10"><EmptyState message="No social performance data for the selected month."/><CallsSection month={month} rows={calls}/></div>;
  const scoped = current[scope];
  const hasSplit = Object.values(current.organic).some(v=>typeof v === "number") || Object.values(current.paid).some(v=>typeof v === "number");
  const chooseScope = (next:"total"|"organic"|"paid") => setSpendType(next === "total" ? "All" : next === "organic" ? "Organic" : "Paid");
  return <div className="space-y-10"><SectionHeader eyebrow="Trends" title="Performance Over Time" description="Closed months remain fixed historical source data." action={<div className="flex bg-warm-100 rounded-full p-1">{(["total","organic","paid"] as const).map(s=><button key={s} onClick={()=>chooseScope(s)} className={`text-xs font-semibold px-3.5 py-1.5 rounded-full capitalize ${scope===s?"bg-navy-900 text-warm-50":"text-fog-500"}`}>{s}</button>)}</div>}/><Card>{scope !== "total" && !hasSplit ? <EmptyState message="Paid / Organic split is not loaded in the real source yet."/> : <MonthlyTrendChart scope={scope} untilMonth={month}/>}</Card><section className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card><SectionHeader eyebrow="Conversion" title="Trackable Funnel" description={`${scope === "total" ? "Total" : scope === "organic" ? "Organic" : "Paid"} path for measurable steps. Leads are kept separate from the sequential path.`}/>{scope !== "total" && !hasSplit ? <EmptyState message="No Paid / Organic funnel source data yet."/> : <FunnelView funnel={{reach:scoped.reach,profileVisits:scoped.profileVisits,linkClicks:scoped.linkClicks,leads:scoped.leads}}/>}</Card><Card><SectionHeader eyebrow="Attribution" title="Paid vs Organic" description="This block stays intentionally empty until the real split exists in the source."/>{!hasSplit ? <EmptyState message="Paid / Organic split not available in Monthly Overview."/> : <div className="text-sm text-fog-500">Split data loaded.</div>}</Card></section><CallsSection month={month} rows={calls}/></div>;
}
