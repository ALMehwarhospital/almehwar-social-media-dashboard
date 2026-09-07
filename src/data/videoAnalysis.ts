import { contentPerformance } from './contentPerformance';
import type { VideoAnalysis, HookType, RetentionProblem } from '../types/dashboard';

const hooks:HookType[]=['Question','Problem','Strong Statement','Visual Hook','Story','Doctor Introduction'];
const scoreSets=[
  {hook:4.6,script:4.2,editing:4.1,cta:3.6},
  {hook:3.4,script:3.8,editing:4.3,cta:3.1},
  {hook:4.2,script:3.2,editing:3.8,cta:4.0},
  {hook:2.9,script:3.4,editing:3.6,cta:2.8},
  {hook:4.8,script:4.5,editing:4.6,cta:4.2}
];

export const videoAnalysis:VideoAnalysis[]=contentPerformance
  .filter(c=>c.format==='Reel'||c.format==='Long video')
  .map((c,i)=>{
    const s=scoreSets[i%scoreSets.length];
    const duration=c.format==='Long video'?92+(i%18):28+(i%16);
    const avgPercent=[68,54,47,39,74][i%5];
    const avgWatch=Math.round(duration*(avgPercent/100)*10)/10;
    const completion=Math.max(18,Math.round((avgPercent-[8,12,6,14,4][i%5])*10)/10);
    const overall=Math.round(((s.hook+s.script+s.editing+s.cta)/4)*10)/10;
    const problem:RetentionProblem=s.hook<3.2?'Hook Problem':s.script<3.4?'Script / Pacing Problem':s.cta<3?'CTA Problem':'None Detected';
    const explanation=problem==='Hook Problem'?'The first seconds lose too much attention; test a clearer problem-led opening.':problem==='Script / Pacing Problem'?'Attention drops after the opening; tighten explanation and visual pacing.':problem==='CTA Problem'?'Watch behavior is acceptable, but the next action is weak or late.':'Retention pattern is healthy for this demo example.';
    return {
      id:`video-${c.id}`,
      contentId:c.id,
      name:c.name,
      platform:c.platform,
      month:c.month,
      durationSeconds:duration,
      views:c.views,
      reach:c.reach,
      interactions:c.interactions,
      engagementRate:c.engagementRate,
      avgWatchTimeSeconds:avgWatch,
      avgPercentWatched:avgPercent,
      completionRate:completion,
      retentionCurve:[100,Math.min(94,78+s.hook*3),68+s.script*2,56+s.editing*2,46+s.cta*2,completion],
      shares:c.shares,
      saves:c.saves,
      followersGained:c.followersGained,
      scores:{...s,overall},
      hookType:hooks[i%hooks.length],
      diagnosis:{problem,explanation}
    };
  });
