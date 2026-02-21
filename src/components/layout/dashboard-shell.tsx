"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface DashboardShellProps {
  children: React.ReactNode;
  projectId?: string;
}

export function DashboardShell({ children, projectId }: DashboardShellProps) {
  return (
    <div className="flex h-screen">
      <Sidebar projectId={projectId} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
