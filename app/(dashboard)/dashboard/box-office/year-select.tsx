"use client";
import { useRouter } from "next/navigation";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export function YearSelect({ years, current }: { years: number[]; current: number }) {
	const router = useRouter();
	return (
		<Select
			value={String(current)}
			onValueChange={(v) => router.push(`/dashboard/box-office?year=${v}`)}
		>
			<SelectTrigger className="w-28">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{years.map((y) => (
					<SelectItem key={y} value={String(y)}>
						{y}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
