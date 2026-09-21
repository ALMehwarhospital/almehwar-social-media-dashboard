// ---------------------------------------------------------------------------
// ALMEHWAR SOCIAL INTELLIGENCE — core data model
// Every UI component reads from data conforming to these types.
// See src/data/socialDashboard.ts for the actual (demo) data instance.
// ---------------------------------------------------------------------------

export type Platform = "Facebook" | "Instagram" | "TikTok" | "YouTube" | "LinkedIn";

export type ContentFormat =
  | "Reel"
  | "Long video"
  | "Static post"
  | "Carousel"
  | "Story"
  | "Other";

export type ContentPillar =
  | "Medical Education"
  | "Doctors Content"
  | "Hospital Services"
  | "Events"
  | "Conferences"
  | "ASA Academy"
  | "Patient Experience"
  | "Awareness"
  | "Branding"
  | "Promotional"
  | "Other";

export type SpendType = "Organic" | "Paid" | "Total / Unsplit";

export type TrendDirection = "up" | "down" | "flat";

export type PlatformStatus = "Growing" | "Stable" | "Needs Attention" | "Not Evaluated" | "API Pending" | "Partial MTD" | string;

export type Priority = "High" | "Medium" | "Low";

export type ActionStatus = "Planned" | "Not Started" | "In Progress" | "On Hold" | "Done";

export type HookType =
  | "Question"
  | "Problem"
  | "Strong Statement"
  | "Doctor Introduction"
  | "Visual Hook"
  | "Story"
  | "No Clear Hook";

export type EngagementDenominator = "Reach" | "Views" | "Impressions";
export type MetricValue = number | null;
export type PeriodState = "CLOSED" | "LIVE_MTD" | "PARTIAL_MTD" | "API_PENDING";
export type AvailabilityState = "available" | "unavailable" | "pending" | "not_applicable";

export interface DashboardMeta {
  clientName: string;
  productName: string;
  subtitle: string;
  months: string[];
  currentMonth: string;
  previousMonth: string;
  lastUpdated: string;
  currency: string;
  dataSource: string;
}

export interface MonthlyKpiSet {
  reach: MetricValue;
  views: MetricValue;
  interactions: MetricValue;
  /** Canonical ratio 0–1. UI converts it to %. */
  engagementRate: MetricValue;
  newFollowers: MetricValue;
  profileVisits: MetricValue;
  linkClicks: MetricValue;
  leads: MetricValue;
}

export interface MonthlyPerformance {
  month: string;
  label: string;
  organic: MonthlyKpiSet;
  paid: MonthlyKpiSet;
  total: MonthlyKpiSet;
}

export interface PlatformPerformance {
  month: string;
  platform: Platform;
  reach: MetricValue;
  views: MetricValue;
  interactions: MetricValue;
  /** Canonical ratio 0–1. */
  engagementRate: MetricValue;
  engagementDenominator: EngagementDenominator;
  followersGrowth: MetricValue;
  clicks: MetricValue;
  messages: MetricValue;
  contentPublished: MetricValue;
  status: PlatformStatus;
  observation: string;
}

export interface ContentItem {
  id: string;
  date: string;
  month: string;
  platform: Platform;
  name: string;
  pillar: ContentPillar;
  format: ContentFormat;
  spendType: SpendType;
  reach: MetricValue;
  views: MetricValue;
  impressions?: MetricValue;
  interactions: MetricValue;
  /** Canonical ratio 0–1. */
  engagementRate: MetricValue;
  engagementDenominator: EngagementDenominator;
  profileVisits: MetricValue;
  linkClicks: MetricValue;
  followersGained: MetricValue;
  leads: MetricValue;
  shares: MetricValue;
  saves: MetricValue;
  /** Canonical ratio 0–1. */
  valueRate: MetricValue;
}

export interface VideoScoreCard {
  hook: number;
  script: number;
  editing: number;
  cta: number;
  overall: number;
}

export interface VideoAnalysis {
  id: string;
  contentId: string;
  name: string;
  platform: Platform;
  month: string;
  durationSeconds: number;
  views: number;
  reach: number;
  interactions: number;
  engagementRate: number;
  avgWatchTimeSeconds: number;
  avgPercentWatched: number;
  completionRate: number;
  retentionCurve: number[];
  shares: number;
  saves: number;
  followersGained: number;
  scores: VideoScoreCard;
  hookType: HookType;
  diagnosis: RetentionDiagnosis;
}

export type RetentionProblem = "Hook Problem" | "Script / Pacing Problem" | "CTA Problem" | "None Detected";
export interface RetentionDiagnosis { problem: RetentionProblem; explanation: string; }

export type CreativeQuadrant =
  | "Strong Creative / Strong Performance"
  | "Strong Creative / Weak Performance"
  | "Weak Creative / Strong Performance"
  | "Needs Rework";

export type ReviewConfidence = "High" | "Medium" | "Low";

export interface CreativeScoreCard {
  idea:number|null;
  hook:number|null;
  script:number|null;
  design:number|null;
  editing:number|null;
  brandConsistency:number|null;
  cta:number|null;
}

export interface CreativeAnalysis {
  id:string;
  contentId:string;
  name:string;
  platform:Platform;
  month:string;
  pillar:ContentPillar;
  format:ContentFormat;
  spendType:SpendType;
  url?:string;
  scores:CreativeScoreCard;
  creativeScore:number;
  performanceScore:number;
  quadrant:CreativeQuadrant;
  observation:string;
  evidence:string;
  hypothesis:string;
  mainStrength:string;
  mainWeakness:string;
  recommendedImprovement:string;
  nextTest:string;
  reviewer:string;
  reviewDate:string;
  reviewBasis?:string;
  reviewConfidence?:ReviewConfidence;
}

export interface Insight {
  id:string;
  month:string;
  title:string;
  observation:string;
  data:string;
  interpretation:string;
  hypothesis?:string;
  recommendedAction:string;
  relatedPlatform?:Platform;
  priority?:Priority;
  status?:string;
}
export interface DetectedProblem { id:string; month:string; title:string; description:string; severity:Priority; relatedPlatform?:Platform; }
export interface ActionPlanItem {
  id:string;
  month:string;
  problem:string;
  action:string;
  owner:string;
  priority:Priority;
  expectedImpact:string;
  status:ActionStatus;
  targetKpi?:string;
  baseline?:string | number;
  target?:string | number;
  deadline?:string;
  testPeriod?:string;
  result?:string;
  finalLearning?:string;
  addedBy?:"Team" | "AI";
}
export type NoteCategory = "Creative" | "Content" | "Platform" | "Campaign" | "Management";
export interface TeamNote { id:string; month:string; category:NoteCategory; author:string; text:string; date:string; }
export interface DataQualityWarning { id:string; month:string; message:string; severity:Priority; }
export interface HealthScoreBreakdown { visibility:number; engagement:number; audienceGrowth:number; contentQuality:number; conversion:number; creativePerformance:number; }
export interface MonthlyHealthScore { month:string; breakdown:HealthScoreBreakdown; overall:number; }
export interface SocialDashboardData { meta:DashboardMeta; monthlyPerformance:MonthlyPerformance[]; platformPerformance:PlatformPerformance[]; contentPerformance:ContentItem[]; videoAnalysis:VideoAnalysis[]; creativeAnalysis:CreativeAnalysis[]; healthScores:MonthlyHealthScore[]; insights:Insight[]; problems:DetectedProblem[]; actionPlan:ActionPlanItem[]; notes:TeamNote[]; dataQuality:DataQualityWarning[]; }
