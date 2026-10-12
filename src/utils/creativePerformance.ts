export type ScoreComponent = {label:string;score:number;weight:number;effectiveWeight:number;points:number;value:number;basis:string;comparisonCount:number};
export type PerformanceAnalysis = {score:number|null;confidence:"High"|"Medium"|"Low"|"Insufficient";mature:boolean;status:"High Performer"|"Competitive"|"Needs Attention"|"Needs More Data";reason:string;peerCount:number;components:ScoreComponent[];source:"Automatic"|"N/A"};
function contentAgeDays(item:any):number|null {
  const value=String(item.date || "");
  const match=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const iso=match?`${match[3]}-${match[2].padStart(2,"0")}-${match[1].padStart(2,"0")}`:value.slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const timestamp=Date.parse(iso+"T00:00:00+03:00");
  return Number.isFinite(timestamp)?(Date.now()-timestamp)/86400000:null;
}
function available(value:any):value is number { return typeof value === "number" && Number.isFinite(value); }

function canonicalUrl(value:any) {
  const raw=String(value || "").trim();
  try { const url=new URL(raw); const host=url.hostname.toLowerCase().replace(/^www\./,"");
    if (host==="youtu.be") return `youtube:${url.pathname.split("/")[1]}`;
    if (host.endsWith("youtube.com")) return `youtube:${url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop()}`;
    return `${host}${url.pathname.replace(/\/$/,"")}`;
  } catch { return raw; }
}
export function itemKeys(item:any) {
  const keys:string[]=[];
  for (const id of [item.id,item.contentId,item.videoId,item.mediaId,item.postId]) if (id) keys.push(`id:${String(id)}`);
  if (item.url) keys.push(`url:${canonicalUrl(item.url)}`);
  if (item.name || item.title) keys.push(`name:${item.platform}|${String(item.name || item.title).trim().toLowerCase()}`);
  return keys;
}
export function formatGroup(item:any) {
  const raw=String(item.format || "").toLowerCase();
  if (raw.includes("carousel")) return "Carousel";
  if (raw.includes("long")) return "Long Video";
  if (raw.includes("reel") || raw.includes("short")) return "Reel / Short Video";
  if (raw.includes("static") || raw.includes("image") || raw.includes("post")) return "Static Design";
  if (available(item.durationSeconds)) return item.durationSeconds>90?"Long Video":"Reel / Short Video";
  return "Needs classification";
}
export function isVideoCreative(item:any) { return /video|reel|short/i.test(formatGroup(item)); }
function average(values:any[]) { const valid=values.filter(available) as number[]; return valid.length?valid.reduce((sum,value)=>sum+value,0)/valid.length:null; }
function watchQuality(item:any) {
  const ratio=available(item.avgWatchTimeSeconds)&&available(item.durationSeconds)&&item.durationSeconds>0?Math.min(1,item.avgWatchTimeSeconds/item.durationSeconds):null;
  return average([item.avgPercentWatched,item.completionRate,item.retention25,item.retention50,item.retention75,ratio]);
}
function valueActionRate(item:any) {
  if (available(item.valueRate)) return item.valueRate;
  const actions=[item.shares,item.saves].filter(available) as number[];
  const denominator=available(item.reach)?item.reach:available(item.views)?item.views:item.impressions;
  return actions.length&&available(denominator)&&denominator>0?actions.reduce((sum,value)=>sum+value,0)/denominator:null;
}
function intentRate(item:any) {
  const actions=[item.linkClicks,item.profileVisits,item.leads,item.messages].filter(available) as number[];
  const denominator=available(item.reach)?item.reach:available(item.views)?item.views:item.impressions;
  return actions.length&&available(denominator)&&denominator>0?actions.reduce((sum,value)=>sum+value,0)/denominator:null;
}
function metricBasis(item:any,label:string) {
  const denominator=available(item.reach)?"Reach":available(item.views)?"Views":"Impressions";
  if(label==="Engagement") return `Interactions ÷ ${item.engagementDenominator || (item.platform==="TikTok"?"Views":item.platform==="YouTube"||item.platform==="LinkedIn"?"Impressions":"Reach")}`;
  if(label==="Shares & saves") return `${[available(item.shares)?"Shares":null,available(item.saves)?"Saves":null].filter(Boolean).join(" + ")} ÷ ${available(item.valueRate)?item.platform==="TikTok"?"Views":"Reach":denominator}`;
  if(label==="Intent") return `${[available(item.linkClicks)?"Clicks":null,available(item.profileVisits)?"Profile visits":null,available(item.leads)?"Leads":null,available(item.messages)?"Messages":null].filter(Boolean).join(" + ")} ÷ ${denominator}`;
  if(label==="Distribution") return available(item.views)?"Views":available(item.impressions)?"Impressions":"Reach";
  const metrics=[available(item.avgPercentWatched)?"Avg viewed":null,available(item.completionRate)?"Completion":null,...[25,50,75].filter(n=>available(item[`retention${n}`])).map(n=>`Retention ${n}%`),available(item.avgWatchTimeSeconds)&&available(item.durationSeconds)&&item.durationSeconds>0?"Watch time ÷ duration":null].filter(Boolean);
  return `Average: ${metrics.join(" + ")}`;
}
function distributionValue(item:any) { return available(item.views)?item.views:available(item.impressions)?item.impressions:available(item.reach)?item.reach:null; }
function percentile(values:number[],value:number) {
  if (values.length<=1) return .5;
  const below=values.filter((candidate)=>candidate<value).length;
  const equal=values.filter((candidate)=>candidate===value).length;
  return (below+Math.max(0,equal-1)/2)/(values.length-1);
}
function lowerQuartile(values:number[]) { if (!values.length) return 0; const sorted=[...values].sort((a,b)=>a-b); return sorted[Math.floor((sorted.length-1)*.25)]; }

