export const dataQuality = [
  ...['2026-06','2026-07','2026-08'].flatMap((month) => [
    {id:`${month}-split`,month,message:'Paid vs Organic split is not available in the current source. Reported totals stay Total / Unsplit until a reliable split is added.',severity:'Medium'},
    {id:`${month}-partial`,month,message:'Some platform metrics are unavailable by source. Monthly totals use only reported values and do not estimate missing Reach, Profile Visits, Link Clicks, or Leads.',severity:'Medium'}
  ])
] as const;
