import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { FilterBar } from "./FilterBar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-warm-100">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <MobileNav />
        <FilterBar />
        <main className="px-4 sm:px-8 py-6 sm:py-8 max-w-[1400px]">{children}</main>
      </div>
    </div>
  );
}
