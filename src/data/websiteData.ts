export interface WebsiteTrafficChannel {
  channel: string;
  sessions: number;
  share: number;
}

export interface WebsiteLandingPage {
  path: string;
  sessions: number;
  engagementRate: number;
}

export interface WebsiteSearchQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface WebsiteMonthData {
  month: string;
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    sessions: number;
    engagedSessions: number;
    engagementRate: number;
    avgSessionDuration: number;
    pageViews: number;
    viewsPerSession: number;
    eventCount: number;
  };
  traffic: WebsiteTrafficChannel[];
  landingPages: WebsiteLandingPage[];
  search: {
    clicks: number;
    impressions: number;
    ctr: number;
    topQueries: WebsiteSearchQuery[];
  };
  conversions: {
    formStarts: number;
    formSubmits: number;
    submitUsers: number;
    completionRate: number;
    ga4KeyEvents: number;
  };
}

export const websiteMonths = ["2026-06", "2026-07", "2026-08"];

export const websiteData: Record<string, WebsiteMonthData> = {
  "2026-06": {
    month: "2026-06",
    overview: {
      totalUsers: 4451,
      activeUsers: 4416,
      newUsers: 4314,
      sessions: 5405,
      engagedSessions: 3227,
      engagementRate: 0.597,
      avgSessionDuration: 126.42,
      pageViews: 10384,
      viewsPerSession: 1.92,
      eventCount: 32649,
    },
    traffic: [
      { channel: "Organic Search", sessions: 3682, share: 0.6755 },
      { channel: "Direct", sessions: 1292, share: 0.237 },
      { channel: "Organic Social", sessions: 380, share: 0.0697 },
      { channel: "AI Assistant", sessions: 55, share: 0.0101 },
      { channel: "Unassigned", sessions: 16, share: 0.0029 },
      { channel: "Referral", sessions: 11, share: 0.002 },
      { channel: "Paid Other", sessions: 10, share: 0.0018 },
      { channel: "Paid Social", sessions: 5, share: 0.0009 },
    ],
    landingPages: [
      { path: "/", sessions: 1188, engagementRate: 0.6961 },
      { path: "/ar/doctors/الأستاذ-الدكتور-ياسر-المليجي", sessions: 784, engagementRate: 0.5842 },
      { path: "/ar/doctors/الأستاذ-الدكتور-أحمد-عبد-العزيز", sessions: 497, engagementRate: 0.5573 },
      { path: "/book-an-appointment", sessions: 382, engagementRate: 0.5681 },
      { path: "/ar", sessions: 344, engagementRate: 0.7849 },
      { path: "/ar/doctors/الأستاذ-الدكتور-حازم-عبد-العظيم", sessions: 307, engagementRate: 0.4919 },
      { path: "/ar/احجز-موعدا", sessions: 126, engagementRate: 0.5635 },
      { path: "(not set)", sessions: 106, engagementRate: 0.0755 },
      { path: "/doctors/prof-dr-yasser-el-meligy", sessions: 99, engagementRate: 0.5859 },
      { path: "/opd-schedule", sessions: 98, engagementRate: 0.6224 },
    ],
    search: {
      clicks: 2502,
      impressions: 68056,
      ctr: 0.0368,
      topQueries: [
        { query: "مستشفى المحور", clicks: 289, impressions: 4719, ctr: 0.0612, position: 1.13 },
        { query: "دكتور ياسر المليجى", clicks: 229, impressions: 1239, ctr: 0.1848, position: 2.52 },
        { query: "مستشفي المحور", clicks: 108, impressions: 1111, ctr: 0.0972, position: 1.13 },
        { query: "دكتور احمد عبد العزيز", clicks: 100, impressions: 1990, ctr: 0.0503, position: 4.5 },
        { query: "ياسر المليجى", clicks: 85, impressions: 646, ctr: 0.1316, position: 2.8 },
        { query: "دكتور احمد عبد العزيز عظام", clicks: 71, impressions: 964, ctr: 0.0737, position: 4.21 },
        { query: "دكتور ياسر المليجي", clicks: 68, impressions: 328, ctr: 0.2073, position: 1.92 },
        { query: "almehwar hospital", clicks: 60, impressions: 824, ctr: 0.0728, position: 1.0 },
        { query: "دكتور حازم عبد العظيم", clicks: 51, impressions: 246, ctr: 0.2073, position: 2.5 },
        { query: "mehwar hospital", clicks: 44, impressions: 223, ctr: 0.1973, position: 1.02 },
      ],
    },
    conversions: {
      formStarts: 436,
      formSubmits: 8,
      submitUsers: 4,
      completionRate: 0.0183,
      ga4KeyEvents: 0,
    },
  },

  "2026-07": {
    month: "2026-07",
    overview: {
      totalUsers: 4684,
      activeUsers: 4631,
      newUsers: 4561,
      sessions: 5884,
      engagedSessions: 3439,
      engagementRate: 0.5845,
      avgSessionDuration: 134.28,
      pageViews: 11105,
      viewsPerSession: 1.89,
      eventCount: 34223,
    },
    traffic: [
      { channel: "Organic Search", sessions: 3410, share: 0.5781 },
      { channel: "Direct", sessions: 1428, share: 0.2421 },
      { channel: "Organic Social", sessions: 797, share: 0.1351 },
      { channel: "Paid Social", sessions: 166, share: 0.0281 },
      { channel: "AI Assistant", sessions: 87, share: 0.0147 },
      { channel: "Unassigned", sessions: 8, share: 0.0014 },
      { channel: "Referral", sessions: 3, share: 0.0005 },
    ],
    landingPages: [
      { path: "/", sessions: 1342, engagementRate: 0.6751 },
      { path: "/ar/doctors/الأستاذ-الدكتور-ياسر-المليجي", sessions: 700, engagementRate: 0.5643 },
      { path: "/book-an-appointment", sessions: 551, engagementRate: 0.6025 },
      { path: "/ar/doctors/الأستاذ-الدكتور-أحمد-عبد-العزيز", sessions: 391, engagementRate: 0.6573 },
      { path: "/ar", sessions: 352, engagementRate: 0.7869 },
      { path: "/workshop", sessions: 242, engagementRate: 0.7107 },
      { path: "(not set)", sessions: 151, engagementRate: 0.0464 },
      { path: "/ar/احجز-موعدا", sessions: 133, engagementRate: 0.5414 },
      { path: "/doctors/prof-dr-yasser-el-meligy", sessions: 128, engagementRate: 0.5 },
      { path: "/ar/doctors/الأستاذ-الدكتور-حازم-عبد-العظيم", sessions: 126, engagementRate: 0.4603 },
    ],
    search: {
      clicks: 2163,
      impressions: 67037,
      ctr: 0.0323,
      topQueries: [
        { query: "مستشفى المحور", clicks: 274, impressions: 5290, ctr: 0.0518, position: 1.08 },
        { query: "دكتور ياسر المليجى", clicks: 147, impressions: 1081, ctr: 0.136, position: 2.74 },
        { query: "مستشفي المحور", clicks: 79, impressions: 1098, ctr: 0.0719, position: 1.14 },
        { query: "دكتور احمد عبد العزيز عظام", clicks: 71, impressions: 1210, ctr: 0.0587, position: 4.6 },
        { query: "almehwar hospital", clicks: 55, impressions: 1078, ctr: 0.051, position: 1.0 },
        { query: "دكتور احمد عبد العزيز", clicks: 42, impressions: 1898, ctr: 0.0221, position: 4.75 },
        { query: "دكتور ياسر المليجي", clicks: 42, impressions: 333, ctr: 0.1261, position: 2.48 },
        { query: "mehwar hospital", clicks: 38, impressions: 218, ctr: 0.1743, position: 1.02 },
        { query: "مستشفي المحور ٦ اكتوبر", clicks: 37, impressions: 652, ctr: 0.0567, position: 1.15 },
        { query: "مستشفى المحور الشيخ زايد", clicks: 32, impressions: 693, ctr: 0.0462, position: 1.14 },
      ],
    },
    conversions: {
      formStarts: 544,
      formSubmits: 12,
      submitUsers: 4,
      completionRate: 0.0221,
      ga4KeyEvents: 0,
    },
  },

  "2026-08": {
    month: "2026-08",
    overview: {
      totalUsers: 5795,
      activeUsers: 5726,
      newUsers: 5722,
      sessions: 7103,
      engagedSessions: 4182,
      engagementRate: 0.5888,
      avgSessionDuration: 111.57,
      pageViews: 13239,
      viewsPerSession: 1.86,
      eventCount: 40225,
    },
    traffic: [
      { channel: "Organic Search", sessions: 3640, share: 0.5181 },
      { channel: "Direct", sessions: 1629, share: 0.2319 },
      { channel: "Organic Social", sessions: 929, share: 0.1322 },
      { channel: "Paid Social", sessions: 718, share: 0.1022 },
      { channel: "AI Assistant", sessions: 94, share: 0.0134 },
      { channel: "Unassigned", sessions: 12, share: 0.0017 },
      { channel: "Cross-network", sessions: 2, share: 0.0003 },
      { channel: "Referral", sessions: 1, share: 0.0001 },
    ],
    landingPages: [
      { path: "/", sessions: 1244, engagementRate: 0.6785 },
      { path: "/book-an-appointment", sessions: 922, engagementRate: 0.628 },
      { path: "/ar/doctors/الأستاذ-الدكتور-ياسر-المليجي", sessions: 811, engagementRate: 0.5771 },
      { path: "/workshop", sessions: 687, engagementRate: 0.6667 },
      { path: "/ar/doctors/الأستاذ-الدكتور-أحمد-عبد-العزيز", sessions: 538, engagementRate: 0.5539 },
      { path: "/ar", sessions: 326, engagementRate: 0.865 },
      { path: "/ar/احجز-موعدا", sessions: 179, engagementRate: 0.486 },
      { path: "/doctors/prof-dr-yasser-el-meligy", sessions: 132, engagementRate: 0.447 },
      { path: "/ar/doctors/الأستاذ-الدكتور-حازم-عبد-العظيم", sessions: 130, engagementRate: 0.3769 },
      { path: "(not set)", sessions: 110, engagementRate: 0.0455 },
    ],
    search: {
      clicks: 2323,
      impressions: 70645,
      ctr: 0.0329,
      topQueries: [
        { query: "مستشفى المحور", clicks: 311, impressions: 5334, ctr: 0.0583, position: 1.1 },
        { query: "دكتور ياسر المليجى", clicks: 178, impressions: 1200, ctr: 0.1483, position: 2.74 },
        { query: "دكتور احمد عبد العزيز عظام", clicks: 96, impressions: 1122, ctr: 0.0856, position: 3.88 },
        { query: "مستشفي المحور", clicks: 90, impressions: 1154, ctr: 0.078, position: 1.13 },
        { query: "دكتور ياسر المليجي", clicks: 57, impressions: 336, ctr: 0.1696, position: 2.2 },
        { query: "مستشفى المحور اكتوبر", clicks: 53, impressions: 923, ctr: 0.0574, position: 1.1 },
        { query: "almehwar hospital", clicks: 52, impressions: 852, ctr: 0.061, position: 1.0 },
        { query: "yaser el melegey", clicks: 45, impressions: 317, ctr: 0.142, position: 1.96 },
        { query: "mehwar hospital", clicks: 42, impressions: 198, ctr: 0.2121, position: 1.01 },
        { query: "دكتور احمد عبد العزيز", clicks: 38, impressions: 2079, ctr: 0.0183, position: 4.48 },
      ],
    },
    conversions: {
      formStarts: 740,
      formSubmits: 13,
      submitUsers: 5,
      completionRate: 0.0176,
      ga4KeyEvents: 0,
    },
  },
};
