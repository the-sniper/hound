"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.45_0.15_250/0.05),transparent_50%)] pointer-events-none" />
        <Topbar />
        <main className="flex-1 overflow-y-auto p-8 relative z-0 bg-gradient-to-br from-background/50 via-background to-background/50">
          {children}
        </main>
      </div>
    </div>
  );
}
