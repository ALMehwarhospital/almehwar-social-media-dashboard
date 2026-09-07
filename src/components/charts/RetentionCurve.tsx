import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import type { RetentionProblem } from "../../types/dashboard";

const PROBLEM_ZONE: Record<RetentionProblem,{from:number;to:number}|null>={"Hook Problem":{from:0,to:2},"Script / Pacing Problem":{from:2,to:5},"CTA Problem":null,"None Detected":null};

export function RetentionCurve({curve,problem}:{curve:number[];problem:RetentionProblem}){
  const data=curve.map((v,i)=>({i,v}));
  const zone=PROBLEM_ZONE[problem];
  return <div className="h-40"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{top:8,right:8,left:0,bottom:0}}><XAxis dataKey="i" tick={false} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{fontSize:10,fill:"#7D6D59"}} axisLine={false} tickLine={false} width={30}/>{zone&&<ReferenceArea x1={zone.from} x2={zone.to} fill="#E2604F" fillOpacity={0.12}/>}<Tooltip formatter={(v)=>[`${v}% remaining`,"Audience"]} labelFormatter={()=>""} contentStyle={{borderRadius:10,border:"1px solid #E2EAEF",fontSize:12,background:"#FFFFFF",color:"#0E3145"}}/><Line type="monotone" dataKey="v" stroke="#0B1E33" strokeWidth={2.25} dot={false}/></LineChart></ResponsiveContainer></div>
}
