"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

import { Button } from "@/components/ui/button"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { UserPlus, Mail, Lock } from "lucide-react"
import Link from "next/link"

const formSchema = z
	.object({
		name: z.string().min(2, { message: "Name must be at least 2 characters." }),
		email: z.string().email({ message: "Please enter a valid email address." }),
		password: z
			.string()
			.min(6, { message: "Password must be at least 6 characters." }),
		confirmPassword: z.string(),
	})
	.refine((d) => d.password === d.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})

type FormValues = z.infer<typeof formSchema>

export default function RegisterPage() {
	const router = useRouter()

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
	})

	async function onSubmit(values: FormValues) {
		const { error } = await authClient.signUp.email({
			email: values.email,
			password: values.password,
			name: values.name,
		})
		if (error) {
			toast.error(error.message ?? "Registration failed. Please try again.")
			return
		}
		router.push("/dashboard/benchmark")
		router.refresh()
	}

	return (
		<Card className="w-full max-w-md">
			<CardHeader className="text-center">
				<UserPlus className="mx-auto h-12 w-12 text-gray-400" />
				<CardTitle className="mt-4 text-2xl">Create an account</CardTitle>
				<CardDescription>
					Sign up to start benchmarking your movie ideas
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="Your name" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<div className="relative">
											<Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
											<Input
												placeholder="Enter your email"
												className="pl-10"
												{...field}
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Password</FormLabel>
									<FormControl>
										<div className="relative">
											<Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
											<Input
												type="password"
												placeholder="Create a password"
												className="pl-10"
												{...field}
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="confirmPassword"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Confirm Password</FormLabel>
									<FormControl>
										<div className="relative">
											<Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
											<Input
												type="password"
												placeholder="Confirm your password"
												className="pl-10"
												{...field}
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<Button
							type="submit"
							className="w-full"
							disabled={form.formState.isSubmitting}
						>
							{form.formState.isSubmitting ? "Creating account…" : "Create Account"}
						</Button>
					</form>
				</Form>
			</CardContent>
			<CardFooter>
				<div className="text-center text-sm w-full">
					Already have an account?{" "}
					<Link href="/login" className="text-blue-600 hover:text-blue-800 underline">
						Sign in
					</Link>
				</div>
			</CardFooter>
		</Card>
	)
}