export function calculatePerformance(items:any[],currentMonth:string) {
  const groups=new Map<string,any[]>();
  for (const item of items) { const key=`${item.month}|${item.platform}|${formatGroup(item)}|${item.spendType || "Total / Unsplit"}`; groups.set(key,[...(groups.get(key)||[]),item]); }
  return items.map((item:any)=>{
    const peers=groups.get(`${item.month}|${item.platform}|${formatGroup(item)}|${item.spendType || "Total / Unsplit"}`)||[item];
    const raw=isVideoCreative(item)?[
      {label:"Viewing quality",weight:35,value:watchQuality(item),read:(peer:any)=>watchQuality(peer)},
      {label:"Engagement",weight:30,value:item.engagementRate,read:(peer:any)=>peer.engagementRate},
      {label:"Shares & saves",weight:20,value:valueActionRate(item),read:(peer:any)=>valueActionRate(peer)},
      {label:"Distribution",weight:15,value:distributionValue(item),read:(peer:any)=>distributionValue(peer)},
    ]:[
      {label:"Engagement",weight:35,value:item.engagementRate,read:(peer:any)=>peer.engagementRate},
      {label:"Shares & saves",weight:25,value:valueActionRate(item),read:(peer:any)=>valueActionRate(peer)},
      {label:"Distribution",weight:25,value:distributionValue(item),read:(peer:any)=>distributionValue(peer)},
      {label:"Intent",weight:15,value:intentRate(item),read:(peer:any)=>intentRate(peer)},
    ];
    const components:ScoreComponent[]=raw.flatMap((component)=>{
      if (!available(component.value)) return [];
      const values=peers.map(component.read).filter(available) as number[];
      return values.length>=3?[{label:component.label,weight:component.weight,effectiveWeight:0,points:0,value:component.value as number,basis:metricBasis(item,component.label),comparisonCount:values.length,score:Math.round(percentile(values,component.value as number)*100)}]:[];
    });
    const weight=components.reduce((sum,component)=>sum+component.weight,0);
    for (const component of components) { component.effectiveWeight=weight>0?component.weight/weight*100:0; component.points=component.score*component.effectiveWeight/100; }
    const automatic=components.length>=2&&weight>0?Math.round(components.reduce((sum,component)=>sum+component.score*component.weight,0)/weight):null;
    const score=automatic;
    const source:PerformanceAnalysis["source"]=automatic!==null?"Automatic":"N/A";
    const distribution=distributionValue(item);
    const peerDistribution=peers.map(distributionValue).filter(available) as number[];
    const ageDays=contentAgeDays(item);
    const mature=item.month!==currentMonth||(ageDays!==null&&ageDays>=7&&available(distribution)&&distribution>=Math.max(50,lowerQuartile(peerDistribution)));
    const confidence:PerformanceAnalysis["confidence"]=score===null?"Insufficient":components.length>=3&&peers.length>=5?"High":components.length>=2&&peers.length>=3?"Medium":"Low";
    const status:PerformanceAnalysis["status"]=score===null||!mature?"Needs More Data":score>=70?"High Performer":score<40?"Needs Attention":"Competitive";
    const strongest=components.length?[...components].sort((a,b)=>b.score-a.score)[0]:null;
    const weakest=components.length?[...components].sort((a,b)=>a.score-b.score)[0]:null;
    const reason=status==="Needs More Data"?(score===null?"Not enough comparable metrics yet.":"Performance is still maturing."):status==="High Performer"?`Strongest signal: ${strongest?.label||"overall performance"}.`:status==="Needs Attention"?`Main gap: ${weakest?.label||"overall performance"}.`:`Competitive result; strongest in ${strongest?.label||"available metrics"}.`;
    const analysis:PerformanceAnalysis={score,source,confidence,mature,status,reason,peerCount:peers.length,components};
    return {...item,performanceScore:score,analysis};
  });
}
