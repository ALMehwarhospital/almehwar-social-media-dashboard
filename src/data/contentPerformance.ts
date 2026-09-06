import type { ContentItem } from '../types/dashboard';
const mk=(id:string,date:string,platform:ContentItem['platform'],name:string,pillar:ContentItem['pillar'],format:ContentItem['format'],reach:number,views:number,interactions:number,engagementRate:number,followersGained:number,linkClicks:number,shares:number,saves:number,spendType:ContentItem['spendType']='Organic'):ContentItem=>({id,date,month:date.slice(0,7),platform,name,pillar,format,spendType,reach,views,interactions,engagementRate,engagementDenominator:platform==='TikTok'||platform==='YouTube'?'Views':platform==='LinkedIn'?'Impressions':'Reach',profileVisits:Math.round(reach*.02),linkClicks,followersGained,leads:Math.round(linkClicks*.08),shares,saves,valueRate:+(((shares+saves)/(platform==='TikTok'?Math.max(views,1):Math.max(reach,1)))*100).toFixed(2)});
export const contentPerformance:ContentItem[]=[
mk('c1','2026-08-03','Facebook','3 Signs Your Knee Pain Needs a Doctor','Medical Education','Reel',142300,258000,2610,1.83,118,2750,310,122),
mk('c2','2026-08-05','Instagram','When Back Pain Is Not Normal','Medical Education','Reel',18900,55200,720,3.81,63,310,105,77),
mk('c3','2026-08-08','TikTok','Doctor Answers: Shoulder Pain','Doctors Content','Reel',0,128000,6950,5.43,190,85,680,410),
mk('c4','2026-08-10','Facebook','24/7 Emergency Department','Hospital Services','Static post',92300,104000,880,.95,36,4200,46,14,'Paid'),
mk('c5','2026-08-12','Instagram','Patient Recovery Story','Patient Experience','Carousel',11600,14800,510,4.4,31,190,68,91),
mk('c6','2026-08-16','YouTube','Knee Replacement Explained','Medical Education','Long video',18000,30500,670,2.2,72,95,88,52),
mk('c7','2026-08-18','LinkedIn','Medical Conference Highlights','Conferences','Carousel',6200,9700,380,6.13,22,140,45,18),
mk('c8','2026-08-21','Facebook','Free Checkup Day Recap','Events','Reel',171400,310000,2290,1.34,105,1890,270,83),
mk('c9','2026-08-24','Instagram','ASA Academy Case Review','ASA Academy','Reel',15200,37900,395,2.6,24,120,38,44),
mk('c10','2026-08-28','Facebook','Executive Checkup Package','Promotional','Static post',127000,151000,970,.76,29,6800,51,11,'Paid'),
mk('c11','2026-07-14','Facebook','Heart Health: 5 Warning Signs','Medical Education','Reel',155000,287000,3150,2.03,142,1980,360,150),
mk('c12','2026-07-19','Instagram','Doctor Q&A: Joint Pain','Doctors Content','Reel',17200,47800,850,4.94,71,280,120,74)
];