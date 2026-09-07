import type { TeamNote } from '../types/dashboard';
const months=['2026-06','2026-07','2026-08'] as const;
export const notes:TeamNote[]=months.flatMap(month=>[
  {id:`demo-note-${month}-1`,month,category:'Creative',author:'Demo Team',text:'[DEMO] Test shorter on-screen copy and move the visual proof into the opening seconds.',date:`${month}-24`},
  {id:`demo-note-${month}-2`,month,category:'Content',author:'Demo Team',text:'[DEMO] Educational content should carry a stronger save/share reason, not only a follow CTA.',date:`${month}-25`},
  {id:`demo-note-${month}-3`,month,category:'Management',author:'Demo Team',text:'[DEMO] Keep monthly platform totals real; replace this showcase layer as soon as content-level data is loaded.',date:`${month}-26`}
]);
