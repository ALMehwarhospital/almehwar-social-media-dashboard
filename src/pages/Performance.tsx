import { useFilters } from '../utils/FilterContext';
import { getMonthlyPerformance } from '../utils/selectors';
import { SectionHeader, Card, EmptyState } from '../components/dashboard/Primitives';
import { MonthlyTrendChart } from '../components/charts/MonthlyTrendChart';
import { FunnelView } from '../components/charts/FunnelView';

export default function Performance(){
  const { month, spendType, setSpendType } = useFilters();
  const scope: 'total'|'organic'|'paid' = spendType === 'All' ? 'total' : spendType.toLowerCase() as 'organic'|'paid';
  const current = getMonthlyPerformance(month);
  if(!current) return <EmptyState message='No data for the selected month.'/>;
  const scoped = current[scope];
  const hasSplit = Object.values(current.organic).some(v=>v>0) || Object.values(current.paid).some(v=>v>0);

  const chooseScope = (next:'total'|'organic'|'paid') => {
    setSpendType(next === 'total' ? 'All' : next === 'organic' ? 'Organic' : 'Paid');
  };

  return <div className='space-y-10'>
    <SectionHeader eyebrow='Trends' title='Performance Over Time' description='The chart now follows the selected month: June shows June, July shows June–July, and August shows the full June–August trend.' action={<div className='flex bg-warm-100 rounded-full p-1'>{(['total','organic','paid'] as const).map(s=><button key={s} onClick={()=>chooseScope(s)} className={`text-xs font-semibold px-3.5 py-1.5 rounded-full capitalize ${scope===s?'bg-navy-900 text-warm-50':'text-fog-500'}`}>{s}</button>)}</div>}/>
    <Card>{scope !== 'total' && !hasSplit ? <EmptyState message='Paid / Organic split is not loaded in the real source yet.'/> : <MonthlyTrendChart scope={scope} untilMonth={month}/>}</Card>
    <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      <Card>
        <SectionHeader eyebrow='Conversion' title='Trackable Funnel' description={`${scope === 'total' ? 'Total' : scope === 'organic' ? 'Organic' : 'Paid'} path for measurable steps. Leads are kept separate from the sequential path.`}/>
        {scope !== 'total' && !hasSplit ? <EmptyState message='No Paid / Organic funnel source data yet.'/> : <FunnelView funnel={{reach:scoped.reach,profileVisits:scoped.profileVisits,linkClicks:scoped.linkClicks,leads:scoped.leads}}/>}
      </Card>
      <Card>
        <SectionHeader eyebrow='Attribution' title='Paid vs Organic' description='This block stays intentionally empty until the real split exists in the source.'/>
        {!hasSplit ? <EmptyState message='Paid / Organic split not available in Monthly Overview.'/> : <div className='text-sm text-fog-500'>Split data loaded.</div>}
      </Card>
    </section>
  </div>
}
