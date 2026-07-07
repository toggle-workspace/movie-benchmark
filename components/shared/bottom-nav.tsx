"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { sidebarGroups } from "./sidebar";

const navItems = sidebarGroups.flatMap((g) => g.items);

export function BottomNav() {
	const pathname = usePathname();

	return (
		<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t bg-card">
			{navItems.map((item) => {
				const Icon = item.icon;
				const active = pathname === item.href;

				return (
					<Link
						key={item.href}
						href={item.href}
						className={cn(
							"flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
							active ? "text-primary" : "text-muted-foreground hover:text-foreground",
						)}
					>
						<Icon className="h-5 w-5" />
						<span>{item.title}</span>
					</Link>
				);
			})}
		</nav>
	);
}
