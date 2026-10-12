import { available, formatGroup } from "./creativeInventory";
export type ReportedMetric={key:string;label:string;value:number;unit:"count"|"percent"|"seconds";basis:string;reference:"source"|"calculated"};
export function audienceDenominator(item:any) {
  const unique=item.platform==="Facebook"&&(item.source==="Facebook Raw"||item.reachMetric==="uniqueViewers");
  const requested=String(item.engagementDenominator||"").toLowerCase();
  if(unique&&available(item.reach))return {value:item.reach,label:"Unique viewers"};
  if(requested==="views"&&available(item.views))return {value:item.views,label:"Views"};
  if(requested==="impressions"&&available(item.impressions))return {value:item.impressions,label:"Impressions"};
  if(available(item.reach))return {value:item.reach,label:"Reach"};
  if(available(item.views))return {value:item.views,label:"Views"};
  return {value:item.impressions,label:"Impressions"};
}
export function metricDisplay(metric:ReportedMetric):string {
  if(metric.unit==="percent")return metric.value===0?"0%":metric.value>0&&metric.value<.000001?"<0.0001%":`${(metric.value*100).toFixed(4).replace(/\.?0+$/,"")}%`;
  if(metric.unit==="seconds")return `${Math.round(metric.value*1000)/1000}s`;
  return new Intl.NumberFormat("en-US").format(metric.value);
}
/** No ranks, weights, success thresholds or fabricated composite performance score. */
export function reportedMetrics(item:any):ReportedMetric[] {
  const out:ReportedMetric[]=[];
  const add=(key:string,label:string,value:any,unit:ReportedMetric["unit"],basis:string,reference:ReportedMetric["reference"]="source")=>{if(available(value))out.push({key,label,value,unit,basis,reference});};
  const denominator=audienceDenominator(item);
  add("views","Views",item.views,"count","Reported by platform");
  add("audience",item.platform==="Facebook"&&denominator.label==="Unique viewers"?"Unique viewers":"Reach",item.reach,"count","Reported by platform");
  add("impressions","Impressions",item.impressions,"count","Reported by platform");
  for(const [key,label] of [["interactions","Interactions"],["shares","Shares"],["saves","Saves"],["linkClicks","Link clicks"],["profileVisits","Profile visits"],["followersGained","Followers gained"],["leads","Leads"],["messages","Messages"]])add(key,label,item[key],"count","Reported by platform");
  if(available(denominator.value)&&denominator.value>0)for(const [key,label] of [["interactions","Interaction rate"],["shares","Share rate"],["saves","Save rate"]]) {
    add(`${key}Rate`,label,available(item[key])?item[key]/denominator.value:null,"percent",`${key[0].toUpperCase()+key.slice(1)} ÷ ${denominator.label} (internal ratio)`,"calculated");
  }
  add("duration","Duration",item.durationSeconds,"seconds","Reported by source");
  add("watch","Average watch time",item.avgWatchTimeSeconds,"seconds","Reported by platform");
  if(available(item.avgPercentWatched))add("viewed","Average viewed",item.avgPercentWatched,"percent","Reported / derived by source");
  else if(available(item.avgWatchTimeSeconds)&&available(item.durationSeconds)&&item.durationSeconds>0)add("viewed","Average viewed",item.avgWatchTimeSeconds/item.durationSeconds,"percent","Average watch time ÷ duration","calculated");
  add("completion","Completion",item.completionRate,"percent",item.platform==="Facebook"&&item.source==="Facebook Raw"?"Organic 97% completions ÷ organic 3s+ views":"Source-specific completion definition");
  for(const n of [3,25,50,75])add(`retention${n}`,`Retention ${n}${n===3?"s":"%"}`,item[`retention${n}`],"percent","Platform retention metric");
  return out;
}
function windowSignature(item:any):string|null {
  // Require explicit source metadata. Publication dates cannot establish a common observation window.
  const w=item.measurementWindow;
  if(!w||w.verified!==true||!available(w.days)||w.days<=0)return null;
  if(w.kind==="publication-age"&&w.complete===true)return `First ${w.days} days`;
  if(w.kind==="reporting-period"&&/^\d{4}-\d{2}-\d{2}$/.test(w.start)&&/^\d{4}-\d{2}-\d{2}$/.test(w.end))return `${w.start}–${w.end}`;
  return null;
}
export function comparableMetricGroups(items:any[]) {
  const groups=new Map<string,any[]>();
  for(const item of items){const window=windowSignature(item);if(!window||!["Old","New"].includes(item.directionReview.direction)||!["Organic","Paid"].includes(item.spendType))continue;
    const key=[item.platform,formatGroup(item),item.spendType,window].join("|");groups.set(key,[...(groups.get(key)||[]),item]);}
  return [...groups.entries()].flatMap(([key,rows])=>{const old=rows.filter(i=>i.directionReview.direction==="Old"),fresh=rows.filter(i=>i.directionReview.direction==="New");
    if(!old.length||!fresh.length)return [];
    const a=new Map(reportedMetrics(old[0]).map(m=>[m.key,m]));
    const metrics=[...a.values()].flatMap(metric=>{const read=(items:any[])=>items.map(i=>reportedMetrics(i).find(m=>m.key===metric.key&&m.basis===metric.basis)?.value);
      const x=read(old),y=read(fresh);if(!x.every(available)||!y.every(available))return [];
      const avg=(v:number[])=>v.reduce((s,n)=>s+n,0)/v.length;
      return [{...metric,oldValue:avg(x as number[]),newValue:avg(y as number[])}];});
    return [{key,oldCount:old.length,newCount:fresh.length,metrics}];});
}
