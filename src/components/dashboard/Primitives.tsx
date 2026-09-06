import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from "lucide-react";
import type { PlatformStatus, Priority } from "../../types/dashboard";
import { formatPercent } from "../../utils/format";

export function SectionHeader({ eyebrow, title, description, action }: {
  eyebrow?: string; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        {eyebrow && <p className="text-mint-600 text-[11px] font-semibold uppercase tracking-[0.15em] mb-1.5">{eyebrow}</p>}
        <h2 className="font-display text-2xl sm:text-3xl text-navy-900 leading-tight">{title}</h2>
        {description && <p className="text-fog-500 text-sm mt-1 max-w-2xl">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function TrendTag({ direction, value }: { direction: "up" | "down" | "flat"; value: number }) {
  const config = {
    up: { icon: ArrowUpRight, label: "Growing", cls: "text-mint-700 bg-mint-100" },
    down: { icon: ArrowDownRight, label: "Declining", cls: "text-signal-coral bg-signal-coral/10" },
    flat: { icon: Minus, label: "Stable", cls: "text-fog-600 bg-fog-100" },
  }[direction];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${config.cls}`}>
      <Icon size={12} />
      {direction !== "flat" ? `${formatPercent(Math.abs(value))}` : config.label}
    </span>
  );
}

export function StatusPill({ status }: { status: PlatformStatus }) {
  const cls = status === "Growing" ? "bg-mint-100 text-mint-700"
    : status === "Needs Attention" ? "bg-signal-amber/15 text-signal-amber"
    : "bg-fog-100 text-fog-600";
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>{status}</span>;
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const cls = priority === "High" ? "bg-signal-coral/12 text-signal-coral"
    : priority === "Medium" ? "bg-signal-amber/15 text-signal-amber"
    : "bg-fog-100 text-fog-500";
  return <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${cls}`}>{priority}</span>;
}

export function EmptyState({ message = "No data available for this selection." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <AlertCircle size={24} className="text-fog-300" />
      <p className="text-fog-500 text-sm">{message}</p>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-navy-900/6 shadow-card p-5 ${className}`}>{children}</div>;
}
