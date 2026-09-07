import { useState } from 'react';
import { AreaChart,Area,XAxis,YAxis,Tooltip,ResponsiveContainer,CartesianGrid } from 'recharts';
import { socialDashboard } from '../../data/socialDashboard';
import { monthLabel,formatNumber } from '../../utils/format';
import type { MonthlyKpiSet } from '../../types/dashboard';

const METRICS:{key:keyof MonthlyKpiSet;label:string}[]=[
  {key:'reach',label:'Reach'},
  {key:'views',label:'Views'},
  {key:'interactions',label:'Interactions'},
  {key:'newFollowers',label:'Followers'},
  {key:'profileVisits',label:'Profile Visits'},
  {key:'linkClicks',label:'Clicks'},
  {key:'leads',label:'Leads'}
];

export function MonthlyTrendChart({scope='total',untilMonth}:{scope?:'total'|'organic'|'paid';untilMonth?:string}){
  const[metric,setMetric]=useState<keyof MonthlyKpiSet>('reach');
  const selectedIndex = untilMonth ? socialDashboard.meta.months.indexOf(untilMonth) : socialDashboard.meta.months.length - 1;
  const chartData=socialDashboard.monthlyPerformance
    .filter(m=>selectedIndex < 0 || socialDashboard.meta.months.indexOf(m.month) <= selectedIndex)
    .map(m=>({label:monthLabel(m.month),value:m[scope][metric]}));

  return <div>
    <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
      <div className='flex flex-wrap gap-1.5'>{METRICS.map(m=><button key={m.key} onClick={()=>setMetric(m.key)} className={`text-xs font-medium px-3 py-1.5 rounded-full ${metric===m.key?'bg-navy-900 text-warm-50':'bg-warm-100 text-fog-600'}`}>{m.label}</button>)}</div>
      {untilMonth&&<span className='text-[11px] text-fog-500 bg-warm-100 rounded-full px-3 py-1.5'>Trend through {monthLabel(untilMonth)}</span>}
    </div>
    <div className='h-64'><ResponsiveContainer width='100%' height='100%'><AreaChart data={chartData}><CartesianGrid strokeDasharray='3 3' stroke='#E5E1D6' vertical={false}/><XAxis dataKey='label' tick={{fontSize:12,fill:'#6B7484'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:'#6B7484'}} axisLine={false} tickLine={false} tickFormatter={v=>formatNumber(v)} width={52}/><Tooltip formatter={v=>[formatNumber(Number(v)),METRICS.find(m=>m.key===metric)?.label??'']} contentStyle={{borderRadius:12,border:'1px solid #E5E1D6',fontSize:13}}/><Area type='monotone' dataKey='value' stroke='#2FBF9F' strokeWidth={2.5} fill='#2FBF9F' fillOpacity={0.12}/></AreaChart></ResponsiveContainer></div>
  </div>
}
