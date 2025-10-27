import type React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string;
	children: React.ReactNode;
}

export function Container({ className, children, ...props }: ContainerProps) {
	return (
		<div
			className={cn("container max-w-7xl mx-auto px-2 md:px-4 py-8", className)}
			{...props}
		>
			{children}
		</div>
	);
}
