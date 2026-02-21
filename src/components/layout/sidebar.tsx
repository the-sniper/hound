"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  FolderKanban,
  FlaskConical,
  Play,
  Settings,
  LayoutDashboard,
} from "lucide-react";

interface SidebarProps {
  projectId?: string;
}

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    {
      label: "Projects",
      href: "/projects",
      icon: FolderKanban,
    },
  ];

  const projectNav = projectId
    ? [
        {
          label: "Overview",
          href: `/projects/${projectId}`,
          icon: LayoutDashboard,
        },
        {
          label: "Tests",
          href: `/projects/${projectId}/tests`,
          icon: FlaskConical,
        },
        {
          label: "Runs",
          href: `/projects/${projectId}/runs`,
          icon: Play,
        },
        {
          label: "Settings",
          href: `/projects/${projectId}/settings`,
          icon: Settings,
        },
      ]
    : [];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/projects" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            H
          </div>
          <span className="text-lg font-semibold">Hound</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}

        {projectNav.length > 0 && (
          <>
            <div className="my-3 border-t" />
            <p className="mb-2 px-3 text-xs font-medium uppercase text-muted-foreground">
              Project
            </p>
            {projectNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="border-t p-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
