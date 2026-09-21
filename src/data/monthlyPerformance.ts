const empty = {reach:null,views:null,interactions:null,engagementRate:null,newFollowers:null,profileVisits:null,linkClicks:null,leads:null};

export const monthlyPerformance = [
  {
    month:'2026-06', label:'June',
    organic:{...empty}, paid:{...empty},
    total:{reach:1291573,views:2645027,interactions:35534,engagementRate:null,newFollowers:1403,profileVisits:76049,linkClicks:41330,leads:235}
  },
  {
    month:'2026-07', label:'July',
    organic:{...empty}, paid:{...empty},
    total:{reach:1202056,views:2763747,interactions:23758,engagementRate:null,newFollowers:2265,profileVisits:45594,linkClicks:32023,leads:1276}
  },
  {
    month:'2026-08', label:'August',
    organic:{...empty}, paid:{...empty},
    total:{reach:1281347,views:3054014,interactions:19006,engagementRate:null,newFollowers:2049,profileVisits:41874,linkClicks:42239,leads:1599}
  }
] as const;
