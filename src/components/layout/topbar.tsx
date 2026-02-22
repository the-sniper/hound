"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User } from "lucide-react";

export function Topbar() {
  const { data: session } = useSession();

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "U";

  return (
    <header className="flex h-20 items-center justify-between border-b border-border/30 bg-background/60 backdrop-blur-xl px-10 sticky top-0 z-30">
      <div />
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-11 w-11 rounded-full ring-1 ring-border/50 transition-all hover:ring-primary/40 hover:bg-primary/5 p-0"
            >
              <Avatar className="h-9 w-9 border border-border/50">
                <AvatarFallback className="text-[11px] font-bold bg-primary/5 text-primary tracking-tighter">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-72 p-3 rounded-2xl shadow-xl border-border/40 backdrop-blur-2xl bg-popover/90 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-4 p-4">
              <Avatar className="h-12 w-12 ring-2 ring-primary/10">
                <AvatarFallback className="text-sm font-bold bg-primary/5 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-0.5">
                <p className="text-base font-bold tracking-tight">
                  {session?.user?.name}
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  {session?.user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator className="my-3 bg-border/40" />
            <DropdownMenuItem
              asChild
              className="rounded-xl cursor-pointer py-3 transition-colors hover:bg-primary/5 group"
            >
              <a href="/settings" className="flex items-center px-2">
                <User className="mr-3 h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-semibold">
                  Workspace Settings
                </span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-3 bg-border/40" />
            <DropdownMenuItem
              className="rounded-xl cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-3 px-2 group"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-3 h-4.5 w-4.5 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm font-semibold">Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
