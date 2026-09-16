export interface WebsiteTrafficSource {
  source: string;
  activeUsers: number;
  sessions: number;
  engagedSessions: number;
  avgEngagementTimeSec: number;
  engagedSessionsPerActiveUser: number;
  eventsPerSession: number;
  engagementRate: number;
}

export const websiteSourceData: Record<string, WebsiteTrafficSource[]> = {
  "2026-08": [
    {
      source: "google",
      activeUsers: 2752,
      sessions: 3577,
      engagedSessions: 2109,
      avgEngagementTimeSec: 32,
      engagedSessionsPerActiveUser: 0.77,
      eventsPerSession: 5.79,
      engagementRate: 0.5896,
    },
    {
      source: "(not set)",
      activeUsers: 1395,
      sessions: 1643,
      engagedSessions: 808,
      avgEngagementTimeSec: 28,
      engagedSessionsPerActiveUser: 0.58,
      eventsPerSession: 5.57,
      engagementRate: 0.4918,
    },
    {
      source: "fb",
      activeUsers: 616,
      sessions: 650,
      engagedSessions: 383,
      avgEngagementTimeSec: 13,
      engagedSessionsPerActiveUser: 0.62,
      eventsPerSession: 4.71,
      engagementRate: 0.5892,
    },
    {
      source: "facebook.com",
      activeUsers: 258,
      sessions: 299,
      engagedSessions: 216,
      avgEngagementTimeSec: 14,
      engagedSessionsPerActiveUser: 0.84,
      eventsPerSession: 5.64,
      engagementRate: 0.7224,
    },
    {
      source: "m.facebook.com",
      activeUsers: 231,
      sessions: 262,
      engagedSessions: 208,
      avgEngagementTimeSec: 39,
      engagedSessionsPerActiveUser: 0.9,
      eventsPerSession: 6.63,
      engagementRate: 0.7939,
    },
    {
      source: "lm.facebook.com",
      activeUsers: 160,
      sessions: 188,
      engagedSessions: 139,
      avgEngagementTimeSec: 40,
      engagedSessionsPerActiveUser: 0.87,
      eventsPerSession: 6.62,
      engagementRate: 0.7394,
    },
    {
      source: "l.facebook.com",
      activeUsers: 131,
      sessions: 159,
      engagedSessions: 111,
      avgEngagementTimeSec: 35,
      engagedSessionsPerActiveUser: 0.85,
      eventsPerSession: 5.85,
      engagementRate: 0.6981,
    },
    {
      source: "chatgpt.com",
      activeUsers: 86,
      sessions: 92,
      engagedSessions: 60,
      avgEngagementTimeSec: 20,
      engagedSessionsPerActiveUser: 0.7,
      eventsPerSession: 5.52,
      engagementRate: 0.6522,
    },
    {
      source: "ig",
      activeUsers: 67,
      sessions: 68,
      engagedSessions: 43,
      avgEngagementTimeSec: 26,
      engagedSessionsPerActiveUser: 0.64,
      eventsPerSession: 5.5,
      engagementRate: 0.6324,
    },
    {
      source: "bing",
      activeUsers: 50,
      sessions: 67,
      engagedSessions: 49,
      avgEngagementTimeSec: 72,
      engagedSessionsPerActiveUser: 0.98,
      eventsPerSession: 8.45,
      engagementRate: 0.7313,
    },
  ],
};
