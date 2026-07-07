"use client";
import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";
import { BottomNav } from "@/components/shared/bottom-nav";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="relative flex h-screen overflow-hidden bg-background">
			<Sidebar />

			<div className="flex-1 overflow-auto">
				<Topbar />
				<main className="p-8 max-w-6xl mx-auto pb-24 md:pb-8">
					<div className="min-h-[calc(100vh-8rem)]">{children}</div>
				</main>
			</div>

			<BottomNav />
		</div>
	);
}
