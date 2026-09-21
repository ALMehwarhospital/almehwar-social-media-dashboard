import type { Insight } from '../types/dashboard';

/**
 * Real findings and recommendations synced from the Google Sheet.
 * Recorded in September 2026 from the reviewed June–August analysis cycle.
 */
export const insights: Insight[] = [
  {
    "id": "recommendation-1",
    "month": "2026-09",
    "title": "Doctor-led / Mehwargy Reels",
    "observation": "Long doctor-led Reels are the clearest structural underperformer.",
    "data": "Doctors Content: n=5, avg Creative Score 69, avg Performance Score 29. Thyroid Reel: 61/12 at 295.83s; Child Nutrition: 54/14 at 298.41s; Breast Cancer: 63/29 at 404.34s.",
    "interpretation": "The medical topics are useful, but the feed format asks for too much viewing time before delivering individual answers.",
    "recommendedAction": "Use long episodes as source material. Publish 30-60s question-led clips on Reels and keep full episodes for YouTube.",
    "relatedPlatform": "Instagram",
    "priority": "High",
    "status": "Open"
  },
  {
    "id": "recommendation-2",
    "month": "2026-09",
    "title": "Events / On-ground Content",
    "observation": "Short, real-world event Reels are the most consistent performance pattern.",
    "data": "Events: n=10, avg Performance Score 62. El Alamein 75, Marathon 73, Family Day 70, Pavilion Park 70; most are about 22-39s.",
    "interpretation": "Movement, people, location and visible real-world participation create stronger feed-native proof than institutional messaging.",
    "recommendedAction": "Prioritize 20-40s event Reels with people/action in the first 2s and the hospital role visible immediately.",
    "relatedPlatform": "Instagram",
    "priority": "High",
    "status": "Open"
  },
  {
    "id": "recommendation-3",
    "month": "2026-09",
    "title": "Clinical Service Hooks",
    "observation": "Problem/question-led clinical framing is stronger than generic capability statements.",
    "data": "Examples: Prostate symptoms Creative/Performance 86/77; Root-canal retreatment 84/69; Dental emergencies 84/51. Generic expert statement 'الخبرة تصنع الفارق' scored 75/21.",
    "interpretation": "Specific patient questions create a clearer reason to stop and continue than broad expertise claims.",
    "recommendedAction": "Open clinical Reels with one patient question/problem and give the direct answer before credentials.",
    "relatedPlatform": "Instagram",
    "priority": "High",
    "status": "Open"
  },
  {
    "id": "recommendation-4",
    "month": "2026-09",
    "title": "Branding Reels",
    "observation": "Branding-only Reels have lower performance than event/patient-value content.",
    "data": "Branding: n=3, avg Creative Score 60, avg Performance Score 42. Generic review-thank-you Reel: 49/19; Mawlid greeting: 60/46.",
    "interpretation": "Strong identity does not replace audience value. Pure institutional messages give viewers less reason to interact.",
    "recommendedAction": "Turn branding into human proof: employee/patient/community story, concrete achievement, or real moment.",
    "relatedPlatform": "Instagram",
    "priority": "Medium",
    "status": "Open"
  },
  {
    "id": "recommendation-5",
    "month": "2026-09",
    "title": "Scientific Event Promotion",
    "observation": "Speaker/problem-led scientific promotion outperforms poster-heavy packaging.",
    "data": "Solving Antimicrobial Riddles speaker invite: Creative/Performance 80/80. Poster-style event promo: 74/46.",
    "interpretation": "Scientific credibility works best when delivered through a person and a reason to attend, not as a dense information card.",
    "recommendedAction": "Use expert-led 20-30s invitation clips; reveal date/time/registration after the value proposition.",
    "relatedPlatform": "Instagram",
    "priority": "High",
    "status": "Open"
  },
  {
    "id": "recommendation-6",
    "month": "2026-09",
    "title": "Creative vs Performance Gap",
    "observation": "Half of reviewed Reels have strong creative but weak relative performance.",
    "data": "17 of 34 Reels fall into Strong Creative / Weak Performance. Only 6 of 34 are Strong Creative / Strong Performance.",
    "interpretation": "Creative execution is often acceptable; topic fit, length, distribution or the first-message choice are frequently the limiting factors.",
    "recommendedAction": "For Creative Score >=70 and Performance Score <70, diagnose topic/length/distribution before redesigning the visual identity.",
    "relatedPlatform": "Instagram",
    "priority": "High",
    "status": "Open"
  }
] as Insight[];
