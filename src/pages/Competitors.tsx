import { useMemo, useState } from "react";
import { ExternalLink, Eye, FileText, Hospital, UsersRound } from "lucide-react";
import { Card, SectionHeader } from "../components/dashboard/Primitives";
import { competitors, COMPETITOR_VERIFIED_AT, type CompetitorProfile } from "../data/competitors";
import { useDecisionLive } from "../utils/useDecisionLive";
import { formatNumber } from "../utils/format";

const CHANNELS = ["Facebook", "Instagram", "LinkedIn", "YouTube"] as const;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function Logo({ profile }: { profile: Pick<CompetitorProfile, "name" | "logoUrl" | "logoFallback"> }) {
  const [failed, setFailed] = useState(false);
  return <div className="w-16 h-16 rounded-2xl border border-navy-900/8 bg-white flex items-center justify-center overflow-hidden shrink-0">
    {!failed ? <img src={profile.logoUrl} alt={`${profile.name} logo`} className="w-full h-full object-contain p-2" onError={() => setFailed(true)} /> : <span className="font-display text-sm text-navy-800 text-center px-1">{profile.logoFallback}</span>}
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="rounded-xl bg-warm-100 px-3 py-2.5 min-w-0"><p className="text-[9px] uppercase tracking-wide text-fog-400 truncate">{label}</p><p className="font-display text-lg text-navy-900 mt-0.5">{value}</p>{note && <p className="text-[9px] text-fog-400 mt-0.5 truncate">{note}</p>}</div>;
}

function CompetitorCard({ profile }: { profile: CompetitorProfile }) {
  return <Card className="flex flex-col h-full">
    <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><Logo profile={profile} /><div className="min-w-0"><h3 className="font-display text-xl text-navy-900 leading-tight">{profile.shortName}</h3><p className="text-xs text-fog-500 mt-1 line-clamp-2">{profile.footprint}</p></div></div><a href={profile.website} target="_blank" rel="noreferrer" aria-label={`Open ${profile.name} website`} className="text-fog-400 hover:text-signal-blue p-1"><ExternalLink size={16} /></a></div>
    <div className="grid grid-cols-2 gap-2 mt-5">{profile.channels.map(channel => <Metric key={channel.label} label={channel.label} value={channel.audience} note={channel.note} />)}</div>
    <div className="flex flex-wrap gap-1.5 mt-4">{profile.focus.map(item => <span key={item} className="rounded-full bg-hospital-mist/70 px-2.5 py-1 text-[10px] font-medium text-signal-blue">{item}</span>)}</div>
    <p className="text-xs leading-relaxed text-navy-700 mt-4 pt-4 border-t border-navy-900/6">{profile.position}</p>
  </Card>;
}

