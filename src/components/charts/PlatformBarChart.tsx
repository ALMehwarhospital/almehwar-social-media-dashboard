import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatNumber } from "../../utils/format";

const PLATFORM_COLORS:Record<string,string>={
  Facebook:"#3C7391",
  Instagram:"#916C3C",
  TikTok:"#0E3145",
  YouTube:"#DEAF71",
  LinkedIn:"#453015"
};

interface Datum{platform:string;value:number}

export function PlatformBarChart({data,valueLabel,isPercent=false}:{data:Datum[];valueLabel:string;isPercent?:boolean}){
  return <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{top:10,right:10,left:0,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#E2EAEF" vertical={false}/><XAxis dataKey="platform" tick={{fontSize:12,fill:"#7D6D59"}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:"#7D6D59"}} axisLine={false} tickLine={false} tickFormatter={(v)=>(isPercent?`${v}%`:formatNumber(v))} width={44}/><Tooltip formatter={(v)=>[isPercent?`${v}%`:formatNumber(Number(v)),valueLabel]} contentStyle={{borderRadius:12,border:"1px solid #E2EAEF",fontSize:13,background:"#FFFFFF",color:"#0E3145"}}/><Bar dataKey="value" radius={[8,8,0,0]}>{data.map((d)=><Cell key={d.platform} fill={PLATFORM_COLORS[d.platform]??"#3C7391"}/>)}</Bar></BarChart></ResponsiveContainer></div>
}
