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
      <div className='flex flex-wrap gap-1.5'>{METRICS.map(m=><button key={m.key} onClick={()=>setMetric(m.key)} className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${metric===m.key?'bg-navy-900 text-warm-50':'bg-hospital-mist/60 text-fog-600 hover:bg-mint-100'}`}>{m.label}</button>)}</div>
      {untilMonth&&<span className='text-[11px] text-fog-500 bg-hospital-mist/55 rounded-full px-3 py-1.5'>Trend through {monthLabel(untilMonth)}</span>}
    </div>
    <div className='h-64'><ResponsiveContainer width='100%' height='100%'><AreaChart data={chartData}><CartesianGrid strokeDasharray='3 3' stroke='#E2EAEF' vertical={false}/><XAxis dataKey='label' tick={{fontSize:12,fill:'#7D6D59'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:'#7D6D59'}} axisLine={false} tickLine={false} tickFormatter={v=>formatNumber(v)} width={52}/><Tooltip formatter={v=>[formatNumber(Number(v)),METRICS.find(m=>m.key===metric)?.label??'']} contentStyle={{borderRadius:12,border:'1px solid #E2EAEF',fontSize:13,background:'#FFFFFF',color:'#0E3145'}}/><Area type='monotone' dataKey='value' stroke='#3C7391' strokeWidth={2.5} fill='#3C7391' fillOpacity={0.14}/></AreaChart></ResponsiveContainer></div>
  </div>
}
