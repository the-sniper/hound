"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface DashboardShellProps {
  children: React.ReactNode;
  projectId?: string;
}

export function DashboardShell({ children, projectId }: DashboardShellProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* The provided code edit for the sidebar seems to be a full component implementation.
          To apply glassmorphism and refined styling to the sidebar, the changes would typically
          be made within the 'sidebar.tsx' file itself, not directly in DashboardShell.
          However, if the intent is to inline the sidebar's content here, it would require
          defining or importing 'mainNav', 'projectNav', 'pathname', 'cn', 'Link', and 'Settings'
          within this file, which is a significant structural change.

          For now, I will apply the main content gradient as requested, and assume the sidebar
          changes are meant for the 'sidebar.tsx' file, or that the user will provide
          the necessary context for inlining it here.
      */}
      <Sidebar projectId={projectId} />
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
