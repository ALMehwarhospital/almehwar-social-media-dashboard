import type { ContentItem, ContentPillar, ContentFormat, Platform, SpendType, EngagementDenominator } from '../types/dashboard';

type Template = {
  key:string; platform:Platform; name:string; pillar:ContentPillar; format:ContentFormat; spendType:SpendType;
  reach:number; views:number; interactions:number; profileVisits:number; linkClicks:number; followers:number; leads:number; shares:number; saves:number;
};

const templates:Template[]=[
  {key:'fb-med-1',platform:'Facebook',name:'[DEMO] 3 warning signs you should not ignore',pillar:'Medical Education',format:'Reel',spendType:'Organic',reach:82000,views:132000,interactions:2280,profileVisits:610,linkClicks:190,followers:96,leads:18,shares:420,saves:310},
  {key:'fb-doc-1',platform:'Facebook',name:'[DEMO] Doctor explains the fastest route to diagnosis',pillar:'Doctors Content',format:'Reel',spendType:'Organic',reach:69000,views:111000,interactions:1840,profileVisits:470,linkClicks:140,followers:74,leads:12,shares:310,saves:260},
  {key:'fb-service-1',platform:'Facebook',name:'[DEMO] One-day surgery service campaign',pillar:'Hospital Services',format:'Reel',spendType:'Paid',reach:148000,views:205000,interactions:2120,profileVisits:940,linkClicks:1380,followers:58,leads:164,shares:180,saves:120},
  {key:'ig-med-1',platform:'Instagram',name:'[DEMO] Save this checklist before your next appointment',pillar:'Awareness',format:'Carousel',spendType:'Organic',reach:24500,views:29000,interactions:1260,profileVisits:690,linkClicks:95,followers:112,leads:8,shares:260,saves:390},
  {key:'ig-doc-1',platform:'Instagram',name:'[DEMO] A doctor answers the question everyone asks',pillar:'Doctors Content',format:'Reel',spendType:'Organic',reach:33800,views:61200,interactions:1760,profileVisits:870,linkClicks:126,followers:146,leads:11,shares:330,saves:410},
  {key:'ig-patient-1',platform:'Instagram',name:'[DEMO] Patient journey: from first call to recovery',pillar:'Patient Experience',format:'Reel',spendType:'Organic',reach:28100,views:50500,interactions:1380,profileVisits:760,linkClicks:88,followers:104,leads:9,shares:240,saves:280},
  {key:'tt-med-1',platform:'TikTok',name:'[DEMO] 20-second medical myth breakdown',pillar:'Medical Education',format:'Reel',spendType:'Organic',reach:0,views:94000,interactions:5100,profileVisits:820,linkClicks:0,followers:380,leads:0,shares:880,saves:1240},
  {key:'tt-aware-1',platform:'TikTok',name:'[DEMO] What happens if you ignore this symptom?',pillar:'Awareness',format:'Reel',spendType:'Organic',reach:0,views:76000,interactions:3460,profileVisits:610,linkClicks:0,followers:280,leads:0,shares:620,saves:870},
  {key:'yt-med-1',platform:'YouTube',name:'[DEMO] Knee pain explained in 90 seconds',pillar:'Medical Education',format:'Long video',spendType:'Organic',reach:9100,views:12800,interactions:540,profileVisits:160,linkClicks:0,followers:42,leads:0,shares:86,saves:64},
  {key:'li-event-1',platform:'LinkedIn',name:'[DEMO] Scientific conference highlights',pillar:'Conferences',format:'Carousel',spendType:'Organic',reach:12600,views:18400,interactions:620,profileVisits:130,linkClicks:410,followers:68,leads:0,shares:110,saves:48}
];

const months=[
  {month:'2026-06',factor:0.78},
  {month:'2026-07',factor:0.9},
  {month:'2026-08',factor:1}
] as const;

const round=(n:number)=>Math.round(n);
const denomFor=(platform:Platform):EngagementDenominator=>platform==='TikTok'||platform==='YouTube'?'Views':'Reach';

export const contentPerformance:ContentItem[]=months.flatMap(({month,factor},mIndex)=>templates.map((t,i)=>{
  const variation=1+(((i+mIndex)%5)-2)*0.035;
  const f=factor*variation;
  const reach=round(t.reach*f);
  const views=round(t.views*f);
  const interactions=round(t.interactions*f);
  const shares=round(t.shares*f);
  const saves=round(t.saves*f);
  const denominator=denomFor(t.platform);
  const base=denominator==='Views'?views:reach;
  return {
    id:`demo-${month}-${t.key}`,
    date:`${month}-${String(5+(i*2)%23).padStart(2,'0')}`,
    month,
    platform:t.platform,
    name:t.name,
    pillar:t.pillar,
    format:t.format,
    spendType:t.spendType,
    reach,
    views,
    interactions,
    engagementRate:base>0?Math.round((interactions/base*100)*100)/100:0,
    engagementDenominator:denominator,
    profileVisits:round(t.profileVisits*f),
    linkClicks:round(t.linkClicks*f),
    followersGained:round(t.followers*f),
    leads:round(t.leads*f),
    shares,
    saves,
    valueRate:base>0?Math.round(((shares+saves)/base*100)*100)/100:0
  };
}));
