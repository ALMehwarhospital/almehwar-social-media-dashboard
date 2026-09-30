export type CampaignSignalKey =
  | "headache" | "dental" | "urology" | "electrophysiology" | "heart"
  | "emergency" | "icu" | "checkups" | "physiotherapy" | "oncology";

export interface PaidCampaignSignal {
  label: string;
  ads: number;
  spend: number;
  reach: number;
  impressions: number;
  frequency: number;
  cpm: number;
  messagingConversations: number;
  messagingContacts: number;
  newMessagingContacts: number;
  costPerMessagingConversation: number | null;
}

/**
 * Meta Ads export supplied 30 Sep 2026.
 * IMPORTANT: the export is aggregated across 1 Jun–30 Sep 2026.
 * Date created is NOT used to allocate delivery results to a calendar month.
 */
export const PAID_SIGNAL_PERIOD = "1 Jun–30 Sep 2026";
export const PAID_CAMPAIGN_SIGNALS: Partial<Record<CampaignSignalKey, PaidCampaignSignal>> = {
  headache: { label:"Headache Clinic", ads:3, spend:1981.35, reach:108620, impressions:127706, frequency:1.18, cpm:15.51, messagingConversations:110, messagingContacts:110, newMessagingContacts:108, costPerMessagingConversation:18.01 },
  dental: { label:"Dental Clinic", ads:9, spend:9417.34, reach:381164, impressions:537029, frequency:1.41, cpm:17.54, messagingConversations:65, messagingContacts:65, newMessagingContacts:61, costPerMessagingConversation:144.88 },
  urology: { label:"Urology", ads:1, spend:561.17, reach:22084, impressions:36759, frequency:1.66, cpm:15.27, messagingConversations:12, messagingContacts:12, newMessagingContacts:10, costPerMessagingConversation:46.76 },
  electrophysiology: { label:"Electrophysiology", ads:2, spend:1749.01, reach:116171, impressions:158255, frequency:1.36, cpm:11.05, messagingConversations:40, messagingContacts:41, newMessagingContacts:38, costPerMessagingConversation:43.73 },
  heart: { label:"Heart Clinic", ads:1, spend:593.47, reach:17905, impressions:26622, frequency:1.49, cpm:22.29, messagingConversations:15, messagingContacts:15, newMessagingContacts:14, costPerMessagingConversation:39.56 },
  icu: { label:"ICU", ads:5, spend:4190.58, reach:78311, impressions:110692, frequency:1.41, cpm:37.86, messagingConversations:40, messagingContacts:41, newMessagingContacts:39, costPerMessagingConversation:104.76 },
  checkups: { label:"Checkups", ads:5, spend:3565.41, reach:96357, impressions:113382, frequency:1.18, cpm:31.45, messagingConversations:14, messagingContacts:14, newMessagingContacts:14, costPerMessagingConversation:254.67 },
  physiotherapy: { label:"Physiotherapy", ads:7, spend:7105.70, reach:210089, impressions:331702, frequency:1.58, cpm:21.42, messagingConversations:84, messagingContacts:84, newMessagingContacts:74, costPerMessagingConversation:84.59 },
  oncology: { label:"Oncology", ads:4, spend:3878.92, reach:108979, impressions:134418, frequency:1.23, cpm:28.86, messagingConversations:46, messagingContacts:46, newMessagingContacts:45, costPerMessagingConversation:84.32 },
};

export interface OpdDepartmentSignal { department: string; revenue: number; volume: number; }
export interface OpdMonthSignal {
  asOf: string;
  consultationRevenue: number;
  consultationVolume: number;
  otherProceduresRevenue: number;
  otherProceduresVolume: number;
  referralIpdRevenue: number;
  referralIpdVolume: number;
  departments: OpdDepartmentSignal[];
}

/** Operational OPD reports supplied by the user. These are hospital operations, not campaign-attributed conversions. */
export const OPD_SIGNALS: Record<string, OpdMonthSignal> = {
  "2026-08": {
    asOf: "31 Aug 2026",
    consultationRevenue: 2146658, consultationVolume: 3949,
    otherProceduresRevenue: 4477064, otherProceduresVolume: 5091,
    referralIpdRevenue: 11972099, referralIpdVolume: 185,
    departments: [
      { department:"Cardiology", revenue:66940, volume:87 },
      { department:"Physiotherapy", revenue:77080, volume:167 },
      { department:"Urology", revenue:53960, volume:99 },
      { department:"Dental", revenue:10350, volume:28 },
      { department:"Oncology", revenue:27930, volume:41 },
    ],
  },
  "2026-09": {
    asOf: "29 Sep 2026",
    consultationRevenue: 1977700, consultationVolume: 3928,
    otherProceduresRevenue: 3849655, otherProceduresVolume: 4541,
    referralIpdRevenue: 9922751, referralIpdVolume: 178,
    departments: [
      { department:"Cardiology", revenue:65740, volume:105 },
      { department:"Physiotherapy", revenue:80315, volume:190 },
      { department:"Urology", revenue:47230, volume:100 },
      { department:"Dental", revenue:18550, volume:27 },
      { department:"Oncology", revenue:23550, volume:36 },
    ],
  },
};

/**
 * Context mapping only. It does NOT assert attribution.
 * Headache, ICU, Checkups and Emergency intentionally have no forced OPD mapping.
 */
export const CAMPAIGN_TO_OPD_DEPARTMENT: Partial<Record<CampaignSignalKey, string>> = {
  dental: "Dental",
  urology: "Urology",
  physiotherapy: "Physiotherapy",
  oncology: "Oncology",
  heart: "Cardiology",
  electrophysiology: "Cardiology",
};