export default function Competitors() {
  const live = useDecisionLive();
  const alMehwar = useMemo(() => {
    const month = live.data?.currentMonth;
    const rows = (live.data?.data.overview ?? []).filter((row: any) => row.month === month);
    const audience = (platform: string) => {
      const row = rows.find((item: any) => item.platform === platform);
      return finite(row?.followersEnd) ? row.followersEnd : finite(row?.followersStart) ? row.followersStart : null;
    };
    return {
      month,
      facebook: audience("Facebook"), instagram: audience("Instagram"), linkedin: audience("LinkedIn"), youtube: audience("YouTube"),
      published: rows.reduce((sum: number, row: any) => sum + (finite(row.posts) ? row.posts : 0) + (finite(row.videos) ? row.videos : 0), 0),
    };
  }, [live.data]);

  return <div className="space-y-8">
    <SectionHeader eyebrow="Market View" title="Competitor Intelligence" description="A concise public-data snapshot. Audience figures are directional and are never mixed with private reach, leads or revenue." action={<div className="hidden sm:block text-right"><span className="inline-flex rounded-full bg-mint-100 text-mint-700 text-[10px] font-semibold px-2.5 py-1">PUBLIC DATA</span><p className="text-[10px] text-fog-400 mt-1">Verified {COMPETITOR_VERIFIED_AT}</p></div>} />

    <Card className="relative overflow-hidden border-mint-500/20"><div className="absolute inset-y-0 left-0 w-1.5 bg-mint-500"/><div className="flex flex-col xl:flex-row xl:items-center gap-6 pl-2">
      <div className="flex items-center gap-4 xl:w-[31%]"><Logo profile={{ name: "AlMehwar Hospital", logoUrl: "https://dashboard.macro.care/assets/e1be8377-fa44-40e4-8296-7b67162bdb7a?format=webp&quality=100", logoFallback: "AMH" }}/><div><p className="text-[10px] uppercase tracking-[0.14em] text-mint-600 font-semibold">Our position</p><h3 className="font-display text-2xl text-navy-900">AlMehwar Hospital</h3><p className="text-xs text-fog-500 mt-1">Live dashboard audience · {alMehwar.month ?? "Current month"}</p></div></div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1"><Metric label="Facebook" value={formatNumber(alMehwar.facebook)}/><Metric label="Instagram" value={formatNumber(alMehwar.instagram)}/><Metric label="LinkedIn" value={formatNumber(alMehwar.linkedin)} note="Manual baseline"/><Metric label="YouTube" value={formatNumber(alMehwar.youtube)}/><Metric label="Published" value={formatNumber(alMehwar.published)} note="Selected live month"/></div>
      <div className="xl:w-[29%] rounded-xl bg-navy-900 text-warm-50 p-4"><p className="text-[10px] uppercase tracking-wide text-mint-300">Competitive position</p><p className="text-sm mt-1.5 leading-relaxed">Strong Facebook visibility and richer internal performance data. The main gap is audience scale and brand ecosystem depth.</p></div>
    </div></Card>

    <section><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{competitors.map(profile => <CompetitorCard key={profile.id} profile={profile}/>)}</div></section>

    <section><SectionHeader eyebrow="Quick comparison" title="Public Audience by Channel" description="A dash means no reliable public number was verified. Approximate indexed snapshots are marked with ≈."/><Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-navy-900 text-warm-50"><tr><th className="text-left px-5 py-3 font-medium">Brand</th>{CHANNELS.map(channel => <th key={channel} className="text-right px-4 py-3 font-medium">{channel}</th>)}</tr></thead><tbody className="divide-y divide-navy-900/6">
      <tr className="bg-mint-100/60"><td className="px-5 py-3 font-semibold text-navy-900">AlMehwar</td><td className="px-4 py-3 text-right">{formatNumber(alMehwar.facebook)}</td><td className="px-4 py-3 text-right">{formatNumber(alMehwar.instagram)}</td><td className="px-4 py-3 text-right">{formatNumber(alMehwar.linkedin)}</td><td className="px-4 py-3 text-right">{formatNumber(alMehwar.youtube)}</td></tr>
      {competitors.map(profile => <tr key={profile.id} className="hover:bg-warm-100/70"><td className="px-5 py-3 font-medium text-navy-900">{profile.shortName}</td>{CHANNELS.map(channel => <td key={channel} className="px-4 py-3 text-right text-navy-700">{profile.channels.find(item => item.label === channel)?.audience ?? "—"}</td>)}</tr>)}
    </tbody></table></div></Card></section>

    <section className="grid grid-cols-1 md:grid-cols-3 gap-3"><Card className="flex items-start gap-3"><UsersRound size={18} className="text-mint-600 mt-0.5"/><div><p className="font-semibold text-sm">Audience</p><p className="text-xs text-fog-500 mt-1">Track monthly growth by channel, not one combined follower total.</p></div></Card><Card className="flex items-start gap-3"><FileText size={18} className="text-signal-blue mt-0.5"/><div><p className="font-semibold text-sm">Content</p><p className="text-xs text-fog-500 mt-1">Compare formats, specialties, posting pace and public engagement.</p></div></Card><Card className="flex items-start gap-3"><Eye size={18} className="text-signal-amber mt-0.5"/><div><p className="font-semibold text-sm">Campaign watch</p><p className="text-xs text-fog-500 mt-1">Monitor visible campaigns and creatives without claiming private results.</p></div></Card></section>
    <div className="flex items-center gap-2 text-[10px] text-fog-400"><Hospital size={13}/>Competitor figures are public profile snapshots; AlMehwar figures come from the connected dashboard source.</div>
  </div>;
}
