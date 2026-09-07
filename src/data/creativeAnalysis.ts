import { contentPerformance } from './contentPerformance';
import type { CreativeAnalysis, CreativeScoreCard } from '../types/dashboard';

const sets:CreativeScoreCard[]=[
  {idea:4.6,hook:4.5,script:4.2,design:4.1,editing:4.3,brandConsistency:4.4,cta:3.7},
  {idea:3.8,hook:3.2,script:3.7,design:4.5,editing:4.2,brandConsistency:4.1,cta:3.1},
  {idea:4.2,hook:4.0,script:3.3,design:3.8,editing:3.9,brandConsistency:4.3,cta:4.1},
  {idea:3.1,hook:2.8,script:3.2,design:3.4,editing:3.5,brandConsistency:3.8,cta:2.9},
  {idea:4.8,hook:4.7,script:4.6,design:4.4,editing:4.6,brandConsistency:4.5,cta:4.3}
];

export const creativeAnalysis:CreativeAnalysis[]=contentPerformance.map((c,i)=>{
  const scores=sets[i%sets.length];
  const vals=Object.values(scores);
  const creativeScore=Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10;
  const strongest=creativeScore>=4.3?'Strong concept and scroll-stopping execution':creativeScore>=3.7?'Clear visual direction and useful structure':'Simple idea with room for stronger differentiation';
  const weakest=scores.hook<3.2?'Opening hook is too soft':scores.script<3.5?'Script loses pace after the opening':scores.cta<3.2?'CTA is not specific enough':'No major weakness in the demo rubric';
  return {
    id:`creative-${c.id}`,
    contentId:c.id,
    name:c.name,
    platform:c.platform,
    month:c.month,
    scores,
    creativeScore,
    performanceScore:50,
    mainStrength:strongest,
    mainWeakness:weakest,
    recommendedImprovement:scores.hook<3.2?'Open with a direct problem, number or visual proof in the first 2 seconds.':scores.script<3.5?'Cut setup time and move the useful answer earlier.':scores.cta<3.2?'Use one clear CTA tied to the content goal.':'Test a second hook version to improve repeatable performance.'
  };
});
