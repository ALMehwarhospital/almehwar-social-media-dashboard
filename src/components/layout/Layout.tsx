import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Download } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { FilterBar } from "./FilterBar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/summary": "Executive Summary",
  "/performance": "Performance",
  "/content": "Content Intelligence",
  "/video": "Video Analysis",
  "/creative": "Creative Lab",
  "/platforms": "Platforms",
  "/website": "Website Intelligence",
  "/comparisons": "Comparisons",
  "/competitors": "Competitor Intelligence",
  "/recommendations": "Recommendations",
  "/action-plan": "Action Plan",
};

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const hideGlobalFilters = location.pathname.startsWith("/website") || location.pathname.startsWith("/competitors");

  const downloadPdf = () => {
    const previousTitle = document.title;
    const pageTitle = PAGE_TITLES[location.pathname] ?? "Dashboard";
    const date = new Date().toISOString().slice(0, 10);

    document.title = `AlMehwar - ${pageTitle} - ${date}`;
    window.addEventListener("afterprint", () => {
      document.title = previousTitle;
    }, { once: true });
    window.print();
  };

  return (
    <div className="dashboard-shell flex min-h-screen bg-warm-100">
      <div className="dashboard-print-hidden">
        <Sidebar />
      </div>
      <div className="dashboard-content flex-1 min-w-0">
        <div className="dashboard-print-hidden">
          <MobileNav />
          {!hideGlobalFilters && <FilterBar />}
        </div>
        <main className="dashboard-main px-4 sm:px-8 py-6 sm:py-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
      <button
        type="button"
        onClick={downloadPdf}
        className="dashboard-print-button fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 inline-flex items-center gap-2 rounded-full bg-navy-900 px-4 py-3 text-sm font-semibold text-warm-50 shadow-lg shadow-navy-900/20 transition hover:-translate-y-0.5 hover:bg-navy-800 hover:shadow-xl"
        aria-label="Download current page as PDF"
        title="Download current page as PDF"
      >
        <Download size={17} strokeWidth={2.2} />
        <span>Download PDF</span>
      </button>
    </div>
  );
}
