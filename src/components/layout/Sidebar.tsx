import {
  Activity, LayoutGrid, FileText, Film, FlaskConical, Share2,
  BarChart3, Lightbulb, ClipboardList, Waves,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { socialDashboard } from "../../data/socialDashboard";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/performance", label: "Performance", icon: Activity },
  { to: "/content", label: "Content Intelligence", icon: FileText },
  { to: "/video", label: "Video Analysis", icon: Film },
  { to: "/creative", label: "Creative Lab", icon: FlaskConical },
  { to: "/platforms", label: "Platforms", icon: Share2 },
  { to: "/comparisons", label: "Comparisons", icon: BarChart3 },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/action-plan", label: "Action Plan", icon: ClipboardList },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-navy-900 text-warm-50 h-screen sticky top-0">
      <div className="px-6 pt-7 pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 text-mint-300">
          <Waves size={18} strokeWidth={2.5} />
          <span className="font-mono text-[11px] tracking-wide uppercase">Command Center</span>
        </div>
        <h1 className="font-display text-xl leading-tight mt-3">
          {socialDashboard.meta.clientName}
        </h1>
        <p className="text-fog-400 text-xs mt-1">{socialDashboard.meta.subtitle}</p>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-mint-500/15 text-mint-300 font-medium"
                  : "text-warm-100/70 hover:bg-white/5 hover:text-warm-50"
              }`
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-white/10 text-[11px] text-fog-400">
        <p>Last updated</p>
        <p className="text-warm-100/80 font-mono mt-0.5">{socialDashboard.meta.lastUpdated}</p>
      </div>
    </aside>
  );
}
