import { useMemo,useState } from 'react';
import { useFilters } from '../utils/FilterContext';
import { getContent,pillarSummary,formatSummary } from '../utils/selectors';
import { SectionHeader,Card,EmptyState } from '../components/dashboard/Primitives';
import { ContentTable } from '../components/content/ContentTable';
import type { ContentItem } from '../types/dashboard';
import { formatNumber,formatPercent } from '../utils/format';

const RANK=[['reach','Reach'],['engagementRate','Engagement Rate'],['interactions','Interactions'],['followersGained','Followers Gained'],['linkClicks','Link Clicks']] as const;

function metricValue(item: ContentItem, key: keyof ContentItem) {
  const value = item[key];
  return typeof value === 'number' ? value : 0;
}

export default function ContentIntelligence(){
  const{month,platform,pillar,format,spendType}=useFilters();
  const[rank,setRank]=useState<keyof ContentItem>('reach');
  const filters={
    platform:platform==='All'?undefined:platform,
    pillar:pillar==='All'?undefined:pillar,
    format:format==='All'?undefined:format,
    spendType:spendType==='All'?undefined:spendType,
  };
  const items=useMemo(()=>getContent(month,filters),[month,platform,pillar,format,spendType]);
  if(!items.length)return <EmptyState message='No content for this selection.'/>;

  const sorted=[...items].sort((a,b)=>metricValue(b,rank)-metricValue(a,rank));
  const peerRatio=(item:ContentItem)=>{
    const peers=items.filter(p=>p.platform===item.platform&&p.spendType===item.spendType&&p.format===item.format);
    const avg=peers.reduce((s,p)=>s+metricValue(p,rank),0)/(peers.length||1);
    return avg>0?metricValue(item,rank)/avg:1;
  };
  const underperformers=[...items].sort((a,b)=>peerRatio(a)-peerRatio(b));
  const pillars=pillarSummary(month,filters).sort((a,b)=>b.avgEngagement-a.avgEngagement);
  const formats=formatSummary(month,filters).sort((a,b)=>b.avgEngagement-a.avgEngagement);

  return <div className='space-y-10'>
    <SectionHeader eyebrow='Content' title='Content Intelligence' description='Rank content by the outcome that matters — then compare weak items against peers with the same platform, spend type and format.' action={<select value={String(rank)} onChange={e=>setRank(e.target.value as keyof ContentItem)} className='text-xs bg-white border rounded-full px-3 py-2'>{RANK.map(([k,l])=><option key={k} value={k}>{l}</option>)}</select>}/>
    <section className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      <Card><p className='text-xs uppercase tracking-wide text-mint-600 font-semibold mb-1'>Top Performing Content</p><p className='text-[11px] text-fog-500 mb-3'>Highest raw result for the selected metric.</p><ContentTable items={sorted.slice(0,5)} metric={rank}/></Card>
      <Card><p className='text-xs uppercase tracking-wide text-signal-coral font-semibold mb-1'>Contextual Underperformers</p><p className='text-[11px] text-fog-500 mb-3'>Lowest result relative to similar content — not simply the smallest post on the page.</p><ContentTable items={underperformers.slice(0,5)} metric={rank}/></Card>
    </section>
    <section><SectionHeader eyebrow='Pillars' title='Content Pillar Analysis' description='Uses the same active platform, paid/organic, pillar and format filters as the content table.'/><div className='grid grid-cols-1 md:grid-cols-3 gap-4'>{pillars.slice(0,6).map(p=><Card key={p.pillar}><p className='font-display text-lg'>{p.pillar}</p><p className='text-xs text-fog-500 mt-1'>{p.posts} posts</p><div className='mt-4 text-sm space-y-1'><p>Avg Reach <b>{formatNumber(p.avgReach)}</b></p><p>Avg Engagement <b>{formatPercent(p.avgEngagement)}</b></p><p>Followers <b>+{p.followersGained}</b></p></div></Card>)}</div></section>
    <section><SectionHeader eyebrow='Formats' title='Format Analysis' description='Filtered consistently with the content selection above.'/><div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'>{formats.map(f=><Card key={f.format}><p className='font-medium'>{f.format}</p><p className='font-display text-2xl mt-2'>{formatPercent(f.avgEngagement)}</p><p className='text-xs text-fog-500'>Avg engagement</p><p className='text-[10px] text-fog-400 mt-1'>{f.posts} items</p></Card>)}</div></section>
  </div>
}
