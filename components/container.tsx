import { cn } from "@/lib/utils";
import type React from "react";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
	className?: string;
	children: React.ReactNode;
}

export function Container({ className, children, ...props }: ContainerProps) {
	return (
		<div
			className={cn(
				"container max-w-5xl mx-auto px-4 py-8 bg-background rounded-lg",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
