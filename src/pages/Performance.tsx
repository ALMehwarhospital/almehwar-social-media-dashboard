import { useFilters } from '../utils/FilterContext';
import { getMonthlyPerformance } from '../utils/selectors';
import { SectionHeader, Card, EmptyState } from '../components/dashboard/Primitives';
import { MonthlyTrendChart } from '../components/charts/MonthlyTrendChart';
import { FunnelView } from '../components/charts/FunnelView';
import { formatNumber } from '../utils/format';

export default function Performance(){
  const { month, spendType, setSpendType } = useFilters();
  const scope: 'total'|'organic'|'paid' = spendType === 'All' ? 'total' : spendType.toLowerCase() as 'organic'|'paid';
  const current = getMonthlyPerformance(month);
  if(!current) return <EmptyState message='No data for the selected month.'/>;
  const scoped = current[scope];

  const chooseScope = (next:'total'|'organic'|'paid') => {
    setSpendType(next === 'total' ? 'All' : next === 'organic' ? 'Organic' : 'Paid');
  };

  return <div className='space-y-10'>
    <SectionHeader eyebrow='Trends' title='Performance Over Time' description='Compare months across core metrics. Paid and organic views stay synchronized with the global filter.' action={<div className='flex bg-warm-100 rounded-full p-1'>{(['total','organic','paid'] as const).map(s=><button key={s} onClick={()=>chooseScope(s)} className={`text-xs font-semibold px-3.5 py-1.5 rounded-full capitalize ${scope===s?'bg-navy-900 text-warm-50':'text-fog-500'}`}>{s}</button>)}</div>}/>
    <Card><MonthlyTrendChart scope={scope}/></Card>
    <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      <Card>
        <SectionHeader eyebrow='Conversion' title='Trackable Funnel' description={`${scope === 'total' ? 'Total' : scope === 'organic' ? 'Organic' : 'Paid'} path for measurable steps. Leads are kept separate from the sequential path.`}/>
        <FunnelView funnel={{reach:scoped.reach,profileVisits:scoped.profileVisits,linkClicks:scoped.linkClicks,leads:scoped.leads}}/>
      </Card>
      <Card>
        <SectionHeader eyebrow='Attribution' title='Paid vs Organic'/>
        <div className='space-y-3'>{(['reach','interactions','linkClicks','leads'] as const).map(key=>{const organic=current.organic[key],paid=current.paid[key],total=organic+paid||1;return <div key={key}><div className='flex justify-between text-xs text-fog-500 mb-1 capitalize'><span>{key==='linkClicks'?'Link Clicks':key}</span><span>{formatNumber(total)}</span></div><div className='h-6 rounded-full overflow-hidden flex bg-warm-100'><div className='bg-mint-500' style={{width:`${organic/total*100}%`}}/><div className='bg-signal-amber' style={{width:`${paid/total*100}%`}}/></div><div className='flex justify-between text-[10px] text-fog-400 mt-1'><span>Organic {Math.round(organic/total*100)}%</span><span>Paid {Math.round(paid/total*100)}%</span></div></div>})}</div>
      </Card>
    </section>
  </div>
}
