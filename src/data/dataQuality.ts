export const dataQuality = [
  ...['2026-06','2026-07','2026-08'].flatMap((month) => [
    {id:`${month}-split`,month,message:'Paid vs Organic split is not available in the current source. Paid and Organic views are intentionally zero until real split data is added.',severity:'Medium'},
    {id:`${month}-partial`,month,message:'Some platform metrics are missing in the source. Monthly totals use only available values and do not estimate missing Reach, Profile Visits, Link Clicks, or Leads.',severity:'Medium'},
    {id:`${month}-detail`,month,message:'Content, Video, Creative, Health Score, Insights, Problems, Action Plan, and Notes are intentionally empty until real source data is added.',severity:'Low'}
  ])
] as const;
