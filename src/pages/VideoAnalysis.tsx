import { useMemo,useState } from 'react';
import { useFilters } from '../utils/FilterContext';
import { getVideos, getContentById } from '../utils/selectors';
import { SectionHeader,Card,EmptyState } from '../components/dashboard/Primitives';
import { RetentionCurve } from '../components/charts/RetentionCurve';
import { formatNumber,formatPercent,formatSeconds } from '../utils/format';

export default function VideoAnalysis(){
  const{month,platform,pillar,format,spendType}=useFilters();
  const filters={
    platform:platform==='All'?undefined:platform,
    pillar:pillar==='All'?undefined:pillar,
    format:format==='All'?undefined:format,
    spendType:spendType==='All'?undefined:spendType,
  };
  const videos=useMemo(()=>getVideos(month,filters),[month,platform,pillar,format,spendType]);
  const[selectedId,setSelectedId]=useState<string|null>(null);
  const selected=videos.find(v=>v.id===selectedId)??videos[0];
  const contentMeta=selected?getContentById(selected.contentId):undefined;
  if(!videos.length)return <EmptyState message='No video data for this selection.'/>

  return <div className='space-y-10'>
    <SectionHeader eyebrow='Video' title='Video Analysis' description='Retention, watch time, completion and creative scores reveal where each video wins or loses attention. Filters are matched through the linked content record.'/>
    <section className='grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6'>
      <Card><div className='space-y-2'>{videos.map(v=>{const meta=getContentById(v.contentId);return <button key={v.id} onClick={()=>setSelectedId(v.id)} className={`w-full text-left p-3 rounded-xl ${selected?.id===v.id?'bg-navy-900 text-white':'bg-warm-100'}`}><p className='font-medium text-sm'>{v.name}</p><p className='text-xs opacity-70 mt-1'>{v.platform} · {formatNumber(v.views)} views</p>{meta&&<p className='text-[10px] opacity-60 mt-1'>{meta.spendType} · {meta.pillar} · {meta.format}</p>}</button>})}</div></Card>
      {selected&&<Card>
        <div className='flex justify-between gap-4'><div><p className='text-xs text-fog-500'>{selected.platform} · {formatSeconds(selected.durationSeconds)}</p><h3 className='font-display text-xl'>{selected.name}</h3>{contentMeta&&<p className='text-[11px] text-fog-400 mt-1'>{contentMeta.spendType} · {contentMeta.pillar} · {contentMeta.format}</p>}</div><div className='text-right'><p className='font-display text-3xl text-mint-700'>{selected.scores.overall}</p><p className='text-xs text-fog-500'>Overall / 5</p></div></div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mt-5'>{[['Avg Watch',formatSeconds(selected.avgWatchTimeSeconds)],['Avg Viewed',formatPercent(selected.avgPercentWatched)],['Completion',formatPercent(selected.completionRate)],['Engagement',formatPercent(selected.engagementRate)]].map(([k,v])=><div className='bg-warm-100 rounded-xl p-3' key={k}><p className='text-xs text-fog-500'>{k}</p><p className='font-display text-xl mt-1'>{v}</p></div>)}</div>
        <div className='mt-6'><RetentionCurve curve={selected.retentionCurve} problem={selected.diagnosis.problem}/><div className='rounded-xl bg-signal-amber/10 p-3 mt-3'><p className='text-xs uppercase font-semibold text-signal-amber'>{selected.diagnosis.problem}</p><p className='text-sm mt-1'>{selected.diagnosis.explanation}</p></div></div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5'>{Object.entries(selected.scores).filter(([k])=>k!=='overall').map(([k,v])=><div key={k} className='text-center border rounded-xl p-2'><p className='text-xs capitalize text-fog-500'>{k}</p><p className='font-display text-xl'>{v}</p></div>)}</div>
      </Card>}
    </section>
  </div>
}
