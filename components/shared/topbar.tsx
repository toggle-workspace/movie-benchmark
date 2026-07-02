"use client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

export function Topbar() {
  return (
    <div className="flex h-16 items-center justify-between border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Search */}
      <div className="flex items-center max-w-2xl flex-1">
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search anything..."
            className="pl-10 pr-4 py-2 h-10 bg-muted/50 border-0 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all duration-200"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
      </div>
    </div>
  );
}
