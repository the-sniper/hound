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

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-8 sticky top-0 z-10">
      <div />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-1 ring-border/50 transition-all hover:ring-primary/20">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px] font-bold bg-primary/5 text-primary">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-elegant border-border/50">
          <div className="flex items-center gap-3 p-3">
            <Avatar className="h-10 w-10 ring-1 ring-border/50">
              <AvatarFallback className="text-xs font-bold bg-primary/5 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-bold tracking-tight">{session?.user?.name}</p>
              <p className="text-[11px] text-muted-foreground font-medium">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
            <a href="/settings" className="flex items-center px-2 py-2">
              <User className="mr-3 h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Settings</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-2" />
          <DropdownMenuItem
            className="rounded-lg cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive px-2 py-2"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-3 h-4 w-4" />
            <span className="text-sm font-medium">Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
