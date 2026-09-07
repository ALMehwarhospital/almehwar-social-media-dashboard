import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import type { MonthlyKpiSet } from "../../types/dashboard";
import { pctChange } from "../../utils/format";

const METRIC_LABELS: Partial<Record<keyof MonthlyKpiSet, string>> = {
  reach: "Reach",
  views: "Views",
  interactions: "Interactions",
  newFollowers: "New Followers",
  profileVisits: "Profile Visits",
  linkClicks: "Link Clicks",
  leads: "Messages / Leads",
};

const COMPARABLE_KEYS = Object.keys(METRIC_LABELS) as (keyof MonthlyKpiSet)[];

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}%`;
}

export function WhatChanged({ current, previous }: { current: MonthlyKpiSet; previous: MonthlyKpiSet }) {
  const deltas = COMPARABLE_KEYS.map((key) => ({
    key,
    label: METRIC_LABELS[key] ?? key,
    change: pctChange(current[key], previous[key]),
  }));
  const win = [...deltas].sort((a, b) => b.change - a.change)[0];
  const drop = [...deltas].sort((a, b) => a.change - b.change)[0];
  const visitsChange = pctChange(current.profileVisits, previous.profileVisits);
  const followersChange = pctChange(current.newFollowers, previous.newFollowers);
  const leadsChange = pctChange(current.leads, previous.leads);

  const profileOpportunity = visitsChange > 5 && followersChange < 0;
  const conversionOpportunity = current.profileVisits > 0 && current.linkClicks / current.profileVisits < 0.08;
  const opportunityTitle = profileOpportunity
    ? "Profile interest is not converting to follows"
    : conversionOpportunity
      ? "Profile traffic is not converting to clicks"
      : leadsChange < 0 && win.change > 0
        ? "Top-of-funnel growth is not reaching leads"
        : `${win.label} has the strongest momentum`;
  const opportunityBody = profileOpportunity
    ? "Profile visits are rising while new followers are falling. Review bio, pinned content and follow reasons."
    : conversionOpportunity
      ? "Visits are reaching the profile, but too few continue to the next measurable action."
      : leadsChange < 0 && win.change > 0
        ? "Attention improved somewhere upstream, but messages / leads moved in the opposite direction."
        : "Use the strongest-moving metric as a clue, then validate it at content and platform level before scaling.";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="rounded-2xl p-5 bg-mint-100 border border-mint-300/50">
        <div className="flex items-center gap-2 text-mint-700 mb-3"><TrendingUp size={16}/><p className="text-xs font-semibold uppercase tracking-wide">Strongest Move</p></div>
        <p className="font-display text-2xl text-navy-900">{win.label}</p>
        <p className={`font-display text-3xl mt-1 ${win.change >= 0 ? "text-mint-700" : "text-signal-coral"}`}>{signed(win.change)}</p>
      </div>
      <div className="rounded-2xl p-5 bg-signal-coral/10 border border-signal-coral/25">
        <div className="flex items-center gap-2 text-signal-coral mb-3"><TrendingDown size={16}/><p className="text-xs font-semibold uppercase tracking-wide">Weakest Move</p></div>
        <p className="font-display text-2xl text-navy-900">{drop.label}</p>
        <p className={`font-display text-3xl mt-1 ${drop.change < 0 ? "text-signal-coral" : "text-mint-700"}`}>{signed(drop.change)}</p>
      </div>
      <div className="rounded-2xl p-5 bg-navy-900 text-warm-50">
        <div className="flex items-center gap-2 text-signal-amber mb-3"><Sparkles size={16}/><p className="text-xs font-semibold uppercase tracking-wide">Biggest Opportunity</p></div>
        <p className="font-display text-lg leading-snug">{opportunityTitle}</p>
        <p className="text-warm-100/70 text-sm mt-2">{opportunityBody}</p>
      </div>
    </div>
  );
}
