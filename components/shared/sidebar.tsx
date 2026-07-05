"use client";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clapperboard, History, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

const sidebarGroups = [
  {
    title: "Movie Benchmark",
    items: [
      {
        title: "Benchmark",
        href: "/dashboard/benchmark",
        icon: Clapperboard,
        badge: null,
      },
      {
        title: "History",
        href: "/dashboard/history",
        icon: History,
        badge: null,
      },
      {
        title: "Box Office",
        href: "/dashboard/box-office",
        icon: Trophy,
        badge: null,
      },
    ],
  },
];

interface SidebarProps {
  onMobileClose?: () => void;
}

export function Sidebar({ onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLinkClick = () => {
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r bg-card shadow-sm transition-all duration-300",
        isCollapsed ? "w-16" : "w-72",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b",
          isCollapsed ? "justify-center px-0" : "justify-between px-6",
        )}
      >
        {!isCollapsed && (
          <Link
            href="/dashboard/benchmark"
            className="flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Clapperboard className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold group-hover:text-primary transition-colors">
              MovieBench
            </span>
          </Link>
        )}
        {isCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            onClick={() => setIsCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className={cn("flex-1 space-y-8", isCollapsed ? "p-2" : "p-6")}>
        {sidebarGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            {/* Group Title */}
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-4">
                {group.title}
              </h3>
            )}

            {/* Group Items */}
            <div className="space-y-2">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-muted text-muted-foreground hover:text-foreground",
                      isCollapsed && "justify-center px-3 py-4",
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <Icon
                      className={cn(
                        "transition-all duration-200",
                        isCollapsed ? "h-5 w-5" : "h-4 w-4",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="group-hover:translate-x-0.5 transition-transform duration-200">
                        {item.title}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
