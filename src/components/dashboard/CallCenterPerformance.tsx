import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, PhoneCall, Stethoscope, UserRoundSearch } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDecisionLive } from "../../utils/useDecisionLive";
import { SectionHeader, Card, EmptyState } from "./Primitives";
import { formatNumber } from "../../utils/format";
import { INBOUND_CALLS_TRACKER_URL, fetchInboundCallsSnapshot, mergeInboundCalls, type InboundCallRow } from "../../data/inboundCalls";

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
  if(!selected.length) return <section><SectionHeader eyebrow="Inbound Calls" title="Call Center Performance" description="Daily call data is recorded in the separate Daily Calls Tracker."/><EmptyState message="No inbound call data for the selected month."/></section>;
  const total=(key:keyof InboundCallRow):number|null=>{ const valid=selected.map(row=>row[key]).filter((value):value is number=>typeof value==="number"&&Number.isFinite(value)); return valid.length?valid.reduce((sum,value)=>sum+value,0):null; };
  const calls=total("inboundCalls"), clinics=total("clinics"), opd=total("opdReservations"), experts=total("expertInquiries");
  const average=calls!==null&&selected.length?calls/selected.length:null, opdShare=calls!==null&&calls>0&&opd!==null?opd/calls:null;
  const lastDate=selected[selected.length-1].date;
  const label=new Date(`${month}-01T00:00:00`).toLocaleString("en",{month:"long",year:"numeric"});
  const coverage=month===currentMonthKey()?`${label} MTD through ${new Date(`${lastDate}T00:00:00`).toLocaleString("en",{month:"short",day:"numeric"})}`:`${label} · ${selected.length} days`;
  const daily=selected.map(row=>({day:Number(row.date.slice(-2)),calls:row.inboundCalls,opd:row.opdReservations}));
  const topReasons=callReasonLabels.map(([key,name])=>({name,value:total(key)})).filter((item):item is {name:string;value:number}=>item.value!==null&&item.value>0).sort((a,b)=>b.value-a.value).slice(0,7);
  const monthly=[...new Set(rows.map(row=>row.periodMonth))].sort().map(period=>{ const monthRows=rows.filter(row=>row.periodMonth===period); return {month:`${new Date(`${period}-01T00:00:00`).toLocaleString("en",{month:"short",year:"2-digit"})}${period===currentMonthKey()?" MTD":""}`,calls:monthRows.reduce((sum,row)=>sum+(typeof row.inboundCalls==="number"?row.inboundCalls:0),0)}; });

  return <section className="space-y-5">
    <SectionHeader eyebrow="Inbound Calls" title="Call Center Performance" description={`${coverage}. Call reasons may overlap, so OPD share is context—not a conversion rate.`} action={<a href={INBOUND_CALLS_TRACKER_URL} target="_blank" rel="noreferrer" className="rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-semibold text-navy-800">Open Daily Calls Tracker ↗</a>}/>
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <CallStat label="Inbound Calls" value={formatNumber(calls)} note="Total received calls" icon={PhoneCall}/><CallStat label="Daily Average" value={formatNumber(average)} note={`${selected.length} reported days`} icon={CalendarDays}/><CallStat label="Clinic Calls" value={formatNumber(clinics)} note="Clinic-related calls" icon={Stethoscope}/><CallStat label="OPD Reservations" value={formatNumber(opd)} note="Recorded OPD reservations" icon={BarChart3}/><CallStat label="Expert Inquiries" value={formatNumber(experts)} note="Questions about visiting experts" icon={UserRoundSearch}/><CallStat label="OPD / Calls" value={opdShare===null?"N/A":`${(opdShare*100).toFixed(1)}%`} note="Operational share, not conversion" icon={BarChart3}/>
    </div>
    <div className="grid lg:grid-cols-2 gap-5">
      <Card><h3 className="font-semibold text-navy-900">Daily call volume</h3><p className="text-xs text-fog-500 mt-1">Inbound calls and recorded OPD reservations by day.</p><div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><LineChart data={daily}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="day" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Line type="monotone" dataKey="calls" name="Inbound Calls" stroke="#0E3145" strokeWidth={2.5} dot={false}/><Line type="monotone" dataKey="opd" name="OPD Reservations" stroke="#56B6A9" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div></Card>
      <Card><h3 className="font-semibold text-navy-900">Monthly inbound calls</h3><p className="text-xs text-fog-500 mt-1">All recorded months; the current month remains month-to-date.</p><div className="h-72 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" fontSize={10}/><YAxis fontSize={10}/><Tooltip/><Bar dataKey="calls" name="Inbound Calls" fill="#3C7391" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></div></Card>
    </div>
    <Card><h3 className="font-semibold text-navy-900">Top recorded call reasons</h3><p className="text-xs text-fog-500 mt-1">Volumes are shown independently because source categories are not guaranteed to be mutually exclusive.</p><div className="space-y-3 mt-4">{topReasons.map((item,index)=><div key={item.name} className="flex items-center gap-3"><span className="w-6 text-xs font-semibold text-fog-400">#{index+1}</span><div className="flex-1"><div className="flex justify-between gap-3 text-sm"><span>{item.name}</span><span className="font-semibold">{formatNumber(item.value)}</span></div><div className="h-2 bg-fog-100 rounded-full mt-1 overflow-hidden"><div className="h-full bg-mint-500 rounded-full" style={{width:`${Math.max(2,(item.value/(topReasons[0]?.value||1))*100)}%`}}/></div></div></div>)}</div></Card>
  </section>;
}

export function CallCenterPerformance({ month }: { month: string }) {
  const live = useDecisionLive();
  const [snapshot, setSnapshot] = useState<InboundCallRow[]>([]);
  useEffect(() => {
    let active = true;
    fetchInboundCallsSnapshot().then(rows => { if (active) setSnapshot(rows); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const liveRows = live.data?.data.inboundCalls;
  const rows = useMemo(() => mergeInboundCalls(snapshot, (liveRows ?? []) as InboundCallRow[]), [snapshot, liveRows]);
  return <CallsSection month={month} rows={rows} />;
}
