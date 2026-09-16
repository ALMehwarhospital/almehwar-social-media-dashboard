import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { FilterBar } from "./FilterBar";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const hideGlobalFilters = location.pathname.startsWith("/website");

  return (
    <div className="flex min-h-screen bg-warm-100">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <MobileNav />
        {!hideGlobalFilters && <FilterBar />}
        <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
