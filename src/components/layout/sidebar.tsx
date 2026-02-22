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
    <aside className="flex h-full w-72 flex-col border-r border-border/40 bg-sidebar/50 backdrop-blur-xl shadow-elegant z-20">
      <div className="flex h-20 items-center px-8">
        <Link href="/projects" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
            H
          </div>
          <span className="text-xl font-display font-bold tracking-tight text-foreground/90">
            Hound
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 group",
              pathname === item.href
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
            )}
          >
            <item.icon
              className={cn(
                "h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110",
                pathname === item.href
                  ? "text-primary-foreground"
                  : "text-muted-foreground group-hover:text-primary",
              )}
            />
            {item.label}
          </Link>
        ))}

        {projectNav.length > 0 && (
          <div className="mt-10">
            <p className="mb-4 px-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
              Project Workspace
            </p>
            <div className="space-y-1.5">
              {projectNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 group",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110",
                      pathname === item.href
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-primary",
                    )}
                  />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-border/30 p-6">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 group",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
          )}
        >
          <Settings
            className={cn(
              "h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110",
              pathname === "/settings"
                ? "text-primary-foreground"
                : "text-muted-foreground group-hover:text-primary",
            )}
          />
          Settings
        </Link>
      </div>
    </aside>
  );
}
