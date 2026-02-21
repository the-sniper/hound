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
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar shadow-sm">
      <div className="flex h-14 items-center px-6">
        <Link href="/projects" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20">
            H
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground/90">Hound</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
              pathname === item.href
                ? "bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-4 w-4", pathname === item.href ? "text-primary" : "text-muted-foreground")} />
            {item.label}
          </Link>
        ))}

        {projectNav.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Project
            </p>
            <div className="space-y-1">
              {projectNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                    pathname === item.href
                      ? "bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", pathname === item.href ? "text-primary" : "text-muted-foreground")} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-border/50 p-4">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
            pathname === "/settings"
              ? "bg-primary/5 text-primary shadow-sm ring-1 ring-primary/10"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <Settings className={cn("h-4 w-4", pathname === "/settings" ? "text-primary" : "text-muted-foreground")} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
