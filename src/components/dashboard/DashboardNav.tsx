"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Zap, Settings, LogOut, LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardNav() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <span className="text-lg font-bold tracking-tight text-foreground">Zoned</span>
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-1.5 text-sm font-medium text-foreground"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/session"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            <Zap className="h-3.5 w-3.5" />
            New Session
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
