import type { DetectedProblem } from '../types/dashboard';
const months=['2026-06','2026-07','2026-08'] as const;
export const problems:DetectedProblem[]=months.flatMap(month=>[
  {id:`demo-problem-${month}-1`,month,title:'[DEMO] Weak early hooks in some doctor videos',description:'Several showcase videos lose attention before the main medical value begins.',severity:'High',relatedPlatform:'Instagram'},
  {id:`demo-problem-${month}-2`,month,title:'[DEMO] Conversion content and engagement content are being judged together',description:'The same KPI is not appropriate for educational, service and campaign content.',severity:'Medium',relatedPlatform:'Facebook'},
  {id:`demo-problem-${month}-3`,month,title:'[DEMO] Follow conversion needs a stronger content identity',description:'High visibility does not consistently translate into new followers in the showcase layer.',severity:'Medium',relatedPlatform:'Instagram'}
]);
