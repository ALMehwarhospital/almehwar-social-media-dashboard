import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X, Waves } from "lucide-react";
import {
  Activity, LayoutGrid, FileText, Film, FlaskConical, Share2,
  BarChart3, Lightbulb, ClipboardList,
} from "lucide-react";
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden sticky top-0 z-30 bg-navy-900 text-warm-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Waves size={16} className="text-mint-300" />
          <span className="font-display text-sm">{socialDashboard.meta.clientName}</span>
        </div>
        <button onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <nav className="px-3 pb-3 space-y-1 border-t border-white/10 pt-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                  isActive ? "bg-mint-500/15 text-mint-300 font-medium" : "text-warm-100/70"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
