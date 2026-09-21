import { useFilters } from "../utils/FilterContext";
import { useDecisionLive } from "../utils/useDecisionLive";
import { getMonthlyPerformance } from "../utils/selectors";
import { SectionHeader, Card, EmptyState } from "../components/dashboard/Primitives";
import { MonthlyTrendChart } from "../components/charts/MonthlyTrendChart";
import { FunnelView } from "../components/charts/FunnelView";
import { formatNumber } from "../utils/format";

function sumAvailable(rows:any[], key:string):number|null{
  const vals=rows.map(r=>r[key]).filter(v=>typeof v==="number"&&Number.isFinite(v));
  return vals.length?vals.reduce((a,b)=>a+b,0):null;
}

function currentMonthKey(){
  const now=new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
}

export default function Performance(){
  const { month, spendType, setSpendType } = useFilters();
  const live=useDecisionLive();

  if(month===currentMonthKey() && live.loading && !live.data) return <EmptyState message="Loading live performance data…"/>;
  if(month===currentMonthKey() && !live.data && live.error) return <EmptyState message="Live performance data is temporarily unavailable. No demo data is shown."/>;
  if(live.data && month===live.data.currentMonth){
    const rows=live.data.data.overview.filter((r:any)=>r.month===month);
    const metrics=[
      ["Tracked Reach",sumAvailable(rows,"reach")],
      ["Views",sumAvailable(rows,"views")],
      ["Interactions",sumAvailable(rows,"interactions")],
      ["New Followers",sumAvailable(rows,"newFollowers")],
      ["Profile Visits",sumAvailable(rows,"profileVisits")],
      ["Link Clicks",sumAvailable(rows,"linkClicks")],
      ["Leads",sumAvailable(rows,"leads")],
      ["Published",rows.reduce((s:number,r:any)=>s+(r.posts??0)+(r.videos??0),0)]
    ] as const;

    return <div className="space-y-10">
      <SectionHeader
        eyebrow="LIVE MTD"
        title="Performance This Month"
        description="Current-month totals are read live from Monthly Overview. They are not compared directly with a closed full month because the periods are not equivalent."
        action={<span className="text-[10px] font-semibold px-2.5 py-1.5 rounded-full bg-mint-100 text-mint-700">LIVE FROM SHEET</span>}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(([label,value])=><Card key={label}>
          <p className="text-[10px] uppercase tracking-wide text-fog-400">{label}</p>
          <p className="font-display text-2xl text-navy-900 mt-1">{formatNumber(value)}</p>
        </Card>)}
      </div>
      <Card>
        <p className="text-sm text-navy-800">Paid vs Organic remains intentionally unavailable until that split is present in the source. Missing platform metrics are excluded from tracked totals rather than treated as zero.</p>
      </Card>
    </div>;
  }

  const scope: "total"|"organic"|"paid" = spendType === "All" ? "total" : spendType.toLowerCase() as "organic"|"paid";
  const current = getMonthlyPerformance(month);
  if(!current) return <EmptyState message="No data for the selected month."/>;
  const scoped = current[scope];
  const hasSplit = Object.values(current.organic).some(v=>v>0) || Object.values(current.paid).some(v=>v>0);

  const chooseScope = (next:"total"|"organic"|"paid") => {
    setSpendType(next === "total" ? "All" : next === "organic" ? "Organic" : "Paid");
  };

  return <div className="space-y-10">
    <SectionHeader eyebrow="Trends" title="Performance Over Time" description="Closed months remain fixed historical source data." action={<div className="flex bg-warm-100 rounded-full p-1">{(["total","organic","paid"] as const).map(s=><button key={s} onClick={()=>chooseScope(s)} className={`text-xs font-semibold px-3.5 py-1.5 rounded-full capitalize ${scope===s?"bg-navy-900 text-warm-50":"text-fog-500"}`}>{s}</button>)}</div>}/>
    <Card>{scope !== "total" && !hasSplit ? <EmptyState message="Paid / Organic split is not loaded in the real source yet."/> : <MonthlyTrendChart scope={scope} untilMonth={month}/>}</Card>
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <SectionHeader eyebrow="Conversion" title="Trackable Funnel" description={`${scope === "total" ? "Total" : scope === "organic" ? "Organic" : "Paid"} path for measurable steps. Leads are kept separate from the sequential path.`}/>
        {scope !== "total" && !hasSplit ? <EmptyState message="No Paid / Organic funnel source data yet."/> : <FunnelView funnel={{reach:scoped.reach,profileVisits:scoped.profileVisits,linkClicks:scoped.linkClicks,leads:scoped.leads}}/>}
      </Card>
      <Card>
        <SectionHeader eyebrow="Attribution" title="Paid vs Organic" description="This block stays intentionally empty until the real split exists in the source."/>
        {!hasSplit ? <EmptyState message="Paid / Organic split not available in Monthly Overview."/> : <div className="text-sm text-fog-500">Split data loaded.</div>}
      </Card>
    </section>
  </div>;
}
